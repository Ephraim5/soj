import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, SafeAreaView, StatusBar, TouchableOpacity, StyleSheet, FlatList, TextInput, RefreshControl, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import ModernLoader from '../../../loader/load';
// (Removed responsive height dependency for fixed filter bar height)

interface WorkPlanSummary {
  _id:string; title:string; status:string; startDate?:string; endDate?:string; progressPercent?:number; reviewRating?:number; rejectionReason?:string; successRate?:number; successCategory?:'low'|'good'|'perfect';
  unit?: { name:string } | null;
  owner?: { firstName?:string; surname?:string } | null;
  plans?: { activities?: any[] }[];
  generalGoal?: string;
}

const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'https://streamsofjoyumuahia-api.onrender.com';

const statusColors: Record<string,string> = { draft:'#64748b', pending:'#f59e0b', approved:'#0f766e', rejected:'#dc2626', ignored:'#475569', completed:'#6366f1' };

const filters = [
  { key:'all', label:'All' },
  { key:'pending', label:'Pending' },
  { key:'approved', label:'Approved' },
  { key:'completed', label:'Completed' },
  { key:'rejected', label:'Rejected' },
  { key:'ignored', label:'Ignored' },
];

const AdminWorkPlansListScreen: React.FC = () => {
  const nav = useNavigation<any>();
  const [items, setItems] = useState<WorkPlanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('pending');
  const [q, setQ] = useState(''); // raw backend q (title only) fallback
  const [searchValue, setSearchValue] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async ()=>{
    setLoading(true); setError(null);
    try {
      const token = await AsyncStorage.getItem('token');
      if(!token) throw new Error('Missing auth token');
      const params = new URLSearchParams();
      if(activeFilter !== 'all') params.append('status', activeFilter);
      if(q) params.append('q', q);
      const resp = await fetch(`${API_BASE}/api/workplans?${params.toString()}`, { headers:{ Authorization:`Bearer ${token}` } });
      if(!resp.ok){ const t = await resp.text(); throw new Error(`Fetch failed (${resp.status}) ${t}`); }
      const json = await resp.json();
      if(!json.ok) throw new Error(json.error||'Failed');
      setItems(json.items||[]);
    } catch(e:any){ setError(e.message); }
    finally { setLoading(false); }
  }, [activeFilter, q]);

  useEffect(()=>{ load(); },[load]);

  // Advanced search: match year, month (english short/full), title substring, general goal substring, unit name, leader name
  const monthMap: Record<string, number> = {
    jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,sept:8,oct:9,nov:10,dec:11
  };
  const searchTokens = searchValue.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const filtered = useMemo(()=> {
    if(!searchTokens.length) return items;
    return items.filter(it => {
      const title = (it.title||'').toLowerCase();
      const goal = (it.generalGoal||'').toLowerCase();
      const unitName = (it.unit?.name||'').toLowerCase();
      const leaderName = ((it.owner?.firstName||'') + ' ' + (it.owner?.surname||'')).trim().toLowerCase();
      // derive year/month from dates
      let year:string|undefined; let month:number|undefined;
      if(it.startDate){ const d = new Date(it.startDate); year = String(d.getFullYear()); month = d.getMonth(); }
      return searchTokens.every(tok => {
        if(/^[0-9]{4}$/.test(tok)) return year === tok; // year
        if(monthMap[tok] !== undefined) return month === monthMap[tok]; // month match
        return title.includes(tok) || goal.includes(tok) || unitName.includes(tok) || leaderName.includes(tok);
      });
    });
  }, [items, searchTokens]);

  const onSubmitSearch = () => { setQ(searchValue.trim()); /* backend still filters title if q */ };
  const clearSearch = () => { setSearchValue(''); setQ(''); };

  const onRefresh = useCallback(async ()=>{ setRefreshing(true); await load(); setRefreshing(false); },[load]);

  const renderItem = ({ item }: { item: WorkPlanSummary }) => {
    const hasDates = item.startDate && item.endDate;
    const displayedTitle = hasDates ? `${new Date(item.startDate as string).toLocaleString('default',{ month:'short'})} ${new Date(item.startDate as string).getFullYear()} – ${new Date(item.endDate as string).toLocaleString('default',{ month:'short'})} ${new Date(item.endDate as string).getFullYear()} Work Plan` : item.title;
  const plansCount = item.plans ? item.plans.length : 0;
    const activitiesCount = item.plans ? item.plans.reduce((a,p)=> a + (p.activities? p.activities.length:0), 0) : 0;
    const leaderName = ((item.owner?.firstName||'') + ' ' + (item.owner?.surname||'')).trim();
    return (
      <TouchableOpacity style={styles.card} onPress={()=> nav.navigate('AdminViewWorkPlan', { id: item._id })}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>{displayedTitle}</Text>
          <View style={[styles.statusChip, { backgroundColor: statusColors[item.status] || '#334155' }]}><Text style={styles.statusText}>{item.status}</Text></View>
        </View>
        <Text style={styles.submittedLine}>
          {`${itDate(item.startDate)} | Unit: ${item.unit?.name.toString() || '—'}${leaderName ? ' • Leader: ' + leaderName.toString() : ''}`}
        </Text>
        {!!item.generalGoal && <Text style={styles.goalLine} numberOfLines={2}>{item.generalGoal}</Text>}
        <View style={styles.countsRow}>
          <View style={styles.countChip}><Text style={styles.countChipText}>Plans: {plansCount}</Text></View>
          <View style={styles.countChip}><Text style={styles.countChipText}>Activities: {activitiesCount}</Text></View>
          <View style={styles.progressPill}><Text style={styles.progressPillText}>{item.progressPercent ?? 0}%</Text></View>
        </View>
        <View style={{ flexDirection:'row', alignItems:'center', marginTop:8 }}>
          {typeof item.successRate === 'number' ? (
            <>
              {Array.from({ length:5 }).map((_,i)=>{
                const val = (item.successRate||0)/20;
                const full = val >= i+1;
                const half = !full && val >= i+0.5;
                return <Ionicons key={i} name={full? 'star' : half? 'star-half' : 'star-outline'} size={14} color={full||half? '#6366f1':'#cbd5e1'} style={{ marginRight:2 }} />;
              })}
              <Text style={{ marginLeft:4, fontSize:11, fontWeight:'600', color:'#0f172a' }}>{item?.successRate}%</Text>
            </>
          ) : typeof item.reviewRating === 'number' && item.reviewRating > 0 ? (
            <>
              {Array.from({ length:5 }).map((_,i)=>{
                const filled = i + 1 <= Math.round(item.reviewRating||0);
                return <Ionicons key={i} name={filled? 'star' : 'star-outline'} size={14} color={filled? '#fbbf24':'#cbd5e1'} style={{ marginRight:2 }} />;
              })}
              <Text style={{ marginLeft:4, fontSize:11, fontWeight:'600', color:'#0f172a' }}>{item.reviewRating.toFixed(1)}</Text>
            </>
          ) : null}
        </View>
        {item.status==='rejected' && item.rejectionReason && (
          <View style={styles.rejectCard}>
            <Ionicons name="alert-circle" size={14} color="#b91c1c" style={{ marginRight:6, marginTop:1 }} />
            <View style={{ flex:1 }}>
              <Text style={styles.rejectLabel}>Rejected</Text>
              <Text style={styles.rejectReason} numberOfLines={3}>{item.rejectionReason}</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { flex:1 }]}>  {/* ensure full height so FlatList can measure correctly */}
      <StatusBar barStyle="dark-content" />
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={()=> nav.goBack()} style={{ padding:4 }}>
          <Ionicons name="chevron-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Work Plans</Text>
        <View style={{ width:40 }} />
      </View>
      {/* Search Box */}
      <View style={[styles.searchRow, filtered.length === 0 ? { marginTop:12 } : null]}>
        <Ionicons name="search" size={18} color="#64748b" />
        <TextInput
          placeholder="Search work plans"
          style={styles.searchInput}
          value={searchValue}
          onChangeText={setSearchValue}
          onSubmitEditing={onSubmitSearch}
          returnKeyType="search"
        />
        {searchValue.length > 0 && (
          <TouchableOpacity onPress={clearSearch} style={{ padding:4 }}>
            <Ionicons name="close-circle" size={18} color="#64748b" />
          </TouchableOpacity>
        )}
      </View>
      {/* Fixed-height Filter Bar */}
      <View style={styles.filterBarWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContent}
        >
          {filters.map(f => {
            const active = activeFilter === f.key;
            return (
              <TouchableOpacity key={f.key} onPress={()=> setActiveFilter(f.key)} style={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
      {loading && <View style={{ paddingTop:30 }}><ModernLoader fullscreen={false} /></View>}
      {error && !loading && <Text style={styles.errorText}>{error}</Text>}
      {!loading && filtered.length === 0 && !error && (
        <View style={styles.emptyWrap}>
          <Ionicons name="document-outline" size={46} color="#94a3b8" />
          <Text style={styles.emptyTitle}>No work plans</Text>
          <Text style={styles.emptyDesc}>Nothing to review in this filter.</Text>
        </View>
      )}
      {filtered.length > 0 && (
        <FlatList
          style={{ flex:1 }}
          data={filtered}
          keyExtractor={i=> i._id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: 90 }]} // extra bottom space so last card fully visible above nav/tab bars
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListFooterComponent={<View style={{ height: 24 }} />}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

// Helper: format submitted / start date nicely (fallback to start date)
function itDate(start?: string){
  if(!start) return '—';
  try { return `Start: ${new Date(start).toLocaleDateString(undefined,{ day:'numeric', month:'short', year:'numeric'})}`; } catch { return '—'; }
}

const styles = StyleSheet.create({
  safe:{ flexGrow:1, backgroundColor:'#fff' },
  headerRow:{ flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingVertical:12, borderBottomWidth:StyleSheet.hairlineWidth, borderBottomColor:'#e2e8f0' },
  headerTitle:{ flex:1, textAlign:'center', fontSize:16, fontWeight:'700' },
  searchRow:{ flexDirection:'row', alignItems:'center', marginHorizontal:16, marginTop:8, borderWidth:1, borderColor:'#d0d7df', borderRadius:10, paddingHorizontal:12, backgroundColor:'#f8fafc' },
  searchInput:{ flex:1, paddingVertical:10, paddingHorizontal:8, fontSize:14 },
  filterBarWrap:{ height:54, borderBottomWidth:StyleSheet.hairlineWidth, borderBottomColor:'#e2e8f0', backgroundColor:'#fff' },
  chipsContent:{ flexDirection:'row', alignItems:'center', paddingHorizontal:12, paddingVertical:8 },
  chip:{ minWidth:64, height:30, paddingHorizontal:12, maxHeight:30, paddingVertical:4, justifyContent:'center', alignItems:'center', borderRadius:15, backgroundColor:'#f1f5f9', marginRight:8 },
  chipActive:{ backgroundColor:'#349DC5' },
  chipText:{ fontSize:13, fontWeight:'500', color:'#475569', textAlign:'center' },
  chipTextActive:{ color:'#fff' },
  emptyWrap:{ flexGrow:1, alignItems:'center', justifyContent:'center', paddingHorizontal:32, paddingTop:40 },
  list:{ paddingHorizontal:16, paddingTop:12 },
  card:{ backgroundColor:'#fff', borderWidth:1, borderColor:'#dbe3ef', borderRadius:10, padding:14, marginBottom:12 },
  cardHeaderRow:{ flexDirection:'row', alignItems:'center' },
  cardTitle:{ flex:1, fontSize:14, fontWeight:'700', color:'#0f172a', paddingRight:8 },
  statusChip:{ paddingHorizontal:10, paddingVertical:6, borderRadius:14 },
  statusText:{ color:'#fff', fontSize:11, fontWeight:'600', textTransform:'capitalize' },
  metaRow:{ flexDirection:'row', marginTop:10 },
  metaText:{ fontSize:11, fontWeight:'600', color:'#334155' },
  ratingLine:{ fontSize:11, fontWeight:'600', color:'#0f172a', marginTop:6 },
  rejectReason:{ fontSize:11, color:'#b91c1c', marginTop:6 },
  rejectCard:{ flexDirection:'row', backgroundColor:'#fef2f2', borderWidth:1, borderColor:'#fecaca', padding:10, borderRadius:10, marginTop:8 },
  rejectLabel:{ fontSize:11, fontWeight:'700', color:'#b91c1c', marginBottom:2, textTransform:'uppercase' },
  // removed duplicate emptyWrap definition below (kept the one with paddingTop above)
  emptyTitle:{ fontSize:16, fontWeight:'700', marginTop:20, color:'#0f172a' },
  emptyDesc:{ fontSize:13, color:'#64748b', marginTop:6 },
  submittedLine:{ marginTop:6, fontSize:11, color:'#475569' },
  submittedLabel:{ fontWeight:'600', color:'#0f172a' },
  leaderName:{ color:'#0f172a' },
  goalLine:{ marginTop:6, fontSize:12, color:'#334155', lineHeight:16 },
  countsRow:{ flexDirection:'row', alignItems:'center', marginTop:10, flexWrap:'wrap' },
  countChip:{ backgroundColor:'#eef2f6', paddingHorizontal:10, paddingVertical:6, borderRadius:14, marginRight:8, marginTop:6 },
  countChipText:{ fontSize:11, fontWeight:'600', color:'#0f172a' },
  progressPill:{ backgroundColor:'#349DC5', paddingHorizontal:10, paddingVertical:6, borderRadius:14, marginLeft:'auto' },
  progressPillText:{ fontSize:11, fontWeight:'700', color:'#fff' },
  errorText:{ margin:16, color:'#dc2626' }
});

export default AdminWorkPlansListScreen;
