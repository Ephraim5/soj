import  { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, NavigationProp } from '@react-navigation/native';
import { StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RootStackParamList } from '../../../navigation/Navigation';
import { BASE_URl } from '../../../api/users';

const OTP_LENGTH = 6;

const styles = StyleSheet.create({
  safeArea: { flexGrow: 1, backgroundColor: '#fff',paddingBottom:10, },
  container: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 24,marginBottom:10 },
  content: { paddingTop: '25%' },
  backButton: { position: 'absolute', top: 10, left: 0, zIndex: 2 },
  lockIcon: { width: 60, height: 60, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 8, color: '#222' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginVertical: 8, fontSize: 16, backgroundColor: '#f9f9f9' },
  resendButton: { alignSelf: 'center', marginVertical: 8, paddingHorizontal: 24, paddingVertical: 8, borderRadius: 8, backgroundColor: '#e6f2fa' },
  resendText: { color: '#349DC5', fontWeight: 'bold' },
  subtitle: { fontSize: 16, textAlign: 'center', marginVertical: 8, color: '#555' },
  otpContainer: { flexDirection: 'row', justifyContent: 'center', marginVertical: 12 },
  otpInput: { width: 40, height: 48, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginHorizontal: 4, textAlign: 'center', fontSize: 20, backgroundColor: '#f9f9f9' },
  verifyButton: { backgroundColor: '#349DC5', borderRadius: 8, margin: 16, paddingVertical: 14, alignItems: 'center' },
  verifyButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  keypadWrapper: { marginBottom: 16 },
  keypadRow: { flexDirection: 'row', justifyContent: 'space-evenly', marginVertical: 4 },
  keypadButton: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#f2f2f2', alignItems: 'center', justifyContent: 'center', marginHorizontal: 4 },
  grayKey: { backgroundColor: '#e0e0e0' },
  blueKey: { backgroundColor: '#349DC5' },
  keypadText: { fontSize: 20, color: '#222' },
});

// Hoisted keypad layout to avoid recreating on each render
const KEYPAD_LAYOUT: string[][] = [
  ['1', '2', '3', '-'],
  ['4', '5', '6', 'space'],
  ['7', '8', '9', 'backspace'],
  [',', '0', '.', 'submit']
];

const OtpVerificationScreen: React.FC = () => {
  // Accept params: { email, flow, userId, prefills }
  const route = useRoute<any>();
  const params = route?.params || {};
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  // Initialize email from navigation params if provided
  const initialEmail = params?.email ? String(params.email) : '';
  const [email, setEmail] = useState<string>(initialEmail); // User's email to verify
  const [loading, setLoading] = useState(false); // sending OTP
  const [verifying, setVerifying] = useState(false); // verifying OTP
  const [info, setInfo] = useState<string>('');
  const [sent, setSent] = useState(false);
  const [lastCode, setLastCode] = useState<string | undefined>(undefined);
  const [cooldown, setCooldown] = useState<number>(0);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [devOtp, setDevOtp] = useState<string | undefined>(undefined);
  const autoSentRef = useRef(false);
  const shortCircuitedRef = useRef(false);
  const checkingRef = useRef(false);


  const startCooldown = (seconds:number) => {
    if (seconds <= 0) return;
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current as any);
    setCooldown(seconds);
    cooldownTimerRef.current = setInterval(()=>{
      setCooldown(prev => {
        if (prev <= 1) {
          if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current as any);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(()=>()=>{ if(cooldownTimerRef.current) clearInterval(cooldownTimerRef.current as any); },[]);

  // If no email provided via params, try to restore from storage
  useEffect(() => {
    if (!email) {
      (async () => {
        const stored = await AsyncStorage.getItem('pendingEmail');
        if (stored) setEmail(stored);
      })();
    }
  }, [email]);

  // Early fast-path: if email belongs to an already verified & complete account, skip OTP and go to Login or AwaitingApproval
  useEffect(() => {
    (async () => {
      if (shortCircuitedRef.current) return;
      // If prefills already indicates verified + completed, short-circuit immediately without network
      const pre = params?.prefills || null;
      if (pre && pre.isVerified === true && (pre.registrationCompleted !== false)) {
        shortCircuitedRef.current = true;
        const uid = params?.userId;
        if (pre.approved === true) {
          (navigation as any).reset({ index: 0, routes: [{ name: 'Login' as any, params: { noPrecheck: true } }] });
        } else {
          (navigation as any).reset({ index: 0, routes: [{ name: 'AwaitingApproval' as any, params: { userId: uid || undefined } }] });
        }
        return;
      }

      // Try restoring from stored user as well
      try {
        const raw = await AsyncStorage.getItem('user');
        if (raw) {
          const su = JSON.parse(raw);
          if (su?.isVerified === true && (su?.registrationCompleted !== false)) {
            shortCircuitedRef.current = true;
            if (su?.approved) {
              (navigation as any).reset({ index: 0, routes: [{ name: 'Login' as any, params: { noPrecheck: true } }] });
            } else {
              (navigation as any).reset({ index: 0, routes: [{ name: 'AwaitingApproval' as any, params: { userId: su?._id || undefined } }] });
            }
            return;
          }
        }
      } catch {}

      if (!email) return; // Need an email for network check
      checkingRef.current = true;
      try {
        const cleaned = email.trim().replace(/[\s]+/g,'').replace(/[\.,;:]+$/,'');
        const resp = await axios.post(`${BASE_URl}/api/users/lookup-email`, { email: cleaned });
        if (resp.data?.ok && resp.data.exists) {
          const { approved, registrationCompleted, hasPassword, userId } = resp.data;
          if (registrationCompleted && hasPassword) {
            try { await AsyncStorage.setItem('pendingEmail', cleaned); } catch {}
            if (userId) { try { await AsyncStorage.setItem('pendingUserId', String(userId)); } catch {} }
            shortCircuitedRef.current = true;
            if (approved) {
              // Verified and complete → straight to Login
              (navigation as any).reset({ index: 0, routes: [{ name: 'Login' as any, params: { noPrecheck: true } }] });
            } else {
              // Completed but awaiting approval
              (navigation as any).reset({ index: 0, routes: [{ name: 'AwaitingApproval' as any, params: { userId: userId || undefined } }] });
            }
            return;
          }
        }
      } catch {
        // Non-fatal; proceed with normal OTP flow
      } finally {
        checkingRef.current = false;
      }
    })();
  }, [email, navigation]);

  // Auto-send OTP when email is known and we haven't sent yet
  useEffect(() => {
    if (email && !sent && cooldown === 0 && !loading && !autoSentRef.current && !shortCircuitedRef.current && !checkingRef.current) {
      autoSentRef.current = true;
      sendMailOtp();
    }
  }, [email, sent, cooldown, loading]);

  // Send OTP to email (enhanced)
  const sendMailOtp = async () => {
    if (!email) {
      setInfo('Enter your email to receive a code.');
      return;
    }
    if (cooldown > 0) return;
    setLoading(true);
    setInfo('');
    try {
      const cleaned = email.trim().replace(/[\s]+/g,'').replace(/[\.,;:]+$/,'');
  const res = await axios.post(`${BASE_URl}/api/send-mail-otp`, { email: cleaned });
      const { status, message, devOtp: dOtp, cooldownRemaining, userId, existing, approved, registrationCompleted } = res.data || {};
      if (status === 'throttled') {
        setInfo(message || 'Please wait before retrying.');
        if (cooldownRemaining) startCooldown(cooldownRemaining);
      } else if (status === 'verified') {
        setInfo('Email already verified. Redirecting...');
        if (userId) {
          await AsyncStorage.setItem('pendingEmail', cleaned);
          await AsyncStorage.setItem('pendingUserId', String(userId));
          if (existing) {
            if (approved) {
              // go straight to Login and prevent precheck bounce
              (navigation as any).reset({ index: 0, routes: [{ name: 'Login' as any, params: { noPrecheck: true } }] });
            } else {
              (navigation as any).reset({ index: 0, routes: [{ name: 'AwaitingApproval' as any, params: { userId } }] });
            }
          } else {
            navigation.navigate('RegularRegistrationForm' as any, { userId, email: cleaned });
          }
        }
      } else if (status === 'sent' || status === 'sentDev') {
        setInfo(message || 'OTP sent.');
        if (dOtp && __DEV__) {
          setDevOtp(dOtp);
          setInfo(prev => prev + ` (dev OTP: ${dOtp})`);
        }
        setSent(true);
        if (userId) {
          await AsyncStorage.setItem('pendingEmail', cleaned);
          await AsyncStorage.setItem('pendingUserId', String(userId));
        }
        startCooldown(45);
      } else {
        setInfo(message || 'Unexpected response.');
      }
    } catch (e:any) {
      const code = e?.response?.data?.code;
      const status = e?.response?.data?.status;
      if (status === 'throttled' && e?.response?.data?.cooldownRemaining) {
        startCooldown(e.response.data.cooldownRemaining);
      }
      setInfo((e?.response?.data?.message || 'Failed to send OTP.') + (code && __DEV__ ? ` (${code})` : ''));
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== OTP_LENGTH) {
      setInfo('Enter the full 6-digit code.');
      return;
    }
    setVerifying(true);
    try {
  const cleaned = email.trim().replace(/[\s]+/g,'').replace(/[\.,;:]+$/,'');
  const res = await axios.post(`${BASE_URl}/api/verify-mail-otp`, { email: cleaned, otp: code });
      setLastCode(res.data.code);
      if (res.data.ok) {
        setInfo('Email verified!');
        const serverUserId = res.data.userId || params.userId;
        const alreadyHasPassword = !!res.data.existing;
        const isApproved = !!res.data.approved;
        if(params.flow === 'superadmin') {
          if(alreadyHasPassword){
            if(isApproved){
              (navigation as any).reset({ index: 0, routes: [{ name: 'Login' as any, params: { noPrecheck: true } }] });
            } else {
              (navigation as any).reset({ index: 0, routes: [{ name: 'AwaitingApproval' as any, params: { userId: serverUserId } }] });
            }
          } else {
            navigation.navigate('SuperAdminRegistration', { userId: serverUserId, prefills: params.prefills, email });
          }
        } else {
          // Regular path: if user already set password but not approved -> awaiting approval; else go to registration form
          if(alreadyHasPassword){
            if(isApproved){
              (navigation as any).reset({ index: 0, routes: [{ name: 'Login' as any, params: { noPrecheck: true } }] });
            } else {
              (navigation as any).reset({ index: 0, routes: [{ name: 'AwaitingApproval' as any, params: { userId: serverUserId } }] });
            }
          } else {
            navigation.navigate('RegularRegistrationForm' as any, { userId: serverUserId, email, prefills: params.prefills });
          }
        }
      } else {
        setInfo((res.data.message || 'Invalid OTP.') + (res.data.code && __DEV__ ? ` (${res.data.code})` : ''));
      }
    } catch (e: any) {
      const code = e?.response?.data?.code;
      setLastCode(code);
      setInfo((e?.response?.data?.message || 'Verification failed.') + (code && __DEV__ ? ` (${code})` : ''));
    } finally {
      setVerifying(false);
    }
  };

  const handleKeyPress = (key: string) => {
    if (key === 'backspace') {
      const lastFilled = [...otp].reverse().findIndex(v => v !== '');
      const idx = OTP_LENGTH - 1 - lastFilled;
      if (idx >= 0) {
        const newOtp = [...otp];
        newOtp[idx] = '';
        setOtp(newOtp);
      }
    } else if (/^\d$/.test(key)) {
      const nextIndex = otp.findIndex(d => d === '');
      if (nextIndex !== -1) {
        const newOtp = [...otp];
        newOtp[nextIndex] = key;
        setOtp(newOtp);
      }
    } else if (key === 'submit') {
      handleVerify();
    }
  };

  // Memoize for extra safety even though it's hoisted
  const keypadLayout = useMemo(() => KEYPAD_LAYOUT, []);

  return (
    <SafeAreaView style={styles.safeArea}>
  <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            {/* Updated image path to existing asset (mail_logo.png) */}
            <Image source={require('../../../assets/mail_logo.png')} style={styles.lockIcon} resizeMode="contain" />
            <Text style={styles.title}>Verify Your Email</Text>
              {!email ? (
                <>
                  <Text style={styles.subtitle}>Enter your email to receive an OTP.</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter email address"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                  />
                </>
              ) : (
                <Text style={styles.subtitle}>
                  Enter the 6-digit code sent to <Text style={{ fontWeight: 'bold' }}>{email}</Text>
                </Text>
              )}
            <View style={styles.otpContainer}>
              {otp.map((digit, idx) => (
                <TextInput
                  key={idx}
                  value={digit}
                  onChangeText={text => {
                    const cleaned = text.replace(/[^0-9]/g, '');
                    const newOtp = [...otp];
                    newOtp[idx] = cleaned;
                    setOtp(newOtp);
                  }}
                  style={styles.otpInput}
                  keyboardType="numeric"
                  maxLength={1}
                  showSoftInputOnFocus={false}
                  caretHidden
                />
              ))}
            </View>
            <TouchableOpacity style={styles.verifyButton} onPress={handleVerify} disabled={loading || verifying}>
              <Text style={styles.verifyButtonText}>{verifying ? 'Verifying...' : 'Verify OTP'}</Text>
            </TouchableOpacity>
            <Text style={styles.subtitle}>{info}</Text>
            <View style={styles.keypadWrapper}>
              {keypadLayout.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.keypadRow}>
                  {row.map((key, idx) => {
                    const isIcon = ['backspace', 'submit', 'space'].includes(key);
                    const isBlue = key === 'submit';
                    const isGray = ['backspace', 'space', '-'].includes(key);

                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.keypadButton,
                          isGray && styles.grayKey,
                          isBlue && styles.blueKey
                        ]}
                        onPress={() => handleKeyPress(key)}
                      >
                        {isIcon ? (
                          key === 'backspace' ? (
                            <Ionicons name="backspace-outline" size={22} color="#333" />
                          ) : key === 'submit' ? (
                            <Ionicons name="arrow-forward" size={22} color="#fff" />
                          ) : (
                            <Ionicons name="remove-outline" size={22} color="#333" />
                          )
                        ) : (
                          <Text style={styles.keypadText}>{key}</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
            <TouchableOpacity style={styles.resendButton} onPress={sendMailOtp} disabled={loading || verifying || !email || cooldown>0}>
              <Text style={styles.resendText}>{loading ? 'Sending...' : cooldown>0 ? `Resend in ${cooldown}s` : sent ? 'Resend OTP' : 'Send OTP'}</Text>
            </TouchableOpacity>
            {devOtp && __DEV__ ? (
              <Text style={{ textAlign:'center', color:'#888', fontSize:12 }}>Dev OTP: {devOtp}</Text>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default OtpVerificationScreen;
