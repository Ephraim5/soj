import React, { useCallback, useReducer, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, StatusBar } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import SupportTicketSuccessModal from '../../components/SupportTicketSuccessModal';
import { createSupportTicket, SupportCategory } from '../../api/support';
import { Colors } from '../main/UnitLeader/theme/colors';
import { heightPercentageToDP } from 'react-native-responsive-screen';

interface State {
  email: string;
  phone: string;
  category: SupportCategory | '';
  description: string;
  screenshotBase64?: string;
  submitting: boolean;
  errors: Record<string, string>;
  success: boolean;
}

type Action = { type: 'field'; field: keyof State; value: any } | { type: 'error'; field: string; message: string } | { type: 'clearError'; field: string } | { type: 'setSubmitting'; value: boolean } | { type: 'setSuccess'; value: boolean } | { type: 'resetExceptEmail' } | { type: 'bulkErrors'; errors: Record<string,string> };

const initial: State = { email: '', phone: '', category: '', description: '', submitting: false, errors: {}, success: false };

function reducer(state: State, action: Action): State {
  switch(action.type){
    case 'field':
      return { ...state, [action.field]: action.value };
    case 'error':
      return { ...state, errors: { ...state.errors, [action.field]: action.message } };
    case 'clearError':
      const { [action.field]: _, ...rest } = state.errors; return { ...state, errors: rest };
    case 'bulkErrors':
      return { ...state, errors: action.errors };
    case 'setSubmitting':
      return { ...state, submitting: action.value };
    case 'setSuccess':
      return { ...state, success: action.value };
    case 'resetExceptEmail':
      return { ...initial, email: state.email };
    default:
      return state;
  }
}

const categories: SupportCategory[] = ['Login Issues','Performance','Bug Report','Feature Request','Data Issue','Other'];

export default function SupportScreen({ navigation }: any){
  const [state, dispatch] = useReducer(reducer, initial);
  const [showCategoryList, setShowCategoryList] = useState(false);

  const validate = useCallback(() => {
    const errs: Record<string,string> = {};
    if(!state.email.trim()) errs.email = 'Email required';
    else if(!/^\S+@\S+\.\S+$/.test(state.email.trim())) errs.email = 'Invalid email';
    if(!state.category) errs.category = 'Pick a category';
    if(!state.description.trim() || state.description.trim().length < 10) errs.description = 'Min 10 characters';
    dispatch({ type: 'bulkErrors', errors: errs });
    return Object.keys(errs).length === 0;
  }, [state.email, state.category, state.description]);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if(!perm.granted){
      Alert.alert('Permission required','Allow photo library to attach a screenshot');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.6, allowsEditing: true, base64: true });
    if(!res.canceled && res.assets?.length){
      const asset = res.assets[0];
      if(asset.base64){
        const dataUri = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
        dispatch({ type: 'field', field: 'screenshotBase64', value: dataUri });
      }
    }
  };

  const submit = async () => {
    if(!validate()) return;
    dispatch({ type: 'setSubmitting', value: true });
    try {
      const payload = {
        email: state.email.trim(),
        phone: state.phone.trim() || undefined,
        category: state.category as SupportCategory,
        description: state.description.trim(),
        screenshotBase64: state.screenshotBase64
      };
      const res = await createSupportTicket(payload);
      if(!res.ok){
        Alert.alert('Failed', res.message || 'Could not submit ticket');
      } else {
        dispatch({ type: 'setSuccess', value: true });
        dispatch({ type: 'resetExceptEmail' });
      }
    } catch(e:any){
      Alert.alert('Error', e?.response?.data?.message || 'Submission failed');
    } finally {
      dispatch({ type: 'setSubmitting', value: false });
    }
  };

  return (
    <View style={{ flex:1, backgroundColor:'#fff' }}>
  <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={{ padding:20, paddingBottom:heightPercentageToDP(10),paddingTop:heightPercentageToDP(10) }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize:20, fontWeight:'700', marginBottom:6, color: Colors.text }}>Technical Support & Assistance</Text>
        <Text style={{ fontSize:14, fontWeight:'600', color: Colors.primary, marginBottom:12 }}>Need Help? We’re Here!</Text>
        <Text style={{ color:'#4a4a4a', fontSize:14, lineHeight:20, marginBottom:22 }}>
          This support page helps you quickly resolve any technical issue or challenge you're experiencing. Technical support for this app is provided directly by <Text style={{ fontWeight:'700' }}>Skyrazor Digital Limited</Text>, the team behind the app's design, development, and ongoing technical management—ensuring seamless user experiences and efficient solutions. Please submit your issue below, and we'll get back to you promptly.
        </Text>

        {/* Email */}
  <Text style={styles.label}>Email Address</Text>
        <TextInput
          autoCapitalize='none'
          keyboardType='email-address'
          value={state.email}
          onChangeText={v=>dispatch({ type:'field', field:'email', value:v })}
          onBlur={()=>validate()}
          placeholder='you@example.com'
          style={[styles.input, state.errors.email && styles.inputError]}
        />
        {state.errors.email && <Text style={styles.errorText}>{state.errors.email}</Text>}

        {/* Phone */}
  <Text style={styles.label}>Phone Number (Optional)</Text>
        <TextInput
          keyboardType='phone-pad'
            value={state.phone}
          onChangeText={v=>dispatch({ type:'field', field:'phone', value:v })}
          placeholder='+234...'
          style={styles.input}
        />

        {/* Category */}
  <Text style={styles.label}>Issue Category</Text>
        <TouchableOpacity style={[styles.input, { flexDirection:'row', justifyContent:'space-between', alignItems:'center' }, state.errors.category && styles.inputError]} onPress={()=>setShowCategoryList(s=>!s)}>
          <Text style={{ color: state.category ? '#111':'#999' }}>{state.category || 'Select a category'}</Text>
          <Text style={{ color:'#777' }}>{showCategoryList ? '▲':'▼'}</Text>
        </TouchableOpacity>
        {state.errors.category && <Text style={styles.errorText}>{state.errors.category}</Text>}
        {showCategoryList && (
          <View style={styles.dropdown}>
            {categories.map(cat => (
              <TouchableOpacity key={cat} style={styles.dropdownItem} onPress={()=>{ dispatch({ type:'field', field:'category', value:cat }); setShowCategoryList(false); }}>
                <Text style={{ color:'#111' }}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Description */}
  <Text style={styles.label}>Description</Text>
        <TextInput
          multiline
          numberOfLines={6}
          textAlignVertical='top'
          value={state.description}
          onChangeText={v=>dispatch({ type:'field', field:'description', value:v })}
          onBlur={()=>validate()}
          placeholder='Describe the issue you are facing with as much detail as possible.'
          style={[styles.textarea, state.errors.description && styles.inputError]}
        />
        {state.errors.description && <Text style={styles.errorText}>{state.errors.description}</Text>}

        {/* Screenshot */}
  <Text style={styles.label}>Attach Screenshot (Optional)</Text>
        {state.screenshotBase64 ? (
          <View style={{ marginBottom:12 }}>
            <Image source={{ uri: state.screenshotBase64 }} style={{ width:'100%', height:180, borderRadius:8, backgroundColor:'#eee' }} />
            <View style={{ flexDirection:'row', marginTop:6 }}>
              <TouchableOpacity onPress={()=>dispatch({ type:'field', field:'screenshotBase64', value:undefined })} style={[styles.secondaryBtn,{ marginRight:12 }]}>
                <Text style={styles.secondaryBtnText}>Remove</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={pickImage} style={styles.secondaryBtn}>
                <Text style={styles.secondaryBtnText}>Replace</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity onPress={pickImage} style={[styles.dashedBox]}>
            <Text style={{ color:'#555', textAlign:'center' }}>Tap to add a screenshot (optional)</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity disabled={state.submitting} onPress={submit} style={[styles.submitBtn, { backgroundColor: Colors.primary }, state.submitting && { opacity:0.6 }]}>
          {state.submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit Ticket</Text>}
        </TouchableOpacity>
        <View style={{ marginTop:28, alignItems:'center' }}>
          <Text style={{ fontSize:11, color:'#0d5c75', fontWeight:'600', marginBottom:4 }}>Managed by: <Text style={{ color: Colors.primary, textDecorationLine:'underline', fontWeight:'700' }}>Skyrazor Digital Limited</Text></Text>
          <Text style={{ fontSize:11, color:'#0d5c75', marginBottom:14 }}>Email: <Text style={{ fontWeight:'600' }}>inquiries@skyrazordigital.com</Text></Text>
          <Text style={{ textAlign:'center', fontSize:11, color:'#555', lineHeight:16, width:'92%' }}>
            For urgent issues, direct assistance, or other inquiries, feel free to contact us via email.
          </Text>
          <Text style={{ marginTop:18, textAlign:'center', fontSize:11, color:'#666' }}>By submitting you agree to our 
            <Text onPress={()=>navigation.navigate('LegalContent', { type:'terms' })} style={{ textDecorationLine:'underline', color: Colors.primary }}> Terms of Use</Text> &
            <Text onPress={()=>navigation.navigate('LegalContent', { type:'privacy' })} style={{ textDecorationLine:'underline', color: Colors.primary }}> Privacy Policy</Text>.
          </Text>
        </View>
      </ScrollView>

      <SupportTicketSuccessModal
        visible={state.success}
        onClose={()=>dispatch({ type:'setSuccess', value:false })}
        title={'Success'}
        message={'Your support request has been successfully submitted. A representative from Skyrazor Digital Limited will contact you shortly at your provided email or phone number. Thank you for your patience!'}
        autoCloseMs={0}
      />
    </View>
  );
}

const styles = {
  label: { fontWeight:'600', marginBottom:6, marginTop:12, color:'#111' },
  input: { borderWidth:1, borderColor:'#d9d9d9', paddingHorizontal:14, paddingVertical:12, borderRadius:8, backgroundColor:'#fafafa', fontSize:15 },
  textarea: { borderWidth:1, borderColor:'#d9d9d9', padding:14, borderRadius:10, backgroundColor:'#fafafa', fontSize:15, minHeight:140 },
  inputError: { borderColor:'#d04545', backgroundColor:'#fff5f5' },
  errorText: { color:'#d04545', fontSize:12, marginTop:4 },
  dropdown: { borderWidth:1, borderColor:'#d9d9d9', borderRadius:8, marginTop:6, overflow:'hidden', backgroundColor:'#fff' },
  dropdownItem: { padding:14, borderBottomWidth:1, borderBottomColor:'#eee' },
  dashedBox: { borderWidth:1, borderStyle:'dashed', borderColor:'#999', padding:24, borderRadius:10, marginBottom:16, backgroundColor:'#f8f8f8' },
  submitBtn: { backgroundColor:Colors.primary, paddingVertical:16, borderRadius:10, alignItems:'center', marginTop:8 },
  submitBtnText: { color:'#fff', fontWeight:'600', fontSize:16 },
  secondaryBtn: { backgroundColor:'#eee', paddingHorizontal:14, paddingVertical:10, borderRadius:8 },
  secondaryBtnText: { color:'#222', fontWeight:'500' },
  // modal styles moved to reusable component
} as const;