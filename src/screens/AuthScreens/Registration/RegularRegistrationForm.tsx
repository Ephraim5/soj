/**
 * Registration (Regular) Two-Step Form
 * Pixel spec notes extracted from provided design screenshots:
 *  - Horizontal padding: 28px each side (content aligned with header text)
 *  - Top padding before header: 24px; between header and progress segments: 18px
 *  - Progress indicator: two separate 4px height bars, 8px radius, 10px gap
 *  - Typography:
 *      Header: 16px / 600 / #101828
 *      Labels: 12px / 600 / #344054 (6px space below, 14px group vertical rhythm)
 *      Sublabel helper: 11px / #667085 line-height 14
 *      Password rules: 11px / #667085 (green #027A48 when satisfied)
 *  - Inputs: 44px height, border #D0D5DD 1px, radius 8px, left/right padding 14px
 *  - Primary button: 48px height, radius 8px, color #2CA6FF, font 15px / 600
 *  - Spacing between stacked fields: Achieved via container marginBottom:14
 *  - Checkbox row: 18px square box, 10px gap, text 11.5px line-height 16
 *  - Secondary interactive chips (work fields): pill background #EEF6FB, text #0A6375
 * Assumptions:
 *  - Phone number field is mandatory (not in original screenshot) placed after Gender.
 *  - Worker / unit selections currently plain text inputs awaiting dropdown integration.
 *  - Multi-field chips for selected specific fields generated from comma separated input.
 *  - Design tokens chosen to match existing color palette (#2CA6FF primary accent).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator, Image, StatusBar } from 'react-native';
import { checkPhone, completeRegularRegistration } from '../../../api/registration';
import { Dropdown, MultiSelect } from 'react-native-element-dropdown';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import axios from 'axios';
import { BASE_URl } from '../../../api/users';
import { fetchCountries, searchPlaces } from '../../../api/locations';

interface Props { navigation: any; route: any; }

const passwordRules = [
  { test: (v:string)=> v.length >= 6, label: 'Minimum 6 characters' },
  { test: (v:string)=> /[A-Za-z]/.test(v), label: 'At least one letter (A-Z or a-z)' },
  { test: (v:string)=> /\d/.test(v), label: 'At least one number (0-9)' },
  { test: (v:string)=> /[^A-Za-z0-9]/.test(v), label: 'At least one special character (@#$%^&+=/?)' },
];

export default function RegularRegistrationForm({ navigation, route }: Props){
  const { userId, prefills } = route.params || {};
  const [step, setStep] = useState<1|2>(1);
  // Step 1 fields
  const [title, setTitle] = useState('');
  const [surname, setSurname] = useState(prefills?.surname || '');
  const [firstName, setFirstName] = useState(prefills?.firstName || '');
  const [middleName, setMiddleName] = useState(prefills?.middleName || '');
  const [workerSelection, setWorkerSelection] = useState(''); // "Select Where You Serve As A Worker"
  // Active role now supports MinistryAdmin (no ChurchAdmin per latest requirement)
  const [activeRole, setActiveRole] = useState<'UnitLeader'|'Member'|'MinistryAdmin'|'SuperAdmin'>('Member');
  const [unitLead, setUnitLead] = useState('');
  const [unitMember, setUnitMember] = useState('');
  const [gender, setGender] = useState('');
  const [phone, setPhone] = useState(''); // mandatory but not in original screenshot
  const [phoneStatus, setPhoneStatus] = useState<'unknown'|'checking'|'free'|'exists'>('unknown');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  // Church + Ministries
  const [churchId, setChurchId] = useState<string>('');
  const [churches, setChurches] = useState<Array<{ _id:string; name:string; slug:string; ministries?:Array<{ _id:string; name:string }> }>>([]);
  // Step 2 fields
  const [country, setCountry] = useState('');
  const [countryCode, setCountryCode] = useState<string>('');
  const [state, setState] = useState('');
  const [lga, setLga] = useState('');
  const [town, setTown] = useState('');
  const [countriesOptions, setCountriesOptions] = useState<Array<{label:string; value:string; flag?:string}>>([]);
  const [cityQuery, setCityQuery] = useState('');
  const [stateQuery, setStateQuery] = useState('');
  const [cityOptions, setCityOptions] = useState<Array<{label:string; value:string}>>([]);
  const [stateOptions, setStateOptions] = useState<Array<{label:string; value:string}>>([]);
  const [street, setStreet] = useState('');
  const [landmark, setLandmark] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [occupation, setOccupation] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('');
  const [workFields, setWorkFields] = useState<string[]>([]); // multi select chips
  const [specificFields, setSpecificFields] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
  const specificFieldInputRef = useRef<TextInput>(null);

  const allRulesOk = passwordRules.every(r=> r.test(password));
  const canNext = title && firstName && surname && phoneStatus==='free' && allRulesOk && password === confirm && gender && activeRole;

  // Options (TODO: replace with dynamic list from API when available)
  const unitOptions = useMemo(() => [
    'Protocol','Ushering','Choir','Media','Prayer','Evangelism','Sanctuary Keepers','Welfare','Technical','Beautification','Security'
  ].map(v=>({ label:v, value:v })), []);
  const workerOptions = useMemo(()=>{
    // ministries based on selected church
    const ch = churches.find(c=> c._id === churchId);
    const mins = ch?.ministries || [];
    if (mins.length) return mins.map(m=> ({ label:m.name, value:m.name }));
    return [];
  },[churchId, churches]);
  const genderOptions = useMemo(()=>[
    { label:'Male', value:'Male' },{ label:'Female', value:'Female' }
  ],[]);
  const roleOptions = useMemo(()=>[
    { label:'Member', value:'Member' },{ label:'Unit Leader', value:'UnitLeader' },{ label:'Ministry Admin', value:'MinistryAdmin' },{ label:'Super Admin', value:'SuperAdmin' }
  ],[]);
  const titleOptions = useMemo(()=>[
    'Mr','Mrs','Miss','Ms','Dr','Pastor','Bro','Sis','Prof','Engr','Deacon','Deaconess'
  ].map(v=>({ label:v, value:v })),[]);
  const lgaOptions = useMemo(()=>[
    'Umuahia North','Umuahia South','Ohafia','Bende','Ikwuano','Isiala Ngwa North','Isiala Ngwa South','Arochukwu','Ukwa East','Ukwa West','Aba North','Aba South'
  ].map(v=>({ label:v, value:v })),[]);
  const employmentOptions = useMemo(()=>[
    'Employed','Self-employed','Student','Unemployed','Retired'
  ].map(v=>({ label:v, value:v })),[]);
  const maritalOptions = useMemo(()=>[
    'Single','Married','Divorced','Widowed'
  ].map(v=>({ label:v, value:v })),[]);
  const workFieldOptions = useMemo(()=>[
    'Health/Medical','Real Estate','Education','Finance','Technology','Hospitality','Retail','Logistics','Construction','Manufacturing','Agriculture'
  ].map(v=>({ label:v, value:v })),[]);
  const days = useMemo(()=>Array.from({length:31},(_,i)=>{
    const v = String(i+1).padStart(2,'0'); return { label:v, value:v };
  }),[]);
  const months = useMemo(()=>Array.from({length:12},(_,i)=>{
    const v = String(i+1).padStart(2,'0'); return { label:v, value:v };
  }),[]);
  const years = useMemo(()=>{
    const now = new Date().getFullYear();
    const arr: {label:string,value:string}[] = [];
    for(let y=now; y>=1930; y--) arr.push({ label: String(y), value: String(y) });
    return arr;
  },[]);

  // Fetch churches (public endpoint) and preselect user's church from prefills if present
  useEffect(()=>{
    let cancelled = false;
    (async()=>{
      try{
        const res = await axios.get(`${BASE_URl}/api/churches/public`);
        if(res.data?.ok && Array.isArray(res.data.churches)){
          if(!cancelled){
            setChurches(res.data.churches);
            // preselect church based on prefills or default to first
            const preferred = prefills?.church?._id || prefills?.church || '';
            if(preferred){ setChurchId(String(preferred)); }
          }
        }
      }catch(e){ /* ignore to keep form usable */ }
    })();
    return ()=>{ cancelled = true; };
  },[]);

  // Load countries on mount
  useEffect(() => {
    (async () => {
      try {
        const countries = await fetchCountries();
        setCountriesOptions(countries.map(c => ({ label: `${c.flag || ''} ${c.label}`.trim(), value: c.value })));
      } catch {}
    })();
  }, []);

  // Query cities and states when the user types
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cityQuery && !stateQuery) { setCityOptions([]); setStateOptions([]); return; }
      try {
        const res = await searchPlaces(cityQuery || stateQuery, countryCode || undefined);
        if (!cancelled) {
          if (cityQuery) setCityOptions(res.cities);
          if (stateQuery) setStateOptions(res.states);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [cityQuery, stateQuery, countryCode]);

  const handleCheckPhone = async () => {
    if(!phone) { setPhoneStatus('unknown'); return; }
    setPhoneStatus('checking');
    try {
      const res = await checkPhone(phone);
      setPhoneStatus(res.exists ? 'exists' : 'free');
    } catch { setPhoneStatus('unknown'); }
  };

  const submit = async () => {
    setError('');
    if (submitting) return;
    // quick client validations
    if(activeRole==='MinistryAdmin'){
      if(!churchId){ setError('Please select your church'); return; }
      if(!workerSelection){ setError('Please select the ministry you admin'); return; }
    }
    setSubmitting(true);
    try {
      const dobIso = (dobYear && dobMonth && dobDay) ? `${dobYear}-${dobMonth}-${dobDay}` : undefined;
      const payload = {
        userId,
        firstName,
        surname,
        middleName,
        activeRole,
        password,
        phone,
        // For UnitLeader/Member supply units; for MinistryAdmin/SuperAdmin omit them
        unitsLed: activeRole==='UnitLeader' && unitLead ? [unitLead] : [],
        unitsMember: (activeRole==='UnitLeader' || activeRole==='Member') && unitMember ? [unitMember] : [],
        gender,
        dob: dobIso,
        occupation,
        employmentStatus,
        maritalStatus,
        // Church scope: include if chosen
        churchId: churchId || undefined,
        // MinistryAdmin requires ministryName
        ministryName: activeRole==='MinistryAdmin' ? (workerSelection || undefined) : undefined
      };
      const res = await completeRegularRegistration(payload);
      if(res.ok){
        // Upload avatar if available (post-success best-effort)
        if (localAvatarUri) {
          try {
            const token = await AsyncStorage.getItem('token');
            if (token) {
              const formData = new FormData();
              formData.append('file', { uri: localAvatarUri, name: 'avatar.jpg', type: 'image/jpeg' } as any);
              formData.append('userId', userId);
              await fetch(`${BASE_URl}/api/upload/profile`, { method:'POST', headers:{ Authorization:`Bearer ${token}` }, body: formData as any });
            }
          } catch {}
        }
        navigation.replace('Login');
      } else {
        setError(res.message || 'Registration failed');
      }
    } catch(e:any){
      setError(e?.response?.data?.message || e.message || 'Registration failed');
    } finally { setSubmitting(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex:1, backgroundColor:'#fff' }} behavior={Platform.OS==='ios'? 'padding': undefined}>
  <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps='handled'>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={()=> step===1? navigation.goBack(): setStep(1)} style={styles.backBtn}> 
            <Text style={styles.backIcon}>{'\u2039'}</Text>
          </TouchableOpacity>
          <Text style={styles.header}>Please complete your registration.</Text>
        </View>
        <View style={styles.stepsRow}>
          <View style={[styles.stepSegment, step===1 && styles.stepSegmentActive]} />
          <View style={[styles.stepSegment, step===2 && styles.stepSegmentActive]} />
        </View>
        {step === 1 && (
          <View>
            <LabeledDropdown label="Title" placeholder="Title" data={titleOptions} value={title} onChangeValue={setTitle} />
            <LabeledInput label="Surname" value={surname} onChangeText={setSurname} placeholder="Surname" />
            <LabeledInput label="First Name" value={firstName} onChangeText={setFirstName} placeholder="First Name" />
            <LabeledInput label="Middle Name" value={middleName} onChangeText={setMiddleName} placeholder="Middle Name" optional />
            <LabeledDropdown
              label="Church"
              placeholder="Select church"
              data={churches.map(c=>({ label:c.name, value:c._id }))}
              value={churchId}
              onChangeValue={setChurchId}
            />
            {activeRole==='MinistryAdmin' && (
              <LabeledDropdown
                label="Select Where You Serve As A Worker."
                subLabel="Select only one option for now. You can always add another later from your profile."
                placeholder="Select one option"
                data={workerOptions}
                value={workerSelection}
                onChangeValue={setWorkerSelection}
              />
            )}
            <LabeledDropdown
              label="Active Role"
              placeholder="Select active role"
              data={roleOptions}
              value={activeRole}
              onChangeValue={(v)=> setActiveRole(v as any)}
            />
            {activeRole==='UnitLeader' && (
              <LabeledDropdown
                label="Unit"
                placeholder="Select the unit you lead"
                data={unitOptions}
                value={unitLead}
                onChangeValue={setUnitLead}
              />
            )}
            {(activeRole==='UnitLeader' || activeRole==='Member') && (
              <LabeledDropdown
                label="Unit Where You are a member"
                subLabel="You may eventually belong to more than one unit. For now, please select only one. You can always add another later from your profile."
                placeholder="Select a unit"
                data={unitOptions}
                value={unitMember}
                onChangeValue={setUnitMember}
              />
            )}
            <LabeledDropdown
              label="Gender"
              placeholder="Select your gender"
              data={genderOptions}
              value={gender}
              onChangeValue={setGender}
            />
            <LabeledInput label="Phone Number" value={phone} onChangeText={(v: any)=>{ setPhone(v); setPhoneStatus('unknown'); }} onBlur={handleCheckPhone} keyboardType='phone-pad' placeholder='+234...' />
            {phoneStatus==='checking' && <Text style={styles.helper}>Checking...</Text>}
            {phoneStatus==='exists' && <Text style={[styles.helper,{ color:'#D92D20'}]}>Phone already registered.</Text>}
            {phoneStatus==='free' && <Text style={[styles.helper,{ color:'#027A48'}]}>Phone available.</Text>}
            <PasswordInput label="Password" value={password} onChangeText={setPassword} placeholder="Must be at least 6 characters" secureTextEntry={!showPassword} onToggleSecure={()=> setShowPassword(s=>!s)} />
            <PasswordRules password={password} />
            <PasswordInput label="Confirm Password" value={confirm} onChangeText={setConfirm} placeholder="Re-enter password" secureTextEntry={!showConfirm} onToggleSecure={()=> setShowConfirm(s=>!s)} />
            <TouchableOpacity disabled={!canNext} style={[styles.primaryBtn, !canNext && { opacity:0.4 }]} onPress={()=> setStep(2)}>
              <Text style={styles.primaryText}>Next</Text>
            </TouchableOpacity>
          </View>
        )}
        {step === 2 && (
          <View>
            <Text style={styles.sectionTitle}>Residential Address</Text>
            <LabeledDropdown
              label="Country"
              placeholder="Select your country"
              data={countriesOptions}
              value={country}
              onChangeValue={(val) => { setCountry(val); setCountryCode(val); }}
            />
            <SearchableDropdown
              label="State / Region"
              placeholder="Type to search your state"
              value={state}
              onChangeValue={setState}
              query={stateQuery}
              onChangeQuery={setStateQuery}
              data={stateOptions}
            />
            <LabeledDropdown label="L.G.A" placeholder="L.G.A" data={lgaOptions} value={lga} onChangeValue={setLga} />
            <SearchableDropdown
              label="Town / City"
              placeholder="Type to search your city"
              value={town}
              onChangeValue={setTown}
              query={cityQuery}
              onChangeQuery={setCityQuery}
              data={cityOptions}
            />
            <LabeledInput label="Village/ Street number/ Street name" value={street} onChangeText={setStreet} placeholder="Enter Here" />
            <LabeledInput label="Nearest landmark/ bus stop" value={landmark} onChangeText={setLandmark} placeholder="Enter Here" />
            <Text style={styles.sectionLabel}>Date of Birth</Text>
            <View style={styles.dobRow}>
              <Dropdown style={[styles.input, styles.dobInput]} data={days} labelField="label" valueField="value" placeholder="Day" value={dobDay} onChange={(it:any)=> setDobDay(it.value)} selectedTextStyle={{ fontSize:13, color:'#101828' }} placeholderStyle={{ fontSize:13, color:'#98A2B3' }} />
              <Dropdown style={[styles.input, styles.dobInput]} data={months} labelField="label" valueField="value" placeholder="Month" value={dobMonth} onChange={(it:any)=> setDobMonth(it.value)} selectedTextStyle={{ fontSize:13, color:'#101828' }} placeholderStyle={{ fontSize:13, color:'#98A2B3' }} />
              <Dropdown style={[styles.input, styles.dobInput]} data={years} labelField="label" valueField="value" placeholder="Year" value={dobYear} onChange={(it:any)=> setDobYear(it.value)} selectedTextStyle={{ fontSize:13, color:'#101828' }} placeholderStyle={{ fontSize:13, color:'#98A2B3' }} />
            </View>
            <LabeledInput label="Occupation" value={occupation} onChangeText={setOccupation} placeholder="Occupation" />
            <LabeledDropdown label="Employment status" placeholder="Employment status" data={employmentOptions} value={employmentStatus} onChangeValue={setEmploymentStatus} />
            <LabeledMultiSelect
              label="Field(s) that best describe your work or business?"
              placeholder="Select fields"
              data={workFieldOptions}
              values={workFields}
              onChangeValues={setWorkFields}
            />
            <LabeledInput
              label="Specific field(s) that best describe your work or business?"
              value={specificFields}
              onChangeText={setSpecificFields}
              placeholder="Type a field and press Enter to add"
              multiline
              onKeyPress={(e:any)=>{
                if (e?.nativeEvent?.key === 'Enter') {
                  e.preventDefault?.();
                  const curr = specificFields.trim();
                  if (!curr) return;
                  const tokens = curr.replace(/\s*,\s*/g, ',').split(',').map(s=>s.trim()).filter(Boolean);
                  const unique = Array.from(new Set(tokens));
                  setSpecificFields(unique.join(', '));
                }
              }}
            />
            <View style={styles.chipsRow}>
              {specificFields.split(',').filter(Boolean).map((f, idx)=> (
                <View key={`${f.trim()}-${idx}`} style={styles.chip}><Text style={styles.chipText}>{f.trim()}</Text></View>
              ))}
            </View>
            <LabeledDropdown label="Marital status" placeholder="Marital status" data={maritalOptions} value={maritalStatus} onChangeValue={setMaritalStatus} />

            <Text style={styles.sectionLabel}>Add Profile Photo</Text>
            <View style={{ marginBottom:16, flexDirection:'row', alignItems:'center', gap:12 }}>
              <TouchableOpacity
                accessibilityLabel="Pick profile photo"
                onPress={async ()=>{
                  try{
                    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (status !== 'granted') { Toast.show({ type:'error', text1:'Allow photo access to continue' }); return; }
                    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing:true, aspect:[1,1], quality:1 });
                    if (result.canceled || !result.assets?.length) return;
                    const asset = result.assets[0];
                    const cropped = await ImageManipulator.manipulateAsync(asset.uri, [{ resize:{ width: 600 } }], { compress:0.8, format: ImageManipulator.SaveFormat.JPEG });
                    setLocalAvatarUri(cropped.uri);
                  } catch(e:any){ Toast.show({ type:'error', text1:'Image select failed', text2: e.message }); }
                }}
                style={[styles.photoCircle, { borderColor: '#2CA6FF', backgroundColor:'#ffffff', overflow:'hidden' }]}
              >
                {localAvatarUri ? (
                  <Image source={{ uri: localAvatarUri }} style={{ width:64, height:64, borderRadius:32 }} />
                ) : (
                  <Ionicons name="camera" size={24} color="#2CA6FF" />
                )}
              </TouchableOpacity>
              {!localAvatarUri && <Text style={{ fontSize:12, color:'#667085' }}>Tap the camera to add a photo</Text>}
            </View>
            <TouchableOpacity onPress={()=> setAgree(a=> !a)} style={styles.checkboxRow}> 
              <View style={[styles.checkboxBox, agree && styles.checkboxBoxChecked]}> 
                {agree ? <Ionicons name="checkmark" size={14} color="#fff" style={{ textAlign:'center' }} /> : null}
              </View>
              <Text style={styles.checkboxText}>I have read and agree to the <Text style={{ color:'#1679A8' }}>Privacy Policy & Terms of Use.</Text></Text>
            </TouchableOpacity>
            {error ? <Text style={{ color:'#D92D20', marginTop:6 }}>{error}</Text>: null}
            <TouchableOpacity style={[styles.primaryBtn, (!agree || submitting) && { opacity:0.5 }]} onPress={submit} disabled={!agree || submitting}>
              {submitting ? <ActivityIndicator color='#fff' /> : <Text style={styles.primaryText}>Continue</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Reusable labeled input component to keep markup leaner and enforce consistent spacing.
const LabeledInput = ({ label, subLabel, optional, style:styleProp, onKeyPress, ...rest }: any) => (
  <View style={{ marginBottom:14 }}>
    <Text style={styles.label}>{label}{optional && <Text style={{ color:'#667085', fontWeight:'400' }}> (optional)</Text>}</Text>
    {subLabel ? <Text style={styles.subLabel}>{subLabel}</Text> : null}
    <TextInput {...rest} onKeyPress={onKeyPress} style={[styles.input, styleProp]} placeholderTextColor="#98A2B3" />
  </View>
);

const LabeledDropdown = ({ label, subLabel, placeholder, data, value, onChangeValue }: {
  label: string;
  subLabel?: string;
  placeholder?: string;
  data: Array<{ label: string; value: string }>;
  value: string;
  onChangeValue: (v: string) => void;
}) => (
  <View style={{ marginBottom:14 }}>
    <Text style={styles.label}>{label}</Text>
    {subLabel ? <Text style={styles.subLabel}>{subLabel}</Text> : null}
    <Dropdown
      style={[styles.input, styles.selectInput]}
      containerStyle={{ borderRadius:12, paddingVertical:6, shadowColor:'#000', shadowOpacity:0.05, shadowRadius:8 }}
      placeholderStyle={{ color:'#98A2B3', fontSize:13 }}
      selectedTextStyle={{ color:'#101828', fontSize:13, fontWeight:'500' }}
      data={data}
      labelField="label"
      valueField="value"
      placeholder={placeholder || 'Select'}
      value={value}
      onChange={(item:any)=> { if (item && typeof item.value === 'string') onChangeValue(item.value); }}
      renderRightIcon={() => (
        <Ionicons name="chevron-down" size={18} color="#98A2B3" style={{ marginRight:8 }} />
      )}
    />
  </View>
);

// Searchable dropdown with inline text input driving suggestions
const SearchableDropdown = ({ label, subLabel, placeholder, data, value, onChangeValue, query, onChangeQuery }: {
  label: string;
  subLabel?: string;
  placeholder?: string;
  data: Array<{ label: string; value: string }>;
  value: string;
  onChangeValue: (v: string) => void;
  query: string;
  onChangeQuery: (q: string) => void;
}) => {
  const [focused, setFocused] = useState(false);
  const showMenu = focused && Array.isArray(data) && data.length > 0;
  return (
    <View style={{ marginBottom:14 }}>
      <Text style={styles.label}>{label}</Text>
      {subLabel ? <Text style={styles.subLabel}>{subLabel}</Text> : null}
      <View style={{ position:'relative' }}>
        <TextInput
          style={[styles.input, styles.searchInput]}
          placeholder={placeholder || 'Type to search'}
          placeholderTextColor="#98A2B3"
          value={query || value}
          onChangeText={onChangeQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {showMenu && (
          <View style={styles.dropdownMenu}>
            {data.map((opt, idx) => (
              <TouchableOpacity
                key={`${opt.value}-${idx}`}
                style={styles.dropdownItem}
                onPress={() => {
                  onChangeValue(opt.value);
                  onChangeQuery(opt.label);
                  setFocused(false);
                }}
              >
                <Text style={styles.dropdownItemText}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const PasswordInput = ({ label, subLabel, value, onChangeText, placeholder, secureTextEntry, onToggleSecure }: any) => (
  <View style={{ marginBottom:14 }}>
    <Text style={styles.label}>{label}</Text>
    {subLabel ? <Text style={styles.subLabel}>{subLabel}</Text> : null}
    <View style={{ position:'relative' }}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#98A2B3"
        style={[styles.input, { paddingRight:42 }]}
        secureTextEntry={secureTextEntry}
      />
      <TouchableOpacity onPress={onToggleSecure} style={{ position:'absolute', right:10, top:10 }}>
        <Ionicons name={secureTextEntry? 'eye-off' : 'eye'} size={20} color="#98A2B3" />
      </TouchableOpacity>
    </View>
  </View>
);

const LabeledMultiSelect = ({ label, subLabel, placeholder, data, values, onChangeValues }: {
  label: string;
  subLabel?: string;
  placeholder?: string;
  data: Array<{ label: string; value: string }>;
  values: string[];
  onChangeValues: (v: string[]) => void;
}) => (
  <View style={{ marginBottom:14 }}>
    <Text style={styles.label}>{label}</Text>
    {subLabel ? <Text style={styles.subLabel}>{subLabel}</Text> : null}
    <MultiSelect
      style={styles.input}
      selectedTextStyle={{ color:'#101828', fontSize:13 }}
      placeholderStyle={{ color:'#98A2B3', fontSize:13 }}
      data={data}
      labelField="label"
      valueField="value"
      placeholder={placeholder || 'Select'}
      value={values}
      onChange={(items:any)=> {
        const arr = Array.isArray(items) ? items : [items];
        const next = arr
          .filter(Boolean)
          .map((i:any) => (typeof i === 'string' ? i : i?.value))
          .filter((v:any) => typeof v === 'string');
        onChangeValues(next);
      }}
      renderRightIcon={() => (
        <Ionicons name="chevron-down" size={18} color="#98A2B3" style={{ marginRight:8 }} />
      )}
    />
    <View style={styles.chipsRow}>
      {values.map((v, idx)=> (
        <View key={`${v}-${idx}`} style={styles.chip}><Text style={styles.chipText}>{v}</Text></View>
      ))}
    </View>
  </View>
);

const PasswordRules = ({ password }: { password:string }) => (
  <View style={styles.rulesBox}>
    {passwordRules.map(r=> {
      const ok = r.test(password);
      return <Text key={r.label} style={[styles.rule, ok && styles.ruleOk]}> {ok ? '✓':'✕'} {r.label}</Text>;
    })}
  </View>
);

const styles = StyleSheet.create({
  wrap: { paddingHorizontal:28, paddingTop:24, paddingBottom:56 },
  header: { fontSize:16, fontWeight:'600', color:'#101828', marginBottom:18 },
  headerRow: { flexDirection:'row', alignItems:'center', gap:8 },
  stepsRow: { flexDirection:'row', gap:10, marginBottom:28 },
  stepSegment: { flex:1, height:4, backgroundColor:'#E4E7EC', borderRadius:2 },
  stepSegmentActive: { backgroundColor:'#2CA6FF' },
  backBtn: { width:32, height:32, justifyContent:'center', alignItems:'center', marginBottom:12, marginLeft:-4 },
  backIcon: { fontSize:30, lineHeight:30, color:'#475467' },
  label: { fontSize:12, fontWeight:'600', color:'#344054', marginBottom:6 },
  subLabel: { fontSize:11, color:'#667085', lineHeight:14, marginBottom:8 },
  input: { borderWidth:1, borderColor:'#D0D5DD', borderRadius:8, paddingHorizontal:14, height:44, backgroundColor:'#FFFFFF', fontSize:13, color:'#101828', paddingTop:0, paddingBottom:0 },
  selectInput:{ borderRadius:12 },
  searchInput:{ borderRadius:12 },
  dropdownMenu:{ position:'absolute', top:48, left:0, right:0, backgroundColor:'#fff', borderWidth:1, borderColor:'#E4E7EC', borderRadius:12, paddingVertical:6, zIndex:10, elevation:4, maxHeight:220 },
  dropdownItem:{ paddingVertical:10, paddingHorizontal:12 },
  dropdownItemText:{ fontSize:13, color:'#101828' },
  primaryBtn: { backgroundColor:'#2CA6FF', borderRadius:8, height:48, alignItems:'center', justifyContent:'center', marginTop:8 },
  primaryText: { color:'#fff', fontWeight:'600', fontSize:15 },
  helper: { fontSize:11, marginTop:4 },
  rulesBox: { marginTop:4, marginBottom:6 },
  rule: { fontSize:11, color:'#667085', lineHeight:16 },
  ruleOk: { color:'#027A48' },
  dobRow: { flexDirection:'row', gap:12, marginBottom:14 },
  dobInput: { flex:1 },
  sectionTitle: { fontSize:14, fontWeight:'700', color:'#101828', marginBottom:8, marginTop:4 },
  sectionLabel: { fontSize:12, fontWeight:'600', color:'#344054', marginBottom:6, marginTop:4 },
  chipsRow: { flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:8 },
  chip: { backgroundColor:'#EEF6FB', paddingHorizontal:12, paddingVertical:6, borderRadius:20 },
  chipText: { fontSize:11, color:'#0A6375' },
  photoCircle: { width:64, height:64, borderRadius:32, backgroundColor:'#051C2E', justifyContent:'center', alignItems:'center', borderWidth:4, borderColor:'#DDEAF2' },
  checkboxRow: { flexDirection:'row', alignItems:'flex-start', gap:10, marginTop:8, marginBottom:6 },
  checkboxBox: { width:18, height:18, borderWidth:1.4, borderColor:'#2CA6FF', borderRadius:4 },
  checkboxBoxChecked: { backgroundColor:'#2CA6FF' },
  checkboxText: { flex:1, fontSize:11.5, color:'#344054', lineHeight:16 },
});