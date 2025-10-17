import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, SafeAreaView, StatusBar, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URl } from '../../../api/users';
import { AppEventBus } from '../../../components/AppBootstrapGate';
import Toast from 'react-native-toast-message';
import ModernLoader from '../../../loader/load';

interface ChurchEntry {
  _id: string;
  name: string;
  superAdmins: { _id:string; firstName:string; surname:string }[];
  ministryAdmins?: { _id:string; firstName:string; surname:string }[];
  unitLeaders?: { _id:string; firstName:string; surname:string }[];
}

export default function ChurchSwitchScreen(){
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [churches, setChurches] = useState<ChurchEntry[]>([]);
  const [switching, setSwitching] = useState<string|null>(null);
  const PRIMARY_BLUE = '#349DC5';
  const [q, setQ] = useState('');

  const load = useCallback(async()=>{
    setError(null);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) { setError('Missing authentication. Please log in again.'); return; }
      const res = await axios.get(`${BASE_URl}/api/superadmins/churches`,{ headers:{ Authorization:`Bearer ${token}` }});
      if(res.data?.ok) setChurches(res.data.churches||[]); else setError('Failed to load');
    } catch(e:any){
      if (e?.response?.status === 403) setError('Only multi SuperAdmins can switch church.');
      else if (e?.response?.status === 404) setError('This feature is not available on the server (404).');
      else setError(e?.response?.data?.message||e.message);
    }
    finally { setLoading(false); setRefreshing(false); }
  },[]);

  useEffect(()=>{ load(); },[load]);

  const onRefresh = ()=>{ setRefreshing(true); load(); };

  const filtered = useMemo(()=>{
    if(!q.trim()) return churches;
    const term = q.trim().toLowerCase();
    return churches.filter(ch => {
      const inName = ch.name.toLowerCase().includes(term);
      const inSupers = (ch.superAdmins||[]).some(s => (`${s.firstName} ${s.surname}`).toLowerCase().includes(term));
      const inMinAdmins = (ch.ministryAdmins||[]).some(m => (`${m.firstName} ${m.surname}`).toLowerCase().includes(term));
      return inName || inSupers || inMinAdmins;
    });
  }, [q, churches]);

  const switchChurch = async (id:string)=>{
    setSwitching(id);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) { setError('Missing authentication. Please log in again.'); return; }
      const res = await axios.post(`${BASE_URl}/api/superadmins/switch-church`,{ churchId:id },{ headers:{ Authorization:`Bearer ${token}` }});
      if(res.data?.ok){
        // Optionally store last church ID
        try { await AsyncStorage.setItem('lastChurchId', String(res.data.churchId)); } catch {}
        // Trigger a profile refresh so header/metrics update immediately
        AppEventBus.emit('profileRefreshed');
        // Smooth feedback and go back
        Toast.show({ type: 'success', text1: 'Context switched', text2: 'Church context updated' });
        // Navigate back if possible after a short delay
        setTimeout(() => {
          // We don't have navigation here by prop; rely on the screen stack to go back via gesture/back button.
          // If needed, this screen can be enhanced to accept navigation prop.
        }, 250);
      }
    } catch(e:any) {
      const msg = e?.response?.data?.message || (e?.response?.status===404? 'Server does not support church switching yet (404).' : e?.message);
      Toast.show({ type: 'error', text1: 'Switch failed', text2: msg });
    }
    finally { setSwitching(null); }
  };

  if(loading) return (
    <SafeAreaView style={[styles.container, { backgroundColor:'#F8F9FA' }]}> 
  <StatusBar barStyle="dark-content" />
      <View style={{ paddingTop: 20 }}>
        <ModernLoader fullscreen={false} spinnerSize={70} ringWidth={7} logoSize={42} />
      </View>
    </SafeAreaView>
  );
  if(error) return (
    <SafeAreaView style={[styles.container, { backgroundColor:'#F8F9FA' }]}> 
  <StatusBar barStyle="dark-content" />
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <TouchableOpacity style={[styles.retry, { backgroundColor: PRIMARY_BLUE }]} onPress={()=>{ setLoading(true); load(); }}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor:'#F8F9FA' }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <Text style={[styles.header, { color:'#00204a' }]}>Switch Church Context</Text>
      <View style={styles.searchRow}>
        <TextInput
          placeholder="Search churches, superadmins, ministry admins"
          placeholderTextColor="#9CA3AF"
          style={styles.searchInput}
          value={q}
          onChangeText={setQ}
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={c=>c._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({item})=>{
          return (
            <View style={styles.card}>
              <Text style={styles.churchName}>{item.name}</Text>
              <Text style={styles.sectionTitle}>Super Admins</Text>
              <Text numberOfLines={1} ellipsizeMode="tail" style={styles.listLine}>
                {item.superAdmins?.length ? item.superAdmins.map(s=>`${s.firstName} ${s.surname}`).join(', ') : '—'}
              </Text>
              <Text style={styles.sectionTitle}>Ministry Admins</Text>
              <Text numberOfLines={1} ellipsizeMode="tail" style={styles.listLine}>
                {item.ministryAdmins && item.ministryAdmins.length ? item.ministryAdmins.map(m=>`${m.firstName} ${m.surname}`).join(', ') : '_'}
              </Text>
              <TouchableOpacity style={[styles.switchBtn, { backgroundColor: PRIMARY_BLUE }]} onPress={()=>switchChurch(item._id)} disabled={!!switching}>
                {switching===item._id? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.switchText}>Switch to this Church</Text>}
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.dim}>No churches found.</Text>}
        contentContainerStyle={{ paddingVertical:16 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:'#F8F9FA', paddingHorizontal:16, paddingTop:16 },
  header:{ fontSize:20, fontWeight:'700', marginBottom:12, color:'#1f2d3d' },
  searchRow:{ flexDirection:'row', alignItems:'center', marginBottom:12 },
  searchInput:{ flex:1, backgroundColor:'#F1F3F5', borderRadius:10, paddingVertical:10, paddingHorizontal:12, fontSize:14, color:'#111827', borderWidth:1, borderColor:'#E5E7EB' },
  card:{ backgroundColor:'#fff', borderRadius:12, padding:16, marginBottom:16, shadowColor:'#000', shadowOpacity:0.06, shadowRadius:8, elevation:2, borderColor:'#e6e9ef', borderWidth:1 },
  churchName:{ fontSize:18, fontWeight:'600', marginBottom:8, color:'#223' },
  sectionTitle:{ fontSize:13, fontWeight:'600', marginTop:8, color:'#59708a' },
  listLine:{ fontSize:14, color:'#243949', marginTop:2 },
  switchBtn:{ marginTop:14, backgroundColor:'#349DC5', paddingVertical:12, borderRadius:8, alignItems:'center' },
  switchText:{ color:'#fff', fontWeight:'600', fontSize:15 },
  center:{ flex:1, justifyContent:'center', alignItems:'center', padding:24 },
  error:{ color:'#b91c1c', fontSize:15, marginBottom:12, textAlign:'center' },
  retry:{ backgroundColor:'#349DC5', paddingHorizontal:22, paddingVertical:10, borderRadius:8 },
  retryText:{ color:'#fff', fontWeight:'600' },
  dim:{ color:'#5d6d7e', marginTop:8 }
});
