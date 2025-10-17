import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { BASE_URl } from '../../api/users';

export default function AwaitingApprovalScreen(){
  const nav:any = useNavigation();
  const route:any = useRoute();
  const name = route?.params?.name as string | undefined;
  const [checking, setChecking] = useState(false);

  const onCheckStatus = async () => {
    if (checking) return;
    setChecking(true);
    try {
      let email: string | null = route?.params?.email || null;
      if (!email) {
        try { email = await AsyncStorage.getItem('pendingEmail'); } catch {}
      }
      if (!email) {
        try {
          const raw = await AsyncStorage.getItem('user');
          if (raw) { const u = JSON.parse(raw); email = u?.email || null; }
        } catch {}
      }
      if (!email) {
  Toast.show({ type: 'error', text1: 'No email found', text2: 'Please provide your email to continue.' });
  nav.navigate('Registration');
        return;
      }
      const resp = await axios.post(`${BASE_URl}/api/users/lookup-email`, { email });
      if (resp.data?.ok && resp.data.exists) {
        const { approved, registrationCompleted, hasPassword } = resp.data;
        if (approved === true) {
          Toast.show({ type: 'success', text1: 'Approved', text2: 'Your account has been approved. You can now login.' });
          nav.navigate('Login');
          return;
        }
        if (registrationCompleted === false || hasPassword === false) {
          Toast.show({ type: 'info', text1: 'Action required', text2: 'Please finish your registration.' });
          nav.navigate('MailOtp', { email, userId: resp.data.userId });
          return;
        }
        Toast.show({ type: 'info', text1: 'Still pending', text2: 'A leader has not approved your account yet.' });
      } else if (resp.data?.ok && resp.data.exists === false) {
  Toast.show({ type: 'error', text1: 'Not found', text2: 'We could not find an account for that email.' });
  nav.navigate('Registration');
      } else {
        Toast.show({ type: 'error', text1: 'Check failed', text2: 'Unexpected response from server.' });
      }
    } catch (e:any) {
      const msg = e?.response?.data?.message || e?.message || 'Network error';
      Toast.show({ type: 'error', text1: 'Check failed', text2: msg });
    } finally {
      setChecking(false);
    }
  };
  return (
    <SafeAreaView style={styles.container}>
  <StatusBar barStyle="dark-content" />
      <View style={styles.iconWrap}>
        <Ionicons name="time-outline" size={46} color="#349DC5" />
      </View>
      <Text style={styles.title}>{name ? `Thanks, ${name}!` : 'Registration Submitted'}</Text>
      <Text style={styles.body}>Your account is awaiting approval by a leader. You’ll get access to the dashboard once approved.</Text>
      <TouchableOpacity style={[styles.button, checking && { opacity: 0.7 }]} onPress={onCheckStatus} disabled={checking}>
        {checking ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Check status</Text>}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, alignItems:'center', justifyContent:'center', padding:32, paddingTop:48, backgroundColor:'#ffffff' },
  iconWrap:{ width:72, height:72, borderRadius:36, backgroundColor:'#e8f5fb', alignItems:'center', justifyContent:'center', marginBottom:12 },
  title:{ fontSize:22, fontWeight:'700', marginBottom:8, color:'#0E2433' },
  body:{ fontSize:16, textAlign:'center', lineHeight:22, color:'#444', marginBottom:32 },
  button:{ backgroundColor:'#349DC5', paddingHorizontal:28, paddingVertical:14, borderRadius:8 },
  buttonText:{ color:'#fff', fontWeight:'600', fontSize:16 }
});
