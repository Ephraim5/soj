import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, StatusBar, KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LoginSupportScreen from './LoginSupportScreen';
import * as LocalAuthentication from 'expo-local-authentication';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URl } from '../../../api/users';
import { RootStackParamList } from '../../../navigation/Navigation';
import { widthPercentageToDP } from 'react-native-responsive-screen';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'MainTabs'>;



type MinimalUser = { _id: string; firstName?: string; surname?: string; activeRole?: string; isVerified?: boolean };

const LoginScreen: React.FC = () => {
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [user, setUser] = useState<MinimalUser | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [existingToken, setExistingToken] = useState<string | null>(null);
  const [biometricEnabledSetting, setBiometricEnabledSetting] = useState<boolean>(true);
  const [keyboardVisible, setKeyboardVisible] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'login' | 'support'>('login');
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<any>();
  const noPrecheck: boolean = !!(route?.params?.noPrecheck);
  const [storedEmail, setStoredEmail] = useState<string | null>(null);
  const [autoRedirected, setAutoRedirected] = useState<boolean>(false);

  // Pull API base from same file used for other flows if available (fallback env / constant)


  useEffect(() => {
    (async () => {
      try {
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) setUser(JSON.parse(storedUser));
      } catch { }
      try {
        const pu = await AsyncStorage.getItem('pendingUserId');
        if (pu) setPendingUserId(pu);
      } catch { }
      try {
        const email = await AsyncStorage.getItem('pendingEmail');
        if (email) setStoredEmail(email);
      } catch { }
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setBiometricAvailable(!!hasHardware && !!enrolled);
      } catch { }
      try {
        const tk = await AsyncStorage.getItem('token');
        if (tk) setExistingToken(tk);
        const bioFlag = await AsyncStorage.getItem('biometricEnabled');
        if (bioFlag !== null) setBiometricEnabledSetting(bioFlag === 'true');
      } catch { }
    })();
  }, []);

  const evaluateIncompleteAccount = useCallback(async () => {
    if (noPrecheck) return; // Skip precheck when explicitly requested (from Welcome)
    if (autoRedirected) return;
    let fallbackTimer: any;
    try {
      let email: string | null = storedEmail;
      if (!email) {
        const storedRaw = await AsyncStorage.getItem('user');
        if (storedRaw) {
          try { const parsed = JSON.parse(storedRaw); email = parsed?.email || null; } catch { }
        }
      }
      // If we don't have a pending user, nothing to do.
      if (!pendingUserId) return;

      // If we have a pending user but no email, send them to the welcome/email access screen.
        if (!email) {
        if (!autoRedirected) {
          setAutoRedirected(true);
          navigation.reset({ index: 0, routes: [{ name: 'Registration' as any }] });
        }
        return;
      }

  // If user hits login but their registration isn't complete, we must push them back to OTP to restart.

      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 8000);
      const resp = await axios.post(`${BASE_URl}/api/users/lookup-email`, { email }, { signal: controller.signal });
      clearTimeout(t);

      if (resp.data?.ok && resp.data.exists) {
        if (!resp.data.hasPassword || !resp.data.registrationCompleted) {
          // Incomplete → force OTP flow to restart or continue registration
          if (fallbackTimer) clearTimeout(fallbackTimer);
          if (!autoRedirected) {
            setAutoRedirected(true);
            navigation.reset({ index: 0, routes: [{ name: 'MailOtp' as any, params: { email, userId: resp.data.userId || pendingUserId } }] });
          }
        } else if (resp.data.registrationCompleted && resp.data.approved === false) {
          // Completed but waiting approval
          if (fallbackTimer) clearTimeout(fallbackTimer);
          if (!autoRedirected) {
            setAutoRedirected(true);
            navigation.reset({ index: 0, routes: [{ name: 'AwaitingApproval' as any, params: { userId: resp.data.userId || pendingUserId } }] });
          }
        } else {
          if (fallbackTimer) clearTimeout(fallbackTimer);
        }
      } else if (resp.data?.ok && resp.data.exists === false) {
        if (fallbackTimer) clearTimeout(fallbackTimer);
        if (!autoRedirected) {
          setAutoRedirected(true);
          navigation.reset({ index: 0, routes: [{ name: 'Registration' as any }] });
        }
      }
    } catch (e:any) {
      const msg = e?.message || e?.toString?.() || '';
      const code = e?.code || e?.name || '';
      if (code === 'ERR_CANCELED' || /aborted|canceled/i.test(msg)) {
        // ignore expected abort noise
      } else {
        console.warn('[Login evaluateIncompleteAccount] error', msg);
      }
      // Allow fallback to handle redirection if set
    } finally {
      if (fallbackTimer) clearTimeout(fallbackTimer);
    }
  }, [pendingUserId, storedEmail, navigation, autoRedirected, noPrecheck]);

  useEffect(() => {
    evaluateIncompleteAccount();
  }, [evaluateIncompleteAccount]);

  useEffect(() => {
    const unsubscribe = (navigation as any).addListener('focus', () => {
      evaluateIncompleteAccount();
    });
    return unsubscribe;
  }, [navigation, evaluateIncompleteAccount]);

  // Hide bottom tab when keyboard is visible
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent as any, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent as any, () => setKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const persistAuth = useCallback(async (token: string, backendUser: MinimalUser) => {
    try {
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(backendUser));
    } catch { }
  }, [loading]);


  const handlePasswordLogin = useCallback(async () => {
    if (!pendingUserId) {
      Toast.show({ type: 'error', text1: 'Missing User', text2: 'No pending user ID found. Please restart the flow.' });
      return;
    }
    if (!password) {
      Toast.show({ type: 'error', text1: 'Password Required', text2: 'Enter your password to continue.' });
      return;
    }
    setLoading(true);
    try {
  const res = await axios.post(`${BASE_URl}/api/auth/login`, { userId: pendingUserId, password });
      if (!res.data?.ok) throw new Error(res.data?.message || 'Login failed');
      const { token, user: backendUser } = res.data;
      console.log('[LOGIN] success role:', backendUser.activeRole, 'all roles:', backendUser.roles, 'approved:', backendUser.approved);
      await persistAuth(token, backendUser);
      // Placeholder routing logic for role-specific dashboards
      if (backendUser.activeRole === 'SuperAdmin') {
        navigation.navigate('MainTabs');
      } else if (backendUser.activeRole === 'UnitLeader') {
        console.log('[LOGIN] UnitLeader flow placeholder - navigate to leader dashboard when implemented');
        navigation.navigate('MainTabs');
      } else if (backendUser.activeRole === 'Member') {
        console.log('[LOGIN] Member flow placeholder - navigate to member home when implemented');
        navigation.navigate('MainTabs');
      } else {
        console.log('[LOGIN] Unknown role fallback');
        navigation.navigate('MainTabs');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Network error';
      Toast.show({ type: 'error', text1: 'Login Failed', text2: msg });
    } finally {
      setLoading(false);
    }
  }, [pendingUserId, password, navigation, persistAuth]);

  const handleBiometric = useCallback(async () => {
    // Only attempt biometric when user explicitly taps the biometric button.
    if (!biometricAvailable) {
      Toast.show({ type: 'info', text1: 'Biometric Unavailable', text2: 'Not set up on this device. Use your password.' });
      return;
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Login with Biometrics',
      fallbackLabel: 'Use Password',
      cancelLabel: 'Cancel'
    });
    if (result.success) {
      const tk = await AsyncStorage.getItem('token')
      // Fast path: if we already have a valid token in storage, skip password entirely.
      if (existingToken || tk) {
        // Navigate straight to the main app. Use reset so user can't go back to login.
        setTimeout(() => {
          navigation.reset({ index: 0, routes: [{ name: 'MainTabs' as any }] });
        }, 500);
        return;
      }else{
        Toast.show({ type: 'info', text1: 'Biometric Login', text2: 'Access Denied try using password , use FingerPrint later.' });
      }

      // If no token yet, we still need password once to obtain one from backend.
      // show Toast then after a short delay navigate to MainTabs
      // Toast.show({ type: 'success', text1: 'Authenticated', text2: 'Logged in with biometrics.' });

    }
  }, [biometricAvailable, handlePasswordLogin]);

  return (
    <KeyboardAvoidingView
      style={{ flexGrow: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 40}
    >

  <View style={styles.container}>
  <StatusBar barStyle="dark-content" />

        <View style={{...styles.topBar, ...(activeTab === 'support' ? {display: 'none'} : { marginBottom: 30,marginTop: 10 }) }}>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={styles.notificationIcon} onPress={() => Toast.show({ type: 'info', text1: 'Notifications', text2: 'Login First ,Then see notification any issue check support.' })}>
            <Ionicons name="notifications-outline" size={28} color="#349DC5" />
          </TouchableOpacity>
        </View>

        {/* Logo */}
        <Image
          source={require('../../../assets/images-removebg-preview.png')}
          style={{ ...(activeTab !== 'support' ? { marginBottom: 10,width:styles.logo.width,height:styles.logo.height } : { display: 'none' }) }}
        />

        {activeTab === 'login' ? (
          <>
            {/* Welcome Message */}
            <Text style={styles.welcome}>
              {user ? `Welcome back, ${user?.surname || ''} ${user?.firstName || ''}!` : 'Welcome back!'}
            </Text>
            {/* Password Field */}
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Enter password"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(prev => !prev)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#555555ff"
                />
              </TouchableOpacity>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity style={styles.forgetContainer}>
              <Text style={styles.forgot}>
                Forgot your password?{' '}
                <Text style={{ color: '#349DC5' }}>Click Here</Text>
              </Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity style={styles.loginBtn} onPress={handlePasswordLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>Login</Text>}
            </TouchableOpacity>

            {biometricAvailable && biometricEnabledSetting && (
              <TouchableOpacity style={[styles.loginBtn, { marginTop: 12 }]} onPress={handleBiometric} disabled={loading}>
                <View style={styles.btnRowCenter}>
                  {loading ? (
                    <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
                  ) : (
                    <Ionicons name="finger-print-outline" size={22} color="#fff" style={{ marginRight: 8 }} />
                  )}
                  <Text style={styles.loginBtnText}>{loading ? 'Please wait...' : 'Biometric'}</Text>
                  {/* placeholder to balance left icon/spinner width and keep text visually centered */}
                  <View style={{ width: 22 }} />
                </View>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <View style={{ flex: 1, alignSelf: 'stretch' }}>
            <LoginSupportScreen />
          </View>
        )}

        {/* Bottom Tab Bar (hidden when keyboard is visible) */}
        {!keyboardVisible && (
          <View style={styles.tabBar}>
            <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('login')}>
              <Ionicons name="lock-closed-outline" size={30} color="#349DC5" />
              <Text style={styles.tabText}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('support')}>
              <Ionicons name="headset-outline" size={30} color="#349DC5" />
              <Text style={styles.tabText}>Support</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>

  );
};

export default LoginScreen;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  forgetContainer: {
    right: widthPercentageToDP(15),
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  notificationIcon: {
    marginRight: 0,
    padding: 6,
  },
  logo: {
    width: 90,
    height: 90,
  },
  welcome: {
    fontSize: 17,
    fontWeight: '500',
    marginBottom: 30,
    color: "#555555ff",
    textAlign: 'center',
  },
  label: {
    alignSelf: 'flex-start',
    fontWeight: '500',
    color: "#555555ff",
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#fafcff',
    paddingHorizontal: 10,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#222',
  },
  forgot: {
    color: '#666',
    fontSize: 14,
    marginBottom: 30,
    marginTop: 5,
  },
  loginBtn: {
    width: '90%',
    height: 50,
    backgroundColor: '#349DC5',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  btnRowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%'
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: widthPercentageToDP(100),
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 2,
    borderColor: '#eee',
    height: 60,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 12,
    color: '#349DC5',
    marginTop: 2,
    fontWeight: "bold"
  },
});
