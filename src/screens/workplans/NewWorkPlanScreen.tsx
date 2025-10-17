import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity, ScrollView, TextInput, Alert, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateLocalDraftId, upsertLocalDraft, loadLocalDrafts, LocalWorkPlanDraft, removeLocalDraft } from './localDrafts';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import moment from 'moment';
import Toast from 'react-native-toast-message';

interface ActivityDraft { id: string; title: string; description: string; startDate?: string; endDate?: string; resources: string; resourcesArr?: string[]; estimatedHours?: string; }
interface PlanDraft { id: string; title: string; activities: ActivityDraft[]; }

const uuid = () => Math.random().toString(36).slice(2, 10);

const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'https://streamsofjoyumuahia-api.onrender.com';

const NewWorkPlanScreen: React.FC = () => {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const editingId = route.params?.id as string | undefined;
  const isLocalDraft = editingId?.startsWith('local_');
  const [title, setTitle] = useState('');
  const [generalGoal, setGeneralGoal] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [pickerMode, setPickerMode] = useState<'start' | 'end' | null>(null);
  const [plans, setPlans] = useState<PlanDraft[]>([{ id: uuid(), title: '', activities: [{ id: uuid(), title: '', description: '', resources: '' }] }]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [loadError, setLoadError] = useState<string|undefined>();
  const [planStatus, setPlanStatus] = useState<'draft' | 'pending' | 'approved' | 'rejected' | undefined>(undefined);

  const updatePlan = (id: string, patch: Partial<PlanDraft>) => {
    setPlans(p => p.map(pl => pl.id === id ? { ...pl, ...patch } : pl));
  };
  const updateActivity = (planId: string, actId: string, patch: Partial<ActivityDraft>) => {
    setPlans(p => p.map(pl => pl.id === planId ? { ...pl, activities: pl.activities.map(a => a.id === actId ? { ...a, ...patch } : a) } : pl));
  };
  const addPlan = () => setPlans(p => [...p, { id: uuid(), title: '', activities: [{ id: uuid(), title: '', description: '', resources: '' }] }]);
  const addActivity = (planId: string) => setPlans(p => p.map(pl => pl.id === planId ? { ...pl, activities: [...pl.activities, { id: uuid(), title: '', description: '', resources: '' }] } : pl));
  const removePlan = (planId: string) => {
    setPlans(p => {
      if (p.length === 1) return p; // keep at least one plan
      return p.filter(pl => pl.id !== planId);
    });
  };
  const removeActivity = (planId: string, actId: string) => {
    setPlans(p => p.map(pl => {
      if (pl.id !== planId) return pl;
      if (pl.activities.length === 1) return pl; // keep at least one activity per plan
      return { ...pl, activities: pl.activities.filter(a => a.id !== actId) };
    }));
  };

    interface SerializedWorkPlanBody {
      title: string; generalGoal: string; startDate?: string; endDate?: string; status?: string;
      plans: { title: string; activities: { title: string; description: string; resources: string[]; estimatedHours: number; }[] }[];
    }
    const serialize = (): SerializedWorkPlanBody => ({
      title: title || 'Untitled Work Plan',
      generalGoal,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      plans: plans.map(pl => ({
        title: pl.title || 'Untitled Plan',
        activities: pl.activities.map(a => {
          let resArr: string[] = [];
          if (Array.isArray(a.resourcesArr) && a.resourcesArr.length) {
            resArr = a.resourcesArr.filter(Boolean).map(r => r.trim());
          } else if (typeof a.resources === 'string') {
            resArr = a.resources.split(',').map(r => r.trim()).filter(Boolean);
          } else if (Array.isArray((a as any).resources)) {
            resArr = (a as any).resources.map((r:any)=>String(r).trim()).filter(Boolean);
          }
          return {
            title: a.title || 'Activity',
            description: a.description,
            resources: resArr,
            estimatedHours: a.estimatedHours ? Number(a.estimatedHours) : 0,
          };
        })
      }))
    });

  const submit = async () => {
    // If editing a remote (backend) plan -> update it in place
    if (editingId && !isLocalDraft) {
      try {
        setSubmitting(true);
        const token = await AsyncStorage.getItem('token');
        if(!token) throw new Error('Auth token missing');
        const body = serialize();
        const resp = await fetch(`${API_BASE}/api/workplans/${editingId}`, { method:'PUT', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify(body) });
        if(!resp.ok){ const t = await resp.text(); throw new Error(`Update failed (${resp.status}) ${t}`); }
        const json = await resp.json();
        if(!json.ok) throw new Error(json.error||'Failed');
        nav.replace('ViewWorkPlan', { id: json.item._id });
      } catch(e:any){ Toast.show({ type: 'error', text1: 'Not Granted', text2: e.message });}
      finally { setSubmitting(false); }
      return;
    }
    // Otherwise save/update local draft only
    try {
      setSubmitting(true);
      const body = serialize();
      const userRaw = await AsyncStorage.getItem('user');
      const user = userRaw ? JSON.parse(userRaw) : undefined;
      const now = new Date().toISOString();
      const draft: LocalWorkPlanDraft = {
        id: isLocalDraft ? editingId! : generateLocalDraftId(),
        status: 'draft',
        title: body.title,
        generalGoal: body.generalGoal,
        startDate: body.startDate || null,
        endDate: body.endDate || null,
        plans: body.plans,
        owner: user?._id,
        createdAt: now,
        updatedAt: now,
        local: true
      };
      await upsertLocalDraft(draft);
      nav.goBack();
    } catch(e:any){ Toast.show({ type: 'error', text1: 'Not Granted', text2: e.message }); }
    finally { setSubmitting(false); }
  };

  const publishDraft = async () => {
    // Only allow if drafting (local or remote draft status)
    if (submitting) return;
    if (editingId && !isLocalDraft && planStatus !== 'draft') return; // remote non-draft can't publish here
    try {
      setSubmitting(true);
      const body = serialize();
      body.status = 'pending';
      const token = await AsyncStorage.getItem('token');
      if(!token) throw new Error('Auth token missing');
      if (isLocalDraft || !editingId) {
        // Create new pending plan from local draft
        const resp = await fetch(`${API_BASE}/api/workplans`, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify(body) });
        if(!resp.ok){ const t = await resp.text(); throw new Error(`Publish failed (${resp.status}) ${t}`); }
        const json = await resp.json();
        if(!json.ok) throw new Error(json.error||'Failed');
        if (isLocalDraft) {
          try { await removeLocalDraft(editingId!); } catch {}
        }
        nav.replace('ViewWorkPlan', { id: json.item._id });
      } else {
        // editing remote draft -> update + publish (update status to pending)
        const resp = await fetch(`${API_BASE}/api/workplans/${editingId}`, { method:'PUT', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify(body) });
        if(!resp.ok){ const t = await resp.text(); throw new Error(`Publish failed (${resp.status}) ${t}`); }
        const json = await resp.json();
        if(!json.ok) throw new Error(json.error||'Failed');
        nav.replace('ViewWorkPlan', { id: json.item._id });
      }
    } catch(e:any){ Toast.show({ type: 'error', text1: 'Publish Error', text2: e.message }); }
    finally { setSubmitting(false); }
  };

  // Load existing plan when editing
  const loadExisting = useCallback(async () => {
    if(!editingId) return;
    setLoadingExisting(true); setLoadError(undefined);
    try {
      if (isLocalDraft) {
        const drafts = await loadLocalDrafts();
        const d = drafts.find(x => x.id === editingId);
        if(!d) throw new Error('Draft not found');
        setTitle(d.title || '');
        setGeneralGoal(d.generalGoal || '');
        setStartDate(d.startDate || '');
        setEndDate(d.endDate || '');
        setPlans((d.plans||[]).map((pl:any)=>({
          id: uuid(),
          title: pl.title,
          activities: (pl.activities||[]).map((a:any)=>({
            id: uuid(),
            title: a.title,
            description: a.description || '',
            resources: (a.resourcesArr||a.resources||[]).join(', '),
            resourcesArr: a.resourcesArr || a.resources || [],
            estimatedHours: a.estimatedHours ? String(a.estimatedHours) : ''
          }))
        })));
      } else {
        const token = await AsyncStorage.getItem('token');
        if(!token) throw new Error('Auth token missing');
        const resp = await fetch(`${API_BASE}/api/workplans/${editingId}`, { headers:{ Authorization:`Bearer ${token}` } });
        if(!resp.ok){ const t = await resp.text(); throw new Error(`Fetch failed (${resp.status}) ${t}`); }
        const json = await resp.json();
        if(!json.ok) throw new Error(json.error||'Failed');
        const it = json.item;
        setTitle(it.title || '');
        setGeneralGoal(it.generalGoal || '');
        setStartDate(it.startDate || '');
        setEndDate(it.endDate || '');
    setPlanStatus(it.status as any);
        if(it.plans && Array.isArray(it.plans) && it.plans.length){
          setPlans(it.plans.map((pl:any)=>({
            id: uuid(),
            title: pl.title,
            activities: (pl.activities||[]).map((a:any)=>{
              const raw = a.resourcesArr ?? a.resources;
              let arr: string[] = [];
              if (Array.isArray(raw)) arr = raw.map((r:any)=>String(r).trim()).filter(Boolean);
              else if (typeof raw === 'string') arr = raw.split(',').map((r:string)=>r.trim()).filter(Boolean);
              return {
                id: uuid(),
                title: a.title,
                description: a.description || '',
                resources: arr.join(', '),
                resourcesArr: arr,
                estimatedHours: a.estimatedHours ? String(a.estimatedHours) : ''
              };
            })
          })));
        }
      }
    } catch(e:any){ setLoadError(e.message); }
    finally { setLoadingExisting(false); }
  }, [editingId, isLocalDraft]);

  useEffect(()=>{ loadExisting(); },[loadExisting]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => nav.goBack()} style={{ padding: 4 }}><Ionicons name="chevron-back" size={24} color="#111" /></TouchableOpacity>
        <Text style={styles.headerTitle}>{editingId ? 'Edit Work Plan' : 'New Work Plan'}</Text>
        <View style={{ width: 40 }} />
      </View>
      {loadingExisting && <Text style={{ margin:16, color:'#64748b' }}>Loading...</Text>}
      {!!loadError && <Text style={{ margin:16, color:'#dc2626' }}>{loadError}</Text>}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
  <Text style={styles.topLabel}>Title</Text>
  <TextInput placeholder="Give this work plan a title" style={[styles.titleInput]} value={title} onChangeText={setTitle} />
  <Text style={styles.label}>Period</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable style={[styles.input, styles.dateInput, { flex: 1 }]} onPress={() => setPickerMode('start')}>
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={16} color="#64748b" />
              <Text style={startDate ? styles.dateTextValue : styles.dateTextPlaceholder}>
                {startDate ? moment(startDate).format('YYYY-MM-DD') : 'Starting Date'}
              </Text>
            </View>
          </Pressable>
          <Pressable style={[styles.input, styles.dateInput, { flex: 1 }]} onPress={() => setPickerMode('end')}>
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={16} color="#64748b" />
              <Text style={endDate ? styles.dateTextValue : styles.dateTextPlaceholder}>
                {endDate ? moment(endDate).format('YYYY-MM-DD') : 'Ending Date'}
              </Text>
            </View>
          </Pressable>
        </View>
        <Text style={styles.label}>General Goal</Text>
        <TextInput placeholder="Enter your general goal" style={[styles.input, { height: 90, textAlignVertical: 'top' }]} multiline value={generalGoal} onChangeText={setGeneralGoal} />
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Plans</Text>
        {plans.map((pl, idx) => (
          <View key={pl.id} style={styles.planBox}>
            <View style={styles.planHeaderRow}>
              <Text style={styles.planHeader}>Plan {idx + 1}</Text>
              {plans.length > 1 && (
                <TouchableOpacity onPress={() => removePlan(pl.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.closeBtn}>
                  <Ionicons name="close" size={18} color="#64748b" />
                </TouchableOpacity>
              )}
            </View>
            <TextInput placeholder="Plan title / summary" style={styles.input} value={pl.title} onChangeText={t => updatePlan(pl.id, { title: t })} />
            <Text style={[styles.subHeading, { marginTop: 12 }]}>Activities</Text>
            {pl.activities.map((a, aIdx) => (
              <View key={a.id} style={styles.activityBox}>
                <View style={styles.activityHeaderRow}>
                  <Text style={styles.activityTitle}>Activity {aIdx + 1}</Text>
                  {pl.activities.length > 1 && (
                    <TouchableOpacity onPress={() => removeActivity(pl.id, a.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.closeSmallBtn}>
                      <Ionicons name="close" size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  )}
                </View>
                <TextInput placeholder="Activity Title" style={styles.input} value={a.title} onChangeText={t => updateActivity(pl.id, a.id, { title: t })} />
                <TextInput placeholder="Description" style={[styles.input, { height: 80, textAlignVertical: 'top' }]} multiline value={a.description} onChangeText={t => updateActivity(pl.id, a.id, { description: t })} />
                {/* Resources Chips */}
                <View style={{ marginTop:4 }}>
                  <Text style={styles.resourcesLabel}>Resources</Text>
                  <View style={styles.resourceChipsWrap}>
                    {a.resourcesArr?.map(r => (
                      <View key={r+Math.random()} style={styles.resourceChip}>
                        <Text style={styles.resourceChipText}>{r}</Text>
                        <TouchableOpacity onPress={()=> updateActivity(pl.id,a.id,{ resourcesArr: (a.resourcesArr||[]).filter(x=>x!==r) })} style={styles.resourceChipClose}>
                          <Ionicons name="close" size={14} color="#334155" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                  <TextInput
                    placeholder="Type a resource and press Enter"
                    style={styles.input}
                    value={a.resources}
                    onChangeText={t => updateActivity(pl.id, a.id, { resources: t })}
                    onSubmitEditing={()=> {
                      const val = (a.resources||'').trim();
                      if(!val) return;
                      const arr = [...(a.resourcesArr||[])];
                      if(!arr.includes(val)) arr.push(val);
                      updateActivity(pl.id,a.id,{ resourcesArr: arr, resources:'' });
                    }}
                    blurOnSubmit={false}
                  />
                </View>
              </View>
            ))}
            <TouchableOpacity onPress={() => addActivity(pl.id)} style={styles.inlineAddBtn}><Text style={styles.inlineAddText}>+ Add Activity</Text></TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity onPress={addPlan} style={[styles.inlineAddBtn, { marginTop: 12 }]}><Text style={styles.inlineAddText}>+ Add Another Plan</Text></TouchableOpacity>
      </ScrollView>
      <View style={styles.footerBar}>
        { // Show dual buttons for local new or local draft editing
          (!editingId || isLocalDraft || planStatus === 'draft') && (
            <>
              <TouchableOpacity disabled={submitting} style={[styles.secondaryBtn, { flex:1 }]} onPress={submit}>
                <Text style={styles.secondaryBtnText}>{submitting ? 'Saving...' : (editingId && !isLocalDraft ? 'Save Changes' : 'Save Draft')}</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={submitting} style={[styles.primaryBtn, { flex:1 }]} onPress={publishDraft}>
                <Text style={styles.primaryBtnText}>{submitting ? 'Publishing...' : 'Publish'}</Text>
              </TouchableOpacity>
            </>
          )
        }
        { editingId && !isLocalDraft && planStatus && planStatus !== 'draft' && (
          <TouchableOpacity disabled={submitting} style={[styles.primaryBtn, { flex:1 }]} onPress={submit}>
            <Text style={styles.primaryBtnText}>{submitting ? 'Saving...' : 'Save Changes'}</Text>
          </TouchableOpacity>
        )}
      </View>
      <DateTimePickerModal
        isVisible={pickerMode !== null}
        mode="date"
        onConfirm={(date) => {
          if (pickerMode === 'start') setStartDate(date.toISOString());
          if (pickerMode === 'end') setEndDate(date.toISOString());
          setPickerMode(null);
        }}
        onCancel={() => setPickerMode(null)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e2e8f0' },
  headerTitle: { fontSize: 16, fontWeight: '600', textAlign: 'center', flex: 1 },
  topLabel:{ fontSize:13, fontWeight:'600', marginTop:12, marginBottom:6, color:'#0f172a' },
  titleInput:{ borderWidth:1, borderColor:'#cfd8e3', borderRadius:10, paddingHorizontal:14, paddingVertical:14, fontSize:15, fontWeight:'600', backgroundColor:'#f8fafc' },
  label: { fontSize: 14, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#d0d7df', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: '#fff', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  planBox: { borderWidth: 1, borderColor: '#d0d7df', padding: 14, borderRadius: 10, marginTop: 16 },
  planHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  planHeader: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  subHeading: { fontSize: 13, fontWeight: '600' },
  activityBox: { borderWidth: 1, borderColor: '#cfd8e3', padding: 12, borderRadius: 8, marginTop: 12 },
  activityHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  activityTitle: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  closeBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', marginLeft: 8 },
  closeSmallBtn: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' },
  inlineAddBtn: { borderWidth: 1, borderColor: '#349DC5', paddingVertical: 12, alignItems: 'center', borderRadius: 8, marginTop: 12 },
  inlineAddText: { color: '#349DC5', fontWeight: '600' },
  resourcesLabel:{ fontSize:12, fontWeight:'600', color:'#334155', marginBottom:6 },
  resourceChipsWrap:{ flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:4 },
  resourceChip:{ flexDirection:'row', alignItems:'center', backgroundColor:'#e2f4fa', paddingHorizontal:12, paddingVertical:6, borderRadius:20, marginRight:8, marginBottom:8 },
  resourceChipText:{ fontSize:12, fontWeight:'600', color:'#0f172a' },
  resourceChipClose:{ marginLeft:6, padding:2 },
  footerBar: { flexDirection: 'row', padding: 12, gap: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e2e8f0', backgroundColor: '#fff' },
  primaryBtn: { flex: 1, backgroundColor: '#349DC5', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '600' },
  secondaryBtn: { flex: 1, backgroundColor: '#f1f5f9', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  secondaryBtnText: { color: '#0f172a', fontWeight: '600' }
  , dateInput: { justifyContent: 'center' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateTextPlaceholder: { color: '#94a3b8', fontSize: 14 },
  dateTextValue: { color: '#0f172a', fontSize: 14, fontWeight: '500' }
});

export default NewWorkPlanScreen;
