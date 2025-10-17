import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, Image, StatusBar } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRoute, useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { BASE_URl } from '../../../api/users';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface RouteParams { userId: string; prefills?: any; email: string }

const rules = {
  length: (v: string) => v.length >= 8,
  upper: (v: string) => /[A-Z]/.test(v),
  lower: (v: string) => /[a-z]/.test(v),
  number: (v: string) => /\d/.test(v),
  special: (v: string) => /[!@#$%^&*(),.?":{}|<>]/.test(v)
};

const SuperAdminRegistrationScreen: React.FC = () => {
  const { params } = useRoute<any>();
  const navigation = useNavigation<any>();
  const { userId, prefills, email } = params as RouteParams;

  const [title, setTitle] = useState(prefills?.title || '');
  const [surname, setSurname] = useState(prefills?.surname || '');
  const [firstName, setFirstName] = useState(prefills?.firstName || '');
  const [middleName, setMiddleName] = useState(prefills?.middleName || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const passOk = Object.values(rules).every(fn => fn(password));

  const submit = async () => {
    setInfo('');
    if (!title || !surname || !firstName) { setInfo('Fill required fields.'); return; }
    if (!passOk) { setInfo('Password does not meet requirements'); return; }
    if (password !== confirmPassword) { setInfo('Passwords do not match'); return; }
    if (!agree) { setInfo('Accept terms first'); return; }
    setLoading(true);
    try {
  const res = await axios.post(`${BASE_URl}/api/auth/complete-superadmin`, { userId, email, title, surname, firstName, middleName, password });
    if (res.data.ok) {
      try { await AsyncStorage.setItem('pendingUserId', res.data.userId); } catch {}
      if (avatarUri) {
        await uploadAvatar(res.data.userId, avatarUri);
      }
      navigation.navigate('FingerprintSetup');
      } else setInfo(res.data.message || 'Failed');
    } catch(e:any) { setInfo(e?.response?.data?.message || 'Error'); }
    finally { setLoading(false); }
  };

  const pickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert('Permission required', 'Grant photo library access to pick an image.'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1,1], quality: 0.7 });
      if (!result.canceled) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch (e:any) {
      Alert.alert('Image Error', e.message || 'Failed to pick image');
    }
  };

  const uploadAvatar = async (theUserId: string, uri: string) => {
    try {
      setUploading(true);
      // build multipart manually with fetch since axios + RN FS sometimes tricky
      const formData: any = new FormData();
      formData.append('userId', theUserId);
      formData.append('file', { uri, name: 'avatar.jpg', type: 'image/jpeg' } as any);
  const resp = await fetch(`${BASE_URl}/api/upload/profile`, { method:'POST', body: formData, headers: { 'Accept': 'application/json' } });
      const json = await resp.json();
      if (!json.ok) {
        console.log('Upload failed', json);
      }
    } catch (e) {
      console.log('Upload error', e);
    } finally {
      setUploading(false);
    }
  };

  const requirement = (label: string, valid: boolean) => (
    <Text style={{ color: valid ? 'green' : 'red', fontSize:12 }}>• {label}</Text>
  );

  return (
    <ScrollView contentContainerStyle={s.container}>
  <StatusBar barStyle="dark-content" />
      <View style={s.headerWrap}>
        <TouchableOpacity onPress={()=> navigation.goBack()} style={s.backBtn}>
          <Text style={s.backTxt}>{'<'}</Text>
        </TouchableOpacity>
        <Image source={require('../../../assets/images-removebg-preview.png')} style={s.logo} resizeMode='contain' />
      </View>
      <Text style={s.header}>Welcome {title ? `${title} `: ''}{firstName || ''}!</Text>
      <Text style={s.sub}>Please complete your registration</Text>
      {/* Title dropdown placeholder (to implement later) */}
      <TextInput placeholder='Title' value={title} onChangeText={setTitle} style={s.input} />
      <TextInput placeholder='Surname' value={surname} onChangeText={setSurname} style={s.input} />
      <TextInput placeholder='First Name' value={firstName} onChangeText={setFirstName} style={s.input} />
      <TextInput placeholder='Middle Name' value={middleName} onChangeText={setMiddleName} style={s.input} />
      <TextInput placeholder='Email' value={email} editable={false} style={[s.input,{backgroundColor:'#f0f4f6'}]} />
      <TextInput placeholder='Password' value={password} onChangeText={setPassword} secureTextEntry style={s.input} />
      <TextInput placeholder='Confirm Password' value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry style={s.input} />
      <Text style={s.avatarLabel}>Add Profile Photo</Text>
      <TouchableOpacity style={s.avatarWrap} onPress={pickImage}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={s.avatarImg} />
        ) : (
          <View style={s.avatarPlaceholder}>
            <Text style={s.avatarCamera}>📷</Text>
          </View>
        )}
        {uploading && <View style={s.uploadOverlay}><ActivityIndicator color="#fff" /></View>}
      </TouchableOpacity>
      <View style={s.rulesBox}>
        {requirement('At least 8 characters', rules.length(password))}
        {requirement('Uppercase letter', rules.upper(password))}
        {requirement('Lowercase letter', rules.lower(password))}
        {requirement('Number', rules.number(password))}
        {requirement('Special character', rules.special(password))}
      </View>
      <TouchableOpacity onPress={()=> setAgree(!agree)} style={s.checkboxRow}>
        <View style={[s.checkbox, agree && {backgroundColor:'#349DC5'}]}>
          {agree ? <Text style={{ color:'#fff', textAlign:'center', fontWeight:'700' }}>✓</Text> : null}
        </View>
        <Text style={s.agreeTxt}>I have read and agree to the Privacy Policy & Terms of Use.</Text>
      </TouchableOpacity>
      {info ? <Text style={s.errorTxt}>{info}</Text>: null}
      <TouchableOpacity style={[s.submit,{opacity: loading?0.7:1}]} onPress={submit} disabled={loading}>
        {loading? <ActivityIndicator color="#fff"/>:<Text style={s.submitText}>Continue</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
};

const s = StyleSheet.create({
  container:{ paddingHorizontal:24, paddingTop:36, backgroundColor:'#fff', flexGrow:1, paddingBottom:48 },
  headerWrap:{ alignItems:'center', marginBottom:10, position:'relative' },
  backBtn:{ position:'absolute', left:0, top:10, padding:8 },
  backTxt:{ color:'#349DC5', fontSize:20 },
  logo:{ width:90, height:60 },
  header:{ fontSize:22, fontWeight:'700', marginBottom:4, color:'#0E2433', textAlign:'center' },
  sub:{ color:'#5a6b74', marginBottom:18, textAlign:'center' },
  input:{ borderWidth:1, borderColor:'#d4dce1', borderRadius:8, padding:14, marginBottom:14, backgroundColor:'#fafafa', fontSize:14 },
  rulesBox:{ marginBottom:14 },
  checkboxRow:{ flexDirection:'row', alignItems:'center', marginBottom:18 },
  checkbox:{ width:20, height:20, borderWidth:1, borderColor:'#349DC5', marginRight:8, borderRadius:4 },
  agreeTxt:{ flex:1, fontSize:12, color:'#3a4a52' },
  errorTxt:{ color:'red', textAlign:'center', marginBottom:8 },
  submit:{ backgroundColor:'#349DC5', paddingVertical:16, borderRadius:10, alignItems:'center', marginTop:4 },
  submitText:{ color:'#fff', fontSize:16, fontWeight:'600' },
  avatarLabel:{ fontSize:12, fontWeight:'500', color:'#34454d', marginBottom:6 },
  avatarWrap:{ width:78, height:78, borderRadius:40, borderWidth:3, borderColor:'#0E5F87', alignItems:'center', justifyContent:'center', marginBottom:18, overflow:'hidden', backgroundColor:'#0E5F8710' },
  avatarPlaceholder:{ flex:1, alignItems:'center', justifyContent:'center', width:'100%', height:'100%', backgroundColor:'#0E5F87' },
  avatarCamera:{ fontSize:22, color:'#fff' },
  avatarImg:{ width:'100%', height:'100%' },
  uploadOverlay:{ position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(0,0,0,0.4)', alignItems:'center', justifyContent:'center' }
});

export default SuperAdminRegistrationScreen;