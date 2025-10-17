import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../navigation/Navigation';

const PRIMARY = '#349DC5';

const FingerprintSetupScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [hardware, setHardware] = useState<boolean | null>(null);
  const [enrolled, setEnrolled] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  const loadStatus = useCallback(async () => {
    try {
      const has = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setHardware(has); setEnrolled(isEnrolled);
      const enabled = await AsyncStorage.getItem('fingerprintEnabled');
      if (enabled === 'true' && has && isEnrolled) {
        // Attempt quick auth
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Authenticate',
          fallbackLabel: 'Use Passcode'
        });
        if (result.success) {
          navigation.navigate('Login');
        }
      }
    } finally { setChecking(false); }
  }, [navigation]);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const handleEnable = async () => {
    if (!hardware) { Alert.alert('Unavailable', 'Biometric hardware not available.'); return; }
    if (!enrolled) { Alert.alert('Not Set Up', 'Add a fingerprint in device settings first.'); return; }
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Scan fingerprint' });
    if (result.success) {
      await AsyncStorage.setItem('fingerprintEnabled', 'true');
      Alert.alert('Enabled', 'Biometric login activated.');
      navigation.navigate('Login');
    } else {
      Alert.alert('Failed', 'Authentication failed.');
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem('fingerprintEnabled', 'false');
    navigation.navigate('Login');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backArrow}>←</Text>
      </TouchableOpacity>
      <View style={styles.iconWrap}>
        {hardware && enrolled ? (
          <View style={styles.ringOuter}>
            <View style={styles.ringInner}>
              <Ionicons name="finger-print" size={74} color={PRIMARY} />
            </View>
          </View>
        ) : (
          <Ionicons name="lock-closed-outline" size={80} color={PRIMARY} />
        )}
      </View>
      <Text style={styles.title}>Biometric Login</Text>
      <Text style={styles.subtitle}>
        {checking ? 'Checking device capabilities...' : hardware ? (enrolled ? 'Use your fingerprint for faster, secure login.' : 'No fingerprints enrolled on this device.') : 'Biometric hardware not available.'}
      </Text>
      {hardware && enrolled && (
        <TouchableOpacity style={styles.enableButton} onPress={handleEnable} disabled={checking}>
          <Text style={styles.enableButtonText}>Enable</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={handleSkip} disabled={checking}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
    </View>
  );
};

export default FingerprintSetupScreen;

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:'#fff', alignItems:'center', justifyContent:'center', paddingHorizontal:24 },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
  },
  backArrow: {
    fontSize: 24,
    color: '#000',
  },
  iconWrap:{ marginBottom:32 },
  ringOuter:{ width:140, height:140, borderRadius:70, backgroundColor:'#e6f4f9', alignItems:'center', justifyContent:'center' },
  ringInner:{ width:110, height:110, borderRadius:55, backgroundColor:'#fff', alignItems:'center', justifyContent:'center', borderWidth:2, borderColor:'#c5e6f0' },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0D1B34',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#5B5B5B',
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  enableButton: {
    width: '100%',
    backgroundColor: '#349DC5',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  enableButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  skipText: {
    fontSize: 16,
    color: '#349DC5',
    fontWeight: '500',
  },
});
