import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity, FlatList, ScrollView, Pressable, RefreshControl, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadLocalDrafts, removeLocalDraft } from './localDrafts';
import { heightPercentageToDP } from 'react-native-responsive-screen';
import Toast from 'react-native-toast-message';
import ModernLoader from '../../loader/load';

interface WorkPlanSummary {
  _id: string;
  title: string;
  status: string; // draft|pending|approved|rejected|ignored|completed
  // owner can arrive as just an id (draft/local) or a populated object from backend
  owner?: string | { _id: string; firstName?: string; surname?: string };
  progressPercent?: number;
  startDate?: string;
  endDate?: string;
  generalGoal?: string;
  plans?: { activities?: any[] }[]; // for counts if backend already returns
  local?: boolean;
  successRate?: number;
  successCategory?: 'low'|'good'|'perfect';
}

const statusColors: Record<string, string> = {
  draft: '#64748b',
  pending: '#f59e0b',
  approved: '#0f766e',
  rejected: '#dc2626',
  ignored: '#475569',
  completed: '#6366f1'
};

const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'https://streamsofjoyumuahia-api.onrender.com';

const WorkPlansListScreen: React.FC = () => {
  const nav = useNavigation<any>();
  const [items, setItems] = useState<WorkPlanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'past' | 'pending' | 'approved' | 'rejected' | 'ignored' | 'completed'>('all');
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [refreshing, setRefreshing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WorkPlanSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | undefined>();
  const [canCreate, setCanCreate] = useState<boolean>(false);

  const today = useMemo(() => new Date(), []);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Toast.show({ type: "error", text1: 'Please sign in Again unable to authorize you' });
        nav.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
        return;
      }
      // Load user (for ownership check) once
      if (!currentUserId) {
        try {
          const rawUser = await AsyncStorage.getItem('user');
          if (rawUser) { const u = JSON.parse(rawUser); setCurrentUserId(u?._id); }
        } catch { }
      }
      // Provide active unit header for backend scoping (derive from stored user roles / activeRole)
      let activeUnitId: string | null = null;
      try {
        const rawUser = await AsyncStorage.getItem('user');
        if(rawUser){
          const u = JSON.parse(rawUser);
          // match activeRole first
          if(u?.roles && u.activeRole){
            const roleMatch = u.roles.find((r:any) => r.role === u.activeRole && r.unit);
            if(roleMatch) activeUnitId = roleMatch.unit;
          }
          // fallback first UnitLeader role
          if(!activeUnitId && u?.roles){
            const leader = u.roles.find((r:any) => r.role === 'UnitLeader' && r.unit);
            if(leader) activeUnitId = leader.unit;
          }
        }
      } catch {}
      const resp = await fetch(`${API_BASE}/api/workplans`, { headers: { Authorization: `Bearer ${token}`, ...(activeUnitId? { 'x-active-unit': activeUnitId }: {}) } });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`Fetch failed (${resp.status}) ${txt}`);
      }
      const json = await resp.json();
      if (!json.ok) throw new Error(json.error || 'Failed to load');
      const remote: WorkPlanSummary[] = json.items || [];
      const drafts = await loadLocalDrafts();
      const localOnes: WorkPlanSummary[] = drafts.map(d => ({
        _id: d.id,
        title: d.title || 'Untitled Draft',
        status: 'draft',
        owner: d.owner,
        startDate: d.startDate || undefined,
        endDate: d.endDate || undefined,
        generalGoal: d.generalGoal,
        plans: d.plans,
        local: true
      }));
      setItems([...localOnes, ...remote]);
    } catch (e: any) {
      setError(e.message);
    } finally { setLoading(false); }
  }, [currentUserId]);

  useEffect(() => { load(); }, [load]);

  // Load role and if SuperAdmin redirect to admin review list
  useEffect(()=>{
    (async ()=>{
      try {
        const raw = await AsyncStorage.getItem('user');
        if(raw){
          const u = JSON.parse(raw);
          setUserRole(u?.activeRole);
          // Gate create button by duty when Member: require CreateWorkPlan duty for active unit
          if(u?.activeRole === 'SuperAdmin' || u?.activeRole === 'UnitLeader'){
            setCanCreate(true);
          } else if (u?.activeRole === 'Member') {
            let activeUnitId: string | null = null;
            if(u?.roles){
              const match = u.roles.find((r:any)=> r.role === u.activeRole && r.unit);
              if(match) activeUnitId = String(match.unit);
            }
            const role = (u?.roles||[]).find((r:any)=> String(r.unit) === String(activeUnitId) && (r.role==='Member' || r.role==='UnitLeader'));
            const duties = role?.duties || [];
            setCanCreate(duties.includes('CreateWorkPlan'));
          } else {
            setCanCreate(false);
          }
          if(u?.activeRole === 'SuperAdmin'){
            // Redirect to admin list screen
            nav.reset({ index:0, routes:[{ name:'AdminWorkPlansList' as any }] });
          }
        }
      } catch {}
    })();
  },[]);

  const filteredItems = useMemo(() => {
    if (!items.length) return [];
    if (activeFilter === 'pending') return items.filter(i => i.status === 'pending');
    if (activeFilter === 'approved') return items.filter(i => i.status === 'approved');
    if (activeFilter === 'rejected') return items.filter(i => i.status === 'rejected');
  if (activeFilter === 'ignored') return items.filter(i => i.status === 'ignored');
  if (activeFilter === 'completed') return items.filter(i => i.status === 'completed');
    if (activeFilter === 'active') return items.filter(i => {
      if (!i.startDate || !i.endDate) return false;
      const sd = new Date(i.startDate); const ed = new Date(i.endDate);
      return i.status === 'approved' && sd <= today && ed >= today;
    });
    if (activeFilter === 'past') return items.filter(i => {
      if (!i.endDate) return false;
      const ed = new Date(i.endDate);
      return i.status === 'approved' && ed < today;
    });
    return items; // all
  }, [items, activeFilter, today]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const doDelete = async (id: string) => {
    try {
      setDeleting(true);
      if (id.startsWith('local_')) {
        await removeLocalDraft(id);
        setItems(cur => cur.filter(i => i._id !== id));
        setDeleteTarget(null);
        Toast.show({ type: 'success', text1: 'Draft discarded' });
      } else {
        const token = await AsyncStorage.getItem('token');
        if (!token) throw new Error('Missing auth token');
        const resp = await fetch(`${API_BASE}/api/workplans/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        if (!resp.ok) {
          const txt = await resp.text();
          throw new Error(`Delete failed (${resp.status}) ${txt}`);
        }
        setItems(cur => cur.filter(i => i._id !== id));
        setDeleteTarget(null);
        Toast.show({ type: 'success', text1: 'Deleted' });
      }
    } catch (e: any) { Toast.show({ type: 'error', text1: e.message }); }
    finally { setDeleting(false); }
  };

  const publishDraft = async (draft: WorkPlanSummary) => {
    try {
      setPublishingId(draft._id);
      const token = await AsyncStorage.getItem('token');
      if(!token) throw new Error('Missing auth token');
      const body: any = {
        title: draft.title,
        startDate: draft.startDate || null,
        endDate: draft.endDate || null,
        generalGoal: draft.generalGoal || '',
        status: 'pending',
        plans: (draft.plans||[]).map((p:any)=>({
          title: p.title,
          activities: (p.activities||[]).map((a:any)=>({
            title: a.title,
            description: a.description,
            resources: a.resourcesArr || a.resources || [],
            estimatedHours: a.estimatedHours ? Number(a.estimatedHours) : 0
          }))
        }))
      };
      const resp = await fetch(`${API_BASE}/api/workplans`, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify(body) });
      if(!resp.ok){ const t = await resp.text(); throw new Error(`Publish failed (${resp.status}) ${t}`); }
      const json = await resp.json();
      if(!json.ok) throw new Error(json.error||'Failed');
      await removeLocalDraft(draft._id);
      setItems(cur => [json.item, ...cur.filter(i => i._id !== draft._id)]);
      Toast.show({ type:'success', text1:'Draft published' });
    } catch(e:any){ Toast.show({ type:'error', text1:e.message }); }
    finally { setPublishingId(null); setMenuFor(null); }
  };




  const renderItem = ({ item }: { item: WorkPlanSummary }) => {
    const planCount = item.plans ? item.plans.length : (item as any).plansCount || 0;
    const activitiesCount = item.plans ? item.plans.reduce((a, p) => a + (p.activities ? p.activities.length : 0), 0) : (item as any).activitiesCount || 0;
    const hasDates = item.startDate && item.endDate;
    const displayedTitle = hasDates ? `${new Date(item.startDate as string).toLocaleString('default', { month: 'short' })} ${new Date(item.startDate as string).getFullYear()} – ${new Date(item.endDate as string).toLocaleString('default', { month: 'short' })} ${new Date(item.endDate as string).getFullYear()} Work Plan` : item.title;
    // Normalize owner id (backend may populate owner object making previous strict equality fail)
    const ownerId = typeof item.owner === 'string' ? item.owner : item.owner?._id;
    return (
      <Pressable style={styles.card} onPress={() => nav.navigate('ViewWorkPlan', { id: item._id })}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>{displayedTitle}</Text>
          {/* Show action menu only if current user is the owner */}
          {ownerId && currentUserId === ownerId && (
            <TouchableOpacity style={styles.menuBtn} onPress={() => setMenuFor(item._id)}>
              <Ionicons name="ellipsis-vertical" size={18} color="#0f172a" />
            </TouchableOpacity>
          )}
        </View>
        {!!item.generalGoal && <Text style={styles.generalGoalText}>General goal: {item.generalGoal}</Text>}
        <View style={styles.statusRow}>
          <View style={[styles.statusChip, { backgroundColor: statusColors[item.status] || '#334155' }]}><Text style={styles.statusText}>{item.status}</Text></View>
        </View>
        <View style={styles.countsRow}>
          <View style={styles.countChip}><Text style={styles.countChipText}>Plans: {planCount}</Text></View>
          <View style={styles.countChip}><Text style={styles.countChipText}>Activities: {activitiesCount}</Text></View>
          {typeof item.successRate === 'number' ? (
            <View style={[styles.countChip,{ backgroundColor:'#eef2ff' }]}><Text style={[styles.countChipText,{ color:'#4338ca' }]}>{item.successRate}%</Text></View>
          ) : typeof item.progressPercent === 'number' && (
            <View style={styles.countChip}><Text style={styles.countChipText}>{item.progressPercent}%</Text></View>
          )}
        </View>
        {typeof item.successRate === 'number' && (
          <View style={{ flexDirection:'row', alignItems:'center', marginTop:6 }}>
            {Array.from({ length:5 }).map((_,i)=>{
              const val = (item.successRate||0)/20; const full = val >= i+1; const half = !full && val >= i+0.5;
              return <Ionicons key={i} name={full? 'star': half? 'star-half':'star-outline'} size={14} color={full||half? '#6366f1':'#cbd5e1'} style={{ marginRight:2 }} />;
            })}
            <Text style={{ marginLeft:4, fontSize:11, fontWeight:'600', color:'#0f172a' }}>{item.successRate}%</Text>
          </View>
        )}
        {menuFor === item._id && (
          <>
            <Pressable style={styles.menuBackdrop} onPress={() => setMenuFor(null)} />
            <View style={styles.popupMenu}>
              <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuFor(null); nav.navigate('ViewWorkPlan', { id: item._id }); }}><Text style={styles.menuItemText}>View</Text></TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuFor(null); nav.navigate('NewWorkPlan', { id: item._id }); }}><Text style={styles.menuItemText}>{item.local ? 'Edit Draft' : 'Edit'}</Text></TouchableOpacity>
              {item.status === 'draft' && (
                <TouchableOpacity style={styles.menuItem} onPress={() => publishDraft(item)}>
                  <Text style={[styles.menuItemText, { color: '#0f766e' }]}>{publishingId === item._id ? 'Publishing...' : 'Publish'}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuFor(null); setDeleteTarget(item); }}><Text style={[styles.menuItemText, { color: '#dc2626' }]}>{item.local ? 'Discard' : 'Delete'}</Text></TouchableOpacity>
            </View>
          </>
        )}
      </Pressable>
    );
  };



  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => nav.goBack()} style={{ padding: 4 }}>
          <Ionicons name="chevron-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Work Plans</Text>
        {userRole !== 'SuperAdmin' && canCreate && (
          <TouchableOpacity onPress={() => nav.navigate('NewWorkPlan')} style={styles.headerAddBtn}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
      {loading && (
        <View style={styles.loaderWrap}>
          <ModernLoader fullscreen={false} />
        </View>
      )}
      {error && !loading && <Text style={{ color: '#dc2626', marginHorizontal: 16, marginTop: 16 }}>{error}</Text>}

      {/* Filter Chips */}
      {!loading && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {[
            { key: 'all', label: 'All' },
            { key: 'active', label: 'Active' },
            { key: 'past', label: 'Past' },
            { key: 'pending', label: 'Pending' },
            { key: 'approved', label: 'Approved' },
            { key: 'rejected', label: 'Rejected' },
            { key: 'ignored', label: 'Ignored' },
            { key: 'completed', label: 'Completed' },
          ].map(c => {
            const active = activeFilter === c.key;
            return (
              <TouchableOpacity
                key={c.key}
                onPress={() => setActiveFilter(c.key as any)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>)}
      <View style={styles.body}>
        {/* {filteredItems.length > 0 && (
          <SwitchMenu />
        )} */}

  {!loading && userRole !== 'SuperAdmin' && items.length <= 0 && (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconCircleOuter}>
              <View style={styles.emptyIconCircleInner}>
                <Ionicons name="document-outline" size={34} color="#349DC5" />
              </View>
            </View>
            <Text style={styles.emptyTitle}>No work plans yet</Text>
            <Text style={styles.emptyDesc}>
              Create your first work plan to start organizing{"\n"}
              your goals and activities.
            </Text>
            {userRole !== 'SuperAdmin' && canCreate && (
              <TouchableOpacity style={styles.primaryBtn} onPress={() => nav.navigate('NewWorkPlan')}>
                <Text style={styles.primaryBtnText}>Create your first plan</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        {items.length > 0 && filteredItems.length === 0 && !loading && (
          <View style={styles.filteredEmptyWrap}>
            <Ionicons name="search-outline" size={40} color="#94a3b8" />
            <Text style={styles.filteredEmptyTitle}>No results for this filter</Text>
            <TouchableOpacity onPress={() => setActiveFilter('all')} style={styles.clearFilterBtn}>
              <Text style={styles.clearFilterBtnText}>Clear filter</Text>
            </TouchableOpacity>
          </View>
        )}
        {filteredItems.length > 0 && (
          <FlatList
            data={filteredItems}
            keyExtractor={i => i._id}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={styles.powerList}
          />
        )}
      </View>
      <Modal visible={!!deleteTarget} transparent animationType="fade" onRequestClose={()=> !deleting && setDeleteTarget(null)}>
        <View style={styles.delBackdrop}>
          <View style={styles.delCard}>
            <Text style={styles.delTitle}>Delete Work Plan</Text>
            <Text style={styles.delMsg}>This action cannot be undone. Delete {deleteTarget?.title || 'this plan'}?</Text>
            <View style={styles.delActions}>
              <TouchableOpacity disabled={deleting} style={[styles.delBtn, styles.delCancel]} onPress={()=> setDeleteTarget(null)}>
                <Text style={styles.delCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={deleting} style={[styles.delBtn, styles.delDelete]} onPress={()=> deleteTarget && doDelete(deleteTarget._id)}>
                <Text style={styles.delDeleteText}>{deleting ? 'Deleting...' : 'Delete'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flexGrow: 1, backgroundColor: '#fff' },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e2e8f0', marginTop: heightPercentageToDP('4%') },
  headerTitle: { fontSize: 16, fontWeight: '600', flex: 1, textAlign: 'center' },
  headerAddBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#349DC5', alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#dbe3ef', padding: 14, borderRadius: 10, marginBottom: 12, position: 'relative' },
  menuBtn: { padding: 4 },
  powerList: { padding: 16, paddingBottom: 40 },
  cardOverlay: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 },
  popupMenu: { position: 'absolute', top: 8, right: 8, backgroundColor: '#fff', borderRadius: 8, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, elevation: 4, paddingVertical: 4, minWidth: 130, zIndex: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  menuItem: { paddingVertical: 10, paddingHorizontal: 14 },
  menuItemText: { fontSize: 13, fontWeight: '500', color: '#0f172a' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  countsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 },
  countChip: { backgroundColor: '#0f89b8', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  countChipText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  generalGoalText: { fontSize: 12, color: '#334155', marginTop: 4 },
  chipsRow: { paddingHorizontal: 12, paddingTop: 14 },
  chip: { paddingHorizontal: 14, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginRight: 10, top: heightPercentageToDP('0.2%') },
  chipActive: { backgroundColor: '#349DC5' },
  chipText: { fontSize: 13, fontWeight: '500', color: '#475569' },
  chipTextActive: { color: '#fff' },
  body: { flex:heightPercentageToDP('90%'), paddingHorizontal: 4, paddingTop: 10 },
  delBackdrop:{ flex:1, backgroundColor:'rgba(0,0,0,0.45)', alignItems:'center', justifyContent:'center', padding:32 },
  delCard:{ width:'100%', backgroundColor:'#fff', borderRadius:20, padding:22, shadowColor:'#000', shadowOpacity:0.15, shadowRadius:20, elevation:6 },
  delTitle:{ fontSize:16, fontWeight:'700', color:'#0f172a' },
  delMsg:{ fontSize:13, color:'#475569', marginTop:12, lineHeight:18 },
  delActions:{ flexDirection:'row', justifyContent:'flex-end', gap:12, marginTop:26 },
  delBtn:{ paddingHorizontal:20, paddingVertical:12, borderRadius:10 },
  delCancel:{ backgroundColor:'#f1f5f9' },
  delDelete:{ backgroundColor:'#dc2626' },
  delCancelText:{ color:'#0f172a', fontWeight:'600', fontSize:13 },
  delDeleteText:{ color:'#fff', fontWeight:'700', fontSize:13 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingBottom: heightPercentageToDP('6%') },
  emptyIconCircleOuter: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#e7f5fa', alignItems: 'center', justifyContent: 'center' },
  emptyIconCircleInner: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#c8e3ee' },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 24, color: '#0f172a' },
  emptyDesc: { marginTop: 10, fontSize: 14, lineHeight: 20, textAlign: 'center', color: '#64748b' },
  filteredEmptyWrap: { alignItems: 'center', paddingTop: 80 },
  filteredEmptyTitle: { fontSize: 14, fontWeight: '600', marginTop: 12, color: '#475569', },
  clearFilterBtn: { marginTop: 12, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9' },
  clearFilterBtnText: { fontSize: 12, fontWeight: '500', color: '#0f172a' }
  , cardHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0f172a', paddingRight: 8 },
  statusChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  primaryBtn: { marginTop: 24, backgroundColor: '#349DC5', paddingHorizontal: 26, paddingVertical: 14, borderRadius: 12 },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  menuBackdrop: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 },
  loaderWrap: { paddingTop: 40 },
});

export default WorkPlansListScreen;
