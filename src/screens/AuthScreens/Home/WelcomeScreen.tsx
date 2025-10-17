import { useEffect, useRef, useState } from 'react';
import {
    Text,
    TextInput,
    TouchableOpacity,
    Image,
    SafeAreaView,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar
} from 'react-native';
import { InteractionManager } from 'react-native';
import { validateAccess, BASE_URl } from '../../../api/users';
import { heightPercentageToDP as responsiveHeight } from 'react-native-responsive-screen';
import { useNavigation } from '@react-navigation/native';
import GradientModal from '../components/GradientModal';
import { styles } from "../styles/styles";
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function WelcomeScreen() {
    const navigation = useNavigation<any>();
    const [keyboardVisible, setKeyboardVisible] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const [email, setEmail] = useState<string>('');
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const [modalMessage, setModalMessage] = useState<string>('');
    const [storedUser, setStoredUser] = useState<any | null>(null);
    const didNavigateRef = useRef(false);
    const checkedRecoveryRef = useRef(false);

    useEffect(() => {
        const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    // Load any stored user for personalized greeting
    useEffect(() => {
        (async () => {
            try {
                const raw = await AsyncStorage.getItem('user');
                if (raw) setStoredUser(JSON.parse(raw));
            } catch {}
        })();
    }, []);

    // Redirect if already authenticated or fully registered
    useEffect(() => {
        (async () => {
            try {
                const token = await AsyncStorage.getItem('token');
                if (token) {
                    // User is authenticated -> go straight to main app
                    if (!didNavigateRef.current) {
                        didNavigateRef.current = true;
                        InteractionManager.runAfterInteractions(() => {
                            navigation.reset({ index: 0, routes: [{ name: 'Login', params: { noPrecheck: true } }] });
                        });
                    }
                    return;
                }
                // If we have a stored user with completed registration, branch on approval
                try {
                    const raw = await AsyncStorage.getItem('user');
                    if (raw) {
                        const u = JSON.parse(raw || '{}');
                        const registrationCompleted = u?.registrationCompleted === true;
                        const approved = u?.approved === true;
                        const userId = u?._id;
                        if (registrationCompleted) {
                            if (!approved) {
                                if (!didNavigateRef.current) {
                                    didNavigateRef.current = true;
                                    InteractionManager.runAfterInteractions(() => {
                                        navigation.reset({ index: 0, routes: [{ name: 'AwaitingApproval' as any, params: { userId } }] });
                                    });
                                }
                                return;
                            } else {
                                if (!didNavigateRef.current) {
                                    didNavigateRef.current = true;
                                    InteractionManager.runAfterInteractions(() => {
                                        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
                                    });
                                }
                                return;
                            }
                        }
                    }
                } catch {}
                // Recovery: if user previously started registration and app was closed, send them back to OTP flow automatically
                if (!didNavigateRef.current && !checkedRecoveryRef.current) {
                    try {
                        const email = await AsyncStorage.getItem('pendingEmail');
                        const userId = await AsyncStorage.getItem('pendingUserId');
                        if (email) {
                            // Check server for completion flags
                            const cleaned = email.trim().toLowerCase().replace(/\s+/g,'').replace(/[\.,;:]+$/,'');
                            const controller = new AbortController();
                            const t = setTimeout(() => controller.abort(), 8000);
                            const resp = await (await import('axios')).default.post(`${BASE_URl}/api/users/lookup-email`, { email: cleaned }, { signal: controller.signal });
                            clearTimeout(t);
                            if (resp.data?.ok && resp.data.exists) {
                                const { registrationCompleted, hasPassword, approved } = resp.data;
                                if (!registrationCompleted || !hasPassword) {
                                    didNavigateRef.current = true;
                                    checkedRecoveryRef.current = true;
                                    navigation.reset({ index: 0, routes: [{ name: 'MailOtp' as any, params: { email: cleaned, userId: resp.data.userId || userId || undefined } }] });
                                    return;
                                }
                                if (registrationCompleted && !approved) {
                                    didNavigateRef.current = true;
                                    checkedRecoveryRef.current = true;
                                    navigation.reset({ index: 0, routes: [{ name: 'AwaitingApproval' as any, params: { userId: resp.data.userId || userId || undefined } }] });
                                    return;
                                }
                            } else {
                                // Unknown email state; route to email access to restart
                                didNavigateRef.current = true;
                                checkedRecoveryRef.current = true;
                                navigation.reset({ index: 0, routes: [{ name: 'Registration' as any }] });
                                return;
                            }
                        }
                    } catch {}
                }
                // Important: do NOT redirect based solely on pendingUserId to avoid bounce
                // If a user is mid-flow without email context, let them enter email here.
            } catch { }
        })();
    }, [navigation]);
    const continueButtonPress = async () => {
        if (!email.trim()) {
            setModalMessage('Please enter a valid email address.');
            setModalVisible(true);
            return;
        }
        setLoading(true);
        let timedOut = false;
        const safetyTimer = setTimeout(() => {
            // UI fallback if something hung before our finally (rare)
            timedOut = true;
            setLoading(false);
            setModalMessage('Taking longer than expected. Please try again.');
            setModalVisible(true);
        }, 17000);
        try {
            const cleaned = email.trim().toLowerCase().replace(/[\s]+/g, '').replace(/[\.,;:]+$/, '');
            try { await AsyncStorage.setItem('pendingEmail', cleaned); } catch {}
            const response = await validateAccess({ email: cleaned });

            // Handle explicit status codes from backend
            if (response?.data?.ok && response.data.status === 'verified') {
                const { userId, approved, registrationCompleted, role } = response.data as any;
                if (userId) { try { await AsyncStorage.setItem('pendingUserId', String(userId)); } catch { } }
                // Registered accounts: go to awaiting approval or login
                if (registrationCompleted && !approved) {
                    if (!didNavigateRef.current) { didNavigateRef.current = true; }
                    InteractionManager.runAfterInteractions(() => {
                        navigation.reset({ index: 0, routes: [{ name: 'AwaitingApproval' as any, params: { userId } }] });
                    });
                } else {
                    if (!didNavigateRef.current) { didNavigateRef.current = true; }
                    InteractionManager.runAfterInteractions(() => {
                        navigation.reset({ index: 0, routes: [{ name: 'Login', params: { noPrecheck: true } }] });
                    });
                }
                return;
            }

            if (response?.data.ok && response.data.user) {
                const u = response.data.user;
                const userId = response.data.userId || u?._id;
                const role = response.data.role || u?.activeRole;
                const isVerified = u?.isVerified === true;
                const registrationCompleted = u?.registrationCompleted === true;
                const approved = u?.approved === true;
                 await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
                setStoredUser(response.data.user);
                if (isVerified) {
                    if (userId) { try { await AsyncStorage.setItem('pendingUserId', userId); } catch { } }
                    if (registrationCompleted && !approved) {
                        InteractionManager.runAfterInteractions(() => {
                            navigation.reset({ index: 0, routes: [{ name: 'AwaitingApproval' as any, params: { userId } }] });
                        });
                    } else {
                        if (!didNavigateRef.current) { didNavigateRef.current = true; }
                        InteractionManager.runAfterInteractions(() => {
                            navigation.reset({ index: 0, routes: [{ name: 'Login'  as any, params: { noPrecheck: true } }] });
                        });
                    }
                } else if (role === 'SuperAdmin') {
                    navigation.navigate('MailOtp', { email: cleaned, flow: 'superadmin', userId, prefills: u });
                } else {
                    // Regular unverified -> treat as regular flow for now
                    navigation.navigate('MailOtp', { email: cleaned, flow: 'regular', userId, prefills: u });
                }
            } else if (response?.data.ok && (response.data.status === 'sent' || response.data.status === 'sentDev')) {
                // OTP sent for unverified or new users
                const role = (response.data as any).role;
                const userId = (response.data as any).userId;
                const flow = role === 'SuperAdmin' ? 'superadmin' : 'regular';
                navigation.navigate('MailOtp', { email: cleaned, flow, userId });
            } else if (response?.data.ok && !response.data.user) {
                // Fallback/new user -> start OTP (regular flow)
                navigation.navigate('MailOtp', { email: cleaned, flow: 'regular' });
            } else {
                setModalMessage(response?.data.message ?? 'Access denied.');
                setModalVisible(true);
            }
        } catch (error: any) {
            if (!timedOut) {
                const backendMessage = error?.response?.data?.message || error?.message;
                setModalMessage(backendMessage || 'Unexpected error occurred.');
                setModalVisible(true);
            }
        } finally {
            clearTimeout(safetyTimer);
            if (!timedOut) setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <GradientModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                message={modalMessage}
            />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
                    keyboardShouldPersistTaps="handled"
                >
                    <Image
                        source={require('../../../assets/images-removebg-preview.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <Text style={styles.title}>
                        {storedUser?.firstName || storedUser?.title
                            ? `Welcome back, ${storedUser?.title ? storedUser.title + ' ' : ''}${storedUser?.firstName || ''}!`
                            : 'Welcome!'}
                    </Text>
                    <Text style={styles.subtitle}>
                        Please enter your Email Address to continue.
                    </Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter Email Adress"
                        textContentType="emailAddress"
                        keyboardType="email-address"
                        placeholderTextColor="#999"
                        onChangeText={setEmail}
                        value={email}
                    />
                    <TouchableOpacity
                        style={[styles.button, {
                            marginTop: keyboardVisible ? responsiveHeight(20) : responsiveHeight(2),
                        }]}
                        onPress={continueButtonPress}
                        disabled={loading}
                    >
                        <Text style={styles.buttonText}>
                            {loading ? 'Loading...' : 'Continue'}
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

