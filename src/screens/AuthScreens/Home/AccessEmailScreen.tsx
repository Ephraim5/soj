import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import axios from 'axios';
import { BASE_URl } from '../../../api/users';
import { useNavigation } from '@react-navigation/native';

interface LookupResponse {
  ok: boolean;
  exists?: boolean;
  role?: string;
  userId?: string;
  user?: any;
}

const AccessEmailScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<any>();

  const handleContinue = async () => {
    setInfo('');
    if (!email) { setInfo('Enter email'); return; }
    setLoading(true);
    try {
  const res = await axios.post<LookupResponse>(`${BASE_URl}/api/users/lookup-email`, { email });
      if (!res.data.exists) {
        setInfo('Email not found. Contact admin.');
        return;
      }
      if (res.data.role === 'SuperAdmin') {
        navigation.navigate('MailOtp', { email: email.trim(), flow: 'superadmin', userId: res.data.userId, prefills: res.data.user });
      } else {
        setInfo('Role not supported yet in this flow.');
      }
    } catch (e:any) {
      setInfo(e?.response?.data?.message || 'Lookup failed');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS==='ios'? 'padding': undefined} style={styles.container}>
  <StatusBar barStyle="dark-content" />
      <Text style={styles.logo}>SOJ</Text>
      <Text style={styles.title}>Welcome!</Text>
      <Text style={styles.subtitle}>Please enter your email address to continue.</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter email address"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      {info ? <Text style={styles.info}>{info}</Text> : null}
      <TouchableOpacity style={styles.goBtn} onPress={handleContinue} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.goText}>Continue</Text>}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:'#fff', padding:24, justifyContent:'center'},
  logo:{ fontSize:42, fontWeight:'bold', color:'#2CA6FF', textAlign:'center', marginBottom:24},
  title:{ fontSize:22, fontWeight:'600', textAlign:'center', color:'#111'},
  subtitle:{ textAlign:'center', color:'#555', marginTop:8, marginBottom:24},
  input:{ borderWidth:1, borderColor:'#ccc', borderRadius:10, padding:14, fontSize:16, backgroundColor:'#f9f9f9'},
  goBtn:{ backgroundColor:'#2CA6FF', paddingVertical:16, borderRadius:10, marginTop:24, alignItems:'center'},
  goText:{ color:'#fff', fontSize:16, fontWeight:'600'},
  info:{ textAlign:'center', color:'red', marginTop:12 }
});

export default AccessEmailScreen;