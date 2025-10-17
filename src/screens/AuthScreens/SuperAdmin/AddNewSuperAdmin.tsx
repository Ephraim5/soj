import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, SafeAreaView, ScrollView, StatusBar, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URl } from 'api/users';
import { useNavigation } from '@react-navigation/native';
import { heightPercentageToDP } from 'react-native-responsive-screen';

// Use unified app primary blue
const PRIMARY_BLUE = '#349DC5';

const AddNewSuperAdminScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [surname, setSurname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const nav = useNavigation();

  const disabled = !email || !firstName || !surname;

  const onSave = async () => {
    if (disabled) return;
    setLoading(true); setError('');
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('No token');
      const resp = await axios.post(`${BASE_URl}/api/users/create-super-admin`, { email, title, firstName, middleName, surname }, { headers:{ Authorization:`Bearer ${token}` } });
      if (!resp.data.ok) {
        setError(resp.data.message || 'Failed');
      } else {
        nav.goBack();
      }
    } catch (e:any) {
      setError(e?.response?.data?.message || e.message || 'Failed');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      {/* Header */}
      <View style={styles.header}> 
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#0B2540" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Set Up Other Super Admins</Text>
      </View>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.helper}>Enter the details of additional Super Admins.</Text>

        <View style={styles.field}> 
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} placeholder="Enter a valid email address" placeholderTextColor="#94A3B8" value={email} onChangeText={setEmail} autoCapitalize='none' keyboardType='email-address' />
        </View>
        <View style={styles.field}> 
          <Text style={styles.label}>Title</Text>
          {/* Placeholder for dropdown - currently simple input */}
          <View style={styles.dropdownWrapper}>
            <TextInput style={[styles.input, styles.dropdownInput]} placeholder="Title" placeholderTextColor="#94A3B8" value={title} onChangeText={setTitle} />
            <Ionicons name="chevron-down" size={18} color="#64748B" style={styles.dropdownIcon} />
          </View>
        </View>
        <View style={styles.field}> 
          <Text style={styles.label}>First Name</Text>
          <TextInput style={styles.input} placeholder="First Name" placeholderTextColor="#94A3B8" value={firstName} onChangeText={setFirstName} />
        </View>
        <View style={styles.field}> 
          <Text style={styles.label}>Middle Name</Text>
          <TextInput style={styles.input} placeholder="Middle Name" placeholderTextColor="#94A3B8" value={middleName} onChangeText={setMiddleName} />
        </View>
        <View style={styles.field}> 
          <Text style={styles.label}>Surname</Text>
          <TextInput style={styles.input} placeholder="Surname" placeholderTextColor="#94A3B8" value={surname} onChangeText={setSurname} />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity disabled={disabled||loading} onPress={onSave} style={[styles.saveBtn, (disabled||loading)&&{opacity:0.6}]}> 
          {loading? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save</Text>}
        </TouchableOpacity>
        <View style={{height:40}} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea:{ flexGrow:1,paddingTop:heightPercentageToDP('5%'), backgroundColor:'#fff' },
  header:{ flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingTop:8, paddingBottom:4 },
  backBtn:{ padding:4, marginRight:4 },
  headerTitle:{ flex:1, textAlign:'left', fontSize:16, fontWeight:'600', color:'#0B2540' },
  container:{ paddingHorizontal:20, paddingTop:8 },
  helper:{ fontSize:13, color:'#475569', marginBottom:22 },
  field:{ marginBottom:18 },
  label:{ fontSize:12, fontWeight:'500', color:'#1E293B', marginBottom:6 },
  input:{ height:50, borderWidth:1, borderColor:'#CBD5E1', borderRadius:10, paddingHorizontal:14, backgroundColor:'#F8FAFC', fontSize:14, color:'#0F172A' },
  dropdownWrapper:{ position:'relative' },
  dropdownInput:{ paddingRight:34 },
  dropdownIcon:{ position:'absolute', right:14, top:16 },
  saveBtn:{ backgroundColor:PRIMARY_BLUE, height:54, borderRadius:18, alignItems:'center', justifyContent:'center', marginTop:10 },
  saveText:{ color:'#fff', fontWeight:'600', fontSize:16 },
  error:{ color:'#DC2626', marginBottom:8, fontSize:12 }
});

export default AddNewSuperAdminScreen;
