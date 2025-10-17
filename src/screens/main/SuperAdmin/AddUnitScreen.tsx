import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, RefreshControl, ActivityIndicator, SafeAreaView, StatusBar, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URl } from '../../../api/users';
import { Ionicons } from '@expo/vector-icons';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { InteractionManager } from 'react-native';
import Toast from 'react-native-toast-message';

const PRIMARY = '#349DC5';

type UnitItem = { _id:string; name:string; ministryName?:string|null; leaderName?:string|null };

export default function AddUnitScreen(){
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [churchId, setChurchId] = useState<string>('');
  const [ministries, setMinistries] = useState<string[]>([]);
  const [ministry, setMinistry] = useState<string>('');
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showSuccess, setShowSuccess] = useState<{visible:boolean; unit?:string}>({visible:false});
  const [role, setRole] = useState<string>('');

  const loadProfileAndChurch = useCallback(async()=>{
    try {
      const token = await AsyncStorage.getItem('token');
      if(!token) throw new Error('Missing token');
      const me = await axios.get(`${BASE_URl}/api/users/me`, { headers:{ Authorization:`Bearer ${token}` }});
      const u = me.data?.user;
      setRole(u?.activeRole||'');
      const cid = u?.church?._id || u?.church;
      if(!cid){ throw new Error('Active church not set. Ask a multi SuperAdmin to set church context.'); }
      setChurchId(String(cid));
      // fetch ministries for this church
      try {
        const ch = await axios.get(`${BASE_URl}/api/churches/${cid}`, { headers:{ Authorization:`Bearer ${token}` } });
        const mins: string[] = (ch.data?.church?.ministries||[]).map((m:any)=>m.name).filter(Boolean);
        setMinistries(mins);
        if(mins.length && !ministry) setMinistry(mins[0]);
      } catch(e:any){
        // fallback: try public list
        const pub = await axios.get(`${BASE_URl}/api/churches/public`);
        const church = (pub.data?.churches||[]).find((c:any)=> String(c._id)===String(cid));
        const mins: string[] = (church?.ministries||[]).map((m:any)=>m.name).filter(Boolean);
        setMinistries(mins);
        if(mins.length && !ministry) setMinistry(mins[0]);
      }
    } finally {
      // leave loading until units load
    }
  }, [ministry]);

  const loadUnits = useCallback(async()=>{
    if(!churchId) return;
    try {
      const token = await AsyncStorage.getItem('token');
      if(!token) return;
      const params = new URLSearchParams();
      params.append('churchId', churchId);
      if(ministry) params.append('ministry', ministry);
      const res = await axios.get(`${BASE_URl}/api/units?${params.toString()}`, { headers:{ Authorization:`Bearer ${token}` }});
      const list: UnitItem[] = (res.data?.units||[]).map((u:any)=>({ _id:u._id, name:u.name, ministryName:u.ministryName||null, leaderName:u.leaderName||null }));
      setUnits(list);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [churchId, ministry]);

  useEffect(()=>{
    const task = InteractionManager.runAfterInteractions(()=>{ (async()=>{ await loadProfileAndChurch(); await loadUnits(); })(); });
    return ()=> task.cancel();
  }, [loadProfileAndChurch, loadUnits]);

  useEffect(()=>{ if(churchId){ setLoading(true); loadUnits(); } }, [churchId, ministry, loadUnits]);

  const onRefresh = ()=>{ setRefreshing(true); loadUnits(); };

  const existingNamesCI = useMemo(()=> new Set(units.map(u=>u.name.trim().toLowerCase())), [units]);
  const suggestions = useMemo(()=>{
    const t = name.trim().toLowerCase();
    if(!t) return [] as string[];
    const pool = Array.from(new Set(units.map(u=>u.name)));
    return pool.filter(n=> n.toLowerCase().startsWith(t) && n.toLowerCase()!==t).slice(0,6);
  }, [name, units]);

  const canSubmit = !!ministry && !!name.trim() && !existingNamesCI.has(name.trim().toLowerCase());

  const submit = async()=>{
    if(!canSubmit || !churchId) return;
    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if(!token) throw new Error('Missing token');
      const payload = { name: name.trim(), ministryName: ministry, churchId };
      const res = await axios.post(`${BASE_URl}/api/units`, payload, { headers:{ Authorization:`Bearer ${token}` }});
      if(res.data?.ok){
        setShowSuccess({ visible:true, unit: name.trim() });
        setName('');
        await loadUnits();
      }
    } catch(e:any){
      const msg = e?.response?.data?.message || e?.message || 'Failed to create unit';
      Toast.show({ type:'error', text1:'Create Unit failed', text2: msg });
    } finally { setSubmitting(false); }
  };

  const header = (
    <View style={styles.header}>
      <Text style={styles.title}>Add Unit</Text>
      <Text style={styles.subtitle}>Create a new unit under your church and ministry.</Text>
      <View style={styles.pillRow}>
        <TouchableOpacity onPress={()=> setShowPicker(v=>!v)} style={styles.pill}>
          <Ionicons name="business" color={PRIMARY} size={16} />
          <Text style={styles.pillText}>{ministry? `Ministry: ${ministry}` : 'Select Ministry'}</Text>
          <Ionicons name={showPicker? 'chevron-up' : 'chevron-down'} color={PRIMARY} size={16} />
        </TouchableOpacity>
        {ministry ? (
          <TouchableOpacity onPress={()=> setMinistry('')} style={[styles.pill, { backgroundColor:'#eef2f7' }]}> 
            <Ionicons name="close" color={PRIMARY} size={16} />
            <Text style={[styles.pillText, { color:'#14234b' }]}>Clear</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {showPicker && (
        <View style={styles.pickerBox}>
          {ministries.length? ministries.map(m => (
            <TouchableOpacity key={m} onPress={()=>{ setMinistry(m); setShowPicker(false); }} style={styles.pickerItem}>
              <Text style={styles.pickerText}>{m}</Text>
            </TouchableOpacity>
          )) : (<View style={styles.pickerItem}><Text style={styles.pickerTextDim}>No ministries found</Text></View>)}
        </View>
      )}
      <View style={styles.inputRow}>
        <TextInput
          placeholder="Enter unit name"
          placeholderTextColor="#9CA3AF"
          value={name}
          onChangeText={setName}
          style={styles.input}
          autoCapitalize="words"
        />
        <TouchableOpacity disabled={!canSubmit || submitting} onPress={submit} style={[styles.addBtn, (!canSubmit||submitting)&&{opacity:0.5}]}> 
          {submitting? <ActivityIndicator color="#fff"/> : <Text style={styles.addText}>Add</Text>}
        </TouchableOpacity>
      </View>
      {!!name.trim() && existingNamesCI.has(name.trim().toLowerCase()) && (
        <Text style={styles.warn}>A unit with this name already exists in {ministry}.</Text>
      )}
      {suggestions.length>0 && (
        <View style={styles.suggestionBox}>
          {suggestions.map(s => (
            <TouchableOpacity key={s} onPress={()=> setName(s)} style={styles.suggestionItem}>
              <Ionicons name="sparkles" size={14} color={PRIMARY} /><Text style={styles.suggestionText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <KeyboardAvoidingView behavior={Platform.select({ ios:'padding', android: undefined })} style={{ flex:1 }}>
        {loading && !refreshing ? (
          <View style={styles.center}> 
            <ActivityIndicator size="large" color={PRIMARY} />
            <Text style={{ color:PRIMARY, marginTop:8 }}>Loading…</Text>
          </View>
        ) : (
          <>
            {header}
            <Text style={styles.sectionTitle}>Existing Units {ministry? `in ${ministry}`: ''}</Text>
            <FlatList
              data={units}
              keyExtractor={u=>u._id}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PRIMARY]} tintColor={PRIMARY} />}
              renderItem={({item}) => (
                <View style={styles.unitCard}>
                  <Text style={styles.unitName}>{item.name}</Text>
                  {!!item.leaderName && <Text style={styles.unitMeta}>Leader: <Text style={{ color:PRIMARY, fontWeight:'700' }}>{item.leaderName}</Text></Text>}
                </View>
              )}
              contentContainerStyle={{ paddingHorizontal:16, paddingBottom: hp(10) }}
              ListEmptyComponent={<Text style={styles.dim}>No units found.</Text>}
            />
          </>
        )}
      </KeyboardAvoidingView>

      <Modal visible={showSuccess.visible} transparent animationType="fade" onRequestClose={()=> setShowSuccess({visible:false})}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Ionicons name="checkmark-circle" size={48} color="#10B981" />
            <Text style={styles.modalTitle}>Unit Created</Text>
            <Text style={styles.modalText}>“{showSuccess.unit}” has been added successfully.</Text>
            <TouchableOpacity onPress={()=> setShowSuccess({visible:false})} style={[styles.okBtn, { backgroundColor: PRIMARY }]}>
              <Text style={styles.okText}>Great</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:'#F8F9FA' },
  header:{ paddingHorizontal:16, paddingTop: hp(4), paddingBottom:10, backgroundColor:'#fff', borderBottomWidth:1, borderBottomColor:'#e6e9ef' },
  title:{ fontSize:18, fontWeight:'700', color:'#14234b' },
  subtitle:{ color:'#475569', marginTop:4 },
  pillRow:{ flexDirection:'row', alignItems:'center', marginTop:12 },
  pill:{ flexDirection:'row', alignItems:'center', backgroundColor:'#E8F0FE', paddingVertical:8, paddingHorizontal:12, borderRadius:999, marginRight:10, borderWidth:1, borderColor:'#cfe0ff' },
  pillText:{ marginHorizontal:6, color:PRIMARY, fontWeight:'700' },
  pickerBox:{ marginTop:10, backgroundColor:'#fff', marginHorizontal:0, borderRadius:10, borderWidth:1, borderColor:'#e6e9ef', overflow:'hidden' },
  pickerItem:{ paddingVertical:12, paddingHorizontal:14, borderBottomWidth:StyleSheet.hairlineWidth, borderBottomColor:'#eaeaea' },
  pickerText:{ color:'#223', fontSize:14 },
  pickerTextDim:{ color:'#8a8a8a' },
  inputRow:{ flexDirection:'row', alignItems:'center', marginTop:12 },
  input:{ flex:1, backgroundColor:'#F1F3F5', borderRadius:10, paddingVertical:10, paddingHorizontal:12, fontSize:15, color:'#111827', borderWidth:1, borderColor:'#E5E7EB' },
  addBtn:{ marginLeft:10, backgroundColor:PRIMARY, paddingVertical:12, paddingHorizontal:16, borderRadius:10, alignItems:'center', justifyContent:'center' },
  addText:{ color:'#fff', fontWeight:'700' },
  warn:{ color:'#b91c1c', marginTop:6 },
  suggestionBox:{ marginTop:8, backgroundColor:'#fff', borderRadius:10, borderWidth:1, borderColor:'#e6e9ef', overflow:'hidden' },
  suggestionItem:{ flexDirection:'row', alignItems:'center', paddingVertical:10, paddingHorizontal:12, gap:6, borderBottomWidth:StyleSheet.hairlineWidth, borderBottomColor:'#f1f5f9' },
  suggestionText:{ color:'#14234b', marginLeft:6 },

  sectionTitle:{ marginTop:12, marginBottom:6, paddingHorizontal:16, color:'#6B7280', fontWeight:'600' },
  unitCard:{ backgroundColor:'#fff', borderRadius:12, padding:14, marginBottom:12, borderWidth:1, borderColor:'#e6e9ef', shadowColor:'#000', shadowOpacity:0.05, shadowRadius:6, elevation:1 },
  unitName:{ fontWeight:'700', color:'#14234b', fontSize:15 },
  unitMeta:{ color:'#475569', marginTop:3 },
  dim:{ textAlign:'center', marginTop:20, color:'#64748B' },
  center:{ flex:1, alignItems:'center', justifyContent:'center' },
  modalBackdrop:{ flex:1, backgroundColor:'rgba(0,0,0,0.35)', alignItems:'center', justifyContent:'center', padding:24 },
  modalCard:{ backgroundColor:'#fff', borderRadius:14, padding:18, width:'85%', alignItems:'center' },
  modalTitle:{ fontSize:18, fontWeight:'700', marginTop:8, color:'#0f172a' },
  modalText:{ color:'#334155', marginTop:6, textAlign:'center' },
  okBtn:{ marginTop:12, paddingVertical:10, paddingHorizontal:22, borderRadius:10 },
  okText:{ color:'#fff', fontWeight:'700' }
});
