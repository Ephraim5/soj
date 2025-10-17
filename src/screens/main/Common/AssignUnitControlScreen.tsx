import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity, ScrollView, Modal, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { AppEventBus } from '../../../components/AppBootstrapGate';
import ModernLoader from '../../../loader/load';

// Colors from app palette
const PRIMARY = '#349DC5';
const NAVY = '#00204a';
const BG = '#ffffff';

// Minimal fetch helpers
const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'https://streamsofjoyumuahia-api.onrender.com';

export default function AssignUnitControlScreen(){
  const nav = useNavigation<any>();
  const [role, setRole] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [units, setUnits] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [memberPickerOpen, setMemberPickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [attendanceTaking, setAttendanceTaking] = useState(false);
  const [musicUnit, setMusicUnit] = useState(false);
  const [ministries, setMinistries] = useState<string[]>([]);
  const [selectedMinistry, setSelectedMinistry] = useState<string | null>(null);
  // Unit cards assignment (SuperAdmin only)
  const [assignableCards] = useState<Array<{ key:string; label:string }>>([
    { key:'songs', label:'Songs Released' },
    { key:'recovery', label:'Recovered Addicts' },
    { key:'emporium', label:'Emporium Sales' },
    { key:'firstTimers', label:'First Timers' },
    { key:'assigned', label:'First Timers assigned by you' },
    { key:'marriedMembers', label:'Members That Got Married' },
  ]);
  const [selectedCardKeys, setSelectedCardKeys] = useState<string[]>([]);
  const [selectedUnitsForCards, setSelectedUnitsForCards] = useState<string[]>([]);
  // Member duties (UnitLeader assigns to a member)
  const [makeFinSec, setMakeFinSec] = useState(false);
  const [dutyApproveMembers, setDutyApproveMembers] = useState(false);
  const [dutyCreateWorkPlan, setDutyCreateWorkPlan] = useState(false);
  // Derived assignments in the selected unit (who currently has which duty/control)
  const finSecAssignee = useMemo(()=>{
    if(!selectedUnit) return null;
    return (members||[]).find((m:any)=> (m.roles||[]).some((r:any)=> String(r.unit||'')===String(selectedUnit) && (r.duties||[]).includes('FinancialSecretary')) ) || null;
  }, [members, selectedUnit]);
  const approveAssignee = useMemo(()=>{
    if(!selectedUnit) return null;
    return (members||[]).find((m:any)=> (m.roles||[]).some((r:any)=> String(r.unit||'')===String(selectedUnit) && (r.duties||[]).includes('ApproveMembers')) ) || null;
  }, [members, selectedUnit]);
  const workPlanAssignee = useMemo(()=>{
    if(!selectedUnit) return null;
    return (members||[]).find((m:any)=> (m.roles||[]).some((r:any)=> String(r.unit||'')===String(selectedUnit) && (r.duties||[]).includes('CreateWorkPlan')) ) || null;
  }, [members, selectedUnit]);
  // Preload current duties for selected member in selected unit
  useEffect(()=>{ (async()=>{
    try{
      if(!selectedUnit || !selectedMember) return;
      const token = await AsyncStorage.getItem('token'); if(!token) return;
      const res = await fetch(`${API_BASE}/api/users/${selectedMember}`, { headers: { Authorization:`Bearer ${token}` } });
      const json = await res.json();
      if(json?.ok && json.user){
        const roleForUnit = (json.user.roles||[]).find((r:any)=> {
          const unitIdVal = r?.unit && (typeof r.unit === 'string' ? r.unit : (r.unit?._id || r.unit.id || ''));
          return unitIdVal && String(unitIdVal)===String(selectedUnit) && ['Member','UnitLeader'].includes(r.role);
        });
        const duties: string[] = Array.isArray(roleForUnit?.duties) ? roleForUnit.duties : [];
        setDutyApproveMembers(duties.includes('ApproveMembers'));
        setDutyCreateWorkPlan(duties.includes('CreateWorkPlan'));
      }
    } catch {}
  })(); }, [selectedUnit, selectedMember]);

  useEffect(()=>{ (async()=>{
    try{
      const raw = await AsyncStorage.getItem('user');
      const u = raw? JSON.parse(raw): null;
      setRole(u?.activeRole || null);
      setProfile(u||null);
      const token = await AsyncStorage.getItem('token');
      if(!token) return;
      // Pre-fetch ministries for active church
      if(u?.church){
        try{
          const cRes = await fetch(`${API_BASE}/api/churches/${u.church}`, { headers:{ Authorization:`Bearer ${token}` } });
          const cJson = await cRes.json();
          if(cJson?.ok && cJson.church?.ministries){
            const mins = (cJson.church.ministries||[]).map((m:any)=> m.name).filter(Boolean);
            setMinistries(mins);
            if(u?.activeRole==='MinistryAdmin'){
              const minRole = (u.roles||[]).find((r:any)=> r.role==='MinistryAdmin');
              setSelectedMinistry(minRole?.ministryName || mins[0] || null);
            } else {
              setSelectedMinistry(mins[0] || null);
            }
          }
        } catch{}
      }
      // Fetch units initially (scope by church/ministry when available)
      const params: string[] = [];
      if(u?.church) params.push(`churchId=${encodeURIComponent(u.church)}`);
      // selectedMinistry might not be set yet in this tick; a follow-up effect below refetches when it changes
      const res = await fetch(`${API_BASE}/api/units${params.length?`?${params.join('&')}`:''}`, { headers:{ Authorization:`Bearer ${token}` } });
      const json = await res.json(); if(json.ok){ setUnits(json.units||[]); }
      // If UnitLeader, load members for their active unit
      if(u?.activeRole==='UnitLeader'){
        const unitId = (u.roles||[]).find((r:any)=> r.role==='UnitLeader' && r.unit)?.unit;
        if(unitId){
          setSelectedUnit(unitId);
          const mRes = await fetch(`${API_BASE}/api/units/${unitId}/members/list`, { headers:{ Authorization:`Bearer ${token}` } });
          const mJson = await mRes.json(); if(mJson.ok){ setMembers(mJson.members||[]); }
        }
      }
    } finally { setLoading(false); }
  })(); }, []);

  // When ministry selection changes (admins), refetch units filtered by church + ministry
  useEffect(()=>{ (async()=>{
    if(!(role==='SuperAdmin' || role==='MinistryAdmin')) return;
    if(!profile?.church) return;
    const token = await AsyncStorage.getItem('token'); if(!token) return;
    try{
      const qs: string[] = [];
      if(profile?.church) qs.push(`churchId=${encodeURIComponent(profile.church)}`);
      if(selectedMinistry) qs.push(`ministry=${encodeURIComponent(selectedMinistry)}`);
      const res = await fetch(`${API_BASE}/api/units?${qs.join('&')}`, { headers:{ Authorization:`Bearer ${token}` } });
      const json = await res.json(); if(json.ok){ setUnits(json.units||[]); setSelectedUnit(null); }
    }catch(e){ /* ignore */ }
  })(); }, [selectedMinistry, role]);

  // When a unit is selected, sync toggles to reflect the unit's current flags
  useEffect(()=>{
    if(!selectedUnit) return;
    const u = (units||[]).find((x:any)=> String(x._id) === String(selectedUnit));
    if(!u) return;
    if(u.attendanceTaking !== undefined) setAttendanceTaking(!!u.attendanceTaking);
    if(u.musicUnit !== undefined) setMusicUnit(!!u.musicUnit);
    // Also refresh members list for the selected unit (admins or leader switching units)
    (async()=>{
      try{
        const token = await AsyncStorage.getItem('token'); if(!token) return;
        const mRes = await fetch(`${API_BASE}/api/units/${u._id}/members/list`, { headers:{ Authorization:`Bearer ${token}` } });
        const mJson = await mRes.json(); if(mJson.ok){ setMembers(mJson.members||[]); }
      }catch{}
    })();
  }, [selectedUnit, units]);

  const canPickUnit = role === 'SuperAdmin' || role === 'MinistryAdmin';
  const canPickMember = role === 'UnitLeader';
  const isSuper = role === 'SuperAdmin';
  const isMinAdmin = role === 'MinistryAdmin';

  // Derived filtered units by selected ministry (for admins)
  const filteredUnits = useMemo(()=>{
    if(!canPickUnit) return units;
    if(!selectedMinistry) return units;
    return (units||[]).filter((u:any)=> (u.ministryName||'') === selectedMinistry);
  }, [units, selectedMinistry, canPickUnit]);

  const saveAttendance = async()=>{
    try{
      if(!selectedUnit) return;
      setSaving(true);
      const token = await AsyncStorage.getItem('token'); if(!token) return;
      const res = await fetch(`${API_BASE}/api/units/assign-attendance`, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify({ unitId: selectedUnit }) });
      const json = await res.json(); if(!json.ok) throw new Error(json.message||'Failed');
  // broadcast change for dashboards/cards
  AppEventBus.emit('assignmentsChanged', { type: 'attendance', unitId: selectedUnit });
      return true;
    }catch(e:any){ alert(e.message); } finally{ setSaving(false); }
  };

  const saveFinSec = async()=>{
    try{
      if(!selectedUnit || !selectedMember) return;
      setSaving(true);
      const token = await AsyncStorage.getItem('token'); if(!token) return;
      const res = await fetch(`${API_BASE}/api/units/${selectedUnit}/assign-finsec`, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify({ userId: selectedMember }) });
      const json = await res.json(); if(!json.ok) throw new Error(json.message||'Failed');
  AppEventBus.emit('assignmentsChanged', { type: 'finsec', unitId: selectedUnit, userId: selectedMember });
      return true;
    }catch(e:any){ alert(e.message); } finally{ setSaving(false); }
  };

  const unassignFinSec = async()=>{
    try{
      if(!selectedUnit) return;
      setSaving(true);
      const token = await AsyncStorage.getItem('token'); if(!token) return;
      const res = await fetch(`${API_BASE}/api/units/${selectedUnit}/unassign-finsec`, { method:'POST', headers:{ Authorization:`Bearer ${token}` } });
      const json = await res.json(); if(!json.ok) throw new Error(json.message||'Failed');
      // refresh members list to reflect removal
      const mRes = await fetch(`${API_BASE}/api/units/${selectedUnit}/members/list`, { headers:{ Authorization:`Bearer ${token}` } });
      const mJson = await mRes.json(); if(mJson.ok){ setMembers(mJson.members||[]); }
      AppEventBus.emit('assignmentsChanged', { type: 'finsec-unassign', unitId: selectedUnit });
    }catch(e:any){ alert(e.message); } finally{ setSaving(false); }
  };

  const saveMusic = async()=>{
    try{
      if(!selectedUnit) return;
      setSaving(true);
      const token = await AsyncStorage.getItem('token'); if(!token) return;
      const res = await fetch(`${API_BASE}/api/units/${selectedUnit}/assign-music`, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify({ enabled: musicUnit }) });
      const json = await res.json(); if(!json.ok) throw new Error(json.message||'Failed');
  AppEventBus.emit('assignmentsChanged', { type: 'music', unitId: selectedUnit, enabled: musicUnit });
      return true;
    }catch(e:any){ alert(e.message); } finally{ setSaving(false); }
  };

  const saveMemberDuties = async()=>{
    try{
      if(!selectedUnit || !selectedMember) return;
      setSaving(true);
      const token = await AsyncStorage.getItem('token'); if(!token) return;
      const res = await fetch(`${API_BASE}/api/units/${selectedUnit}/assign-duty`, {
        method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({ userId: selectedMember, approveMembers: !!dutyApproveMembers, createWorkPlan: !!dutyCreateWorkPlan })
      });
      const json = await res.json(); if(!json.ok) throw new Error(json.message||'Failed');
      AppEventBus.emit('assignmentsChanged', { type: 'duties', unitId: selectedUnit, userId: selectedMember, duties: { approveMembers: dutyApproveMembers, createWorkPlan: dutyCreateWorkPlan } });
      return true;
    }catch(e:any){ alert(e.message); } finally{ setSaving(false); }
  };

  const saveCardsBulk = async()=>{
    try{
      setSaving(true);
      const token = await AsyncStorage.getItem('token'); if(!token) return;
      const body:any = { cardKeys: selectedCardKeys };
      if(selectedUnitsForCards.length) body.unitIds = selectedUnitsForCards;
      if(profile?.church) body.churchId = profile.church;
      if(selectedMinistry) body.ministry = selectedMinistry;
      const res = await fetch(`${API_BASE}/api/units/assign-cards`, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify(body) });
      const json = await res.json(); if(!json.ok) throw new Error(json.message||'Failed');
      alert('Cards assigned successfully');
      AppEventBus.emit('assignmentsChanged', { type: 'cards', unitIds: selectedUnitsForCards, cardKeys: selectedCardKeys, ministry: selectedMinistry });
    }catch(e:any){ alert(e.message); } finally{ setSaving(false); }
  };

  // Refresh current profile to reflect any immediate changes (e.g., duties on me)
  const refreshProfile = async()=>{
    try{
      const token = await AsyncStorage.getItem('token'); if(!token) return;
      const res = await fetch(`${API_BASE}/api/users/me`, { headers:{ Authorization:`Bearer ${token}` } });
      const json = await res.json();
      if(json?.ok && json.user){ await AsyncStorage.setItem('user', JSON.stringify(json.user)); AppEventBus.emit('profileRefreshed', json.user); }
    }catch{}
  };

  if(loading){ return (
    <SafeAreaView style={[styles.safe, { alignItems:'center', justifyContent:'center' }]}>
      <ModernLoader fullscreen={false} spinnerSize={70} ringWidth={7} logoSize={42} />
      <Text style={{ marginTop:12, color:PRIMARY, fontWeight:'700' }}>Preparing controls…</Text>
    </SafeAreaView>
  ); }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={()=> nav.goBack()} style={{ padding: 6 }}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Assign Unit Control</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {canPickUnit && (
          <>
            <View style={styles.field}>
              <Text style={styles.label}>Service Type (Ministry)</Text>
              <View style={styles.pickerWrap}>
                <Picker enabled={isSuper} selectedValue={selectedMinistry} onValueChange={(v)=> setSelectedMinistry(v as any)}>
                  {(!selectedMinistry) && <Picker.Item label="-- Select ministry --" value={null} />}
                  {ministries.map(m => <Picker.Item key={m} label={m} value={m} />)}
                </Picker>
              </View>
            </View>
          <View style={styles.field}>
            <Text style={styles.label}>Select Unit</Text>
            <View style={styles.pickerWrap}>
              <Picker selectedValue={selectedUnit} onValueChange={setSelectedUnit as any}>
                <Picker.Item label="-- Choose unit --" value={null} />
                {filteredUnits.map(u=> <Picker.Item key={u._id} label={u.name} value={u._id} />)}
              </Picker>
            </View>
          </View>
          </>
        )}

        {canPickMember && (
          <>
            <View style={styles.field}>
              <Text style={styles.label}>Select Member</Text>
              <TouchableOpacity style={styles.memberSelect} onPress={()=> setMemberPickerOpen(true)}>
                {(() => {
                  const current = members.find((m:any)=> m._id===selectedMember);
                  const name = current ? `${current.title? current.title+' ':''}${current.firstName||''} ${current.surname||''}`.trim() : '-- Choose member --';
                  return (
                    <View style={{ flexDirection:'row', alignItems:'center' }}>
                      {current?.profile?.avatar ? (
                        <Image source={{ uri: current.profile.avatar }} style={styles.avatar} />
                      ) : (
                        <View style={[styles.avatar, styles.avatarFallback]} />
                      )}
                      <Text style={[styles.memberSelectText, !current && { color:'#9CA3AF' }]}>{name || '-- Choose member --'}</Text>
                    </View>
                  );
                })()}
                <Ionicons name="chevron-down" color="#64748b" size={18} />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Attendance + Music for SuperAdmin/MinistryAdmin */}
        {(role==='SuperAdmin' || role==='MinistryAdmin') && (
          <TouchableOpacity style={styles.checkbox} onPress={()=> setAttendanceTaking(v=>!v)}>
            <View style={[styles.box, attendanceTaking && styles.boxOn]} />
            <Text style={styles.cbText}>Attendance Taking Unit</Text>
          </TouchableOpacity>
        )}
        {(role==='SuperAdmin' || role==='MinistryAdmin') && (
          <TouchableOpacity style={styles.checkbox} onPress={()=> setMusicUnit(v=>!v)}>
            <View style={[styles.box, musicUnit && styles.boxOn]} />
            <Text style={styles.cbText}>Music Unit (Songs Released)</Text>
          </TouchableOpacity>
        )}

        {/* UnitLeader member duties */}
        {role==='UnitLeader' && (
          <>
            <TouchableOpacity style={styles.checkbox} onPress={()=> setMakeFinSec(v=>!v)}>
              <View style={[styles.box, makeFinSec && styles.boxOn]} />
              <Text style={styles.cbText}>Make Financial Secretary</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.checkbox} onPress={()=> setDutyApproveMembers(v=>!v)}>
              <View style={[styles.box, dutyApproveMembers && styles.boxOn]} />
              <Text style={styles.cbText}>Approve Members</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.checkbox} onPress={()=> setDutyCreateWorkPlan(v=>!v)}>
              <View style={[styles.box, dutyCreateWorkPlan && styles.boxOn]} />
              <Text style={styles.cbText}>Create Work Plan</Text>
            </TouchableOpacity>
          </>
        )}

        {isSuper && (
          <View style={{ marginTop: 18 }}>
            <Text style={[styles.label, { marginBottom:8 }]}>Assign Cards to Units</Text>
            {assignableCards.map(c => (
              <TouchableOpacity key={c.key} style={styles.checkbox} onPress={()=> setSelectedCardKeys(prev=> prev.includes(c.key) ? prev.filter(k=>k!==c.key) : [...prev, c.key])}>
                <View style={[styles.box, selectedCardKeys.includes(c.key) && styles.boxOn]} />
                <Text style={styles.cbText}>{c.label}</Text>
              </TouchableOpacity>
            ))}
            <Text style={[styles.label, { marginTop:12 }]}>Select Units (multi)</Text>
            <View style={{ borderWidth:1, borderColor:'#e2e8f0', borderRadius:10, paddingVertical:6, paddingHorizontal:10 }}>
              {(filteredUnits||[]).map((u:any)=>(
                <TouchableOpacity key={u._id} style={styles.checkbox} onPress={()=> setSelectedUnitsForCards(prev=> prev.includes(u._id) ? prev.filter(x=>x!==u._id) : [...prev, u._id])}>
                  <View style={[styles.box, selectedUnitsForCards.includes(u._id) && styles.boxOn]} />
                  <Text style={styles.cbText}>{u.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity disabled={saving || selectedCardKeys.length===0} onPress={saveCardsBulk} style={[styles.secondaryBtn, (saving || selectedCardKeys.length===0) && { opacity:0.5 }]}>
              <Text style={styles.secondaryText}>Save Cards</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          disabled={saving || (!selectedUnit) || (role==='UnitLeader' && !selectedMember)}
          onPress={()=>{
            if(role==='UnitLeader'){
              // Save duties and optional finsec
              const tasks: Promise<any>[] = [];
              // Always persist duties (both true/false) to make it idempotent
              tasks.push(saveMemberDuties());
              if(makeFinSec) tasks.push(saveFinSec());
              Promise.all(tasks).then(async()=>{ await refreshProfile(); nav.goBack(); });
              return;
            }
            // Admins: apply attendance/music
            const tasks: Promise<any>[] = [];
            if(attendanceTaking) tasks.push(saveAttendance());
            tasks.push(saveMusic());
            Promise.all(tasks).then(async()=>{ await refreshProfile(); nav.goBack(); });
          }}
          style={[styles.primaryBtn, (saving || (!selectedUnit) || (role==='UnitLeader' && !selectedMember)) && { opacity:0.5 }]}
        >
          <Text style={styles.primaryText}>{saving? 'Saving...' : 'Save'}</Text>
        </TouchableOpacity>

        {/* Current Assignments Summary */}
        {selectedUnit && (
          <View style={{ marginTop:18 }}>
            <Text style={[styles.label, { marginBottom:8 }]}>Current Assignments</Text>
            <View style={{ borderWidth:1, borderColor:'#e2e8f0', borderRadius:10 }}>
              {/* Financial Secretary */}
              <View style={styles.assignRow}>
                <Text style={styles.assignLabel}>Financial Secretary</Text>
                {finSecAssignee ? (
                  <View style={styles.assignRight}>
                    {finSecAssignee?.profile?.avatar ? (
                      <Image source={{ uri: finSecAssignee.profile.avatar }} style={styles.avatar} />
                    ) : (<View style={[styles.avatar, styles.avatarFallback]} />)}
                    <Text style={styles.assignName} numberOfLines={1}>{`${finSecAssignee.title?finSecAssignee.title+' ':''}${finSecAssignee.firstName||''} ${finSecAssignee.surname||''}`.trim()}</Text>
                    <TouchableOpacity onPress={unassignFinSec} style={styles.assignPillDanger}><Text style={styles.assignPillText}>Unassign</Text></TouchableOpacity>
                    <TouchableOpacity onPress={()=> nav.navigate('ComposeEmailScreen' as never, { prefill: { scope:'user', id: finSecAssignee._id, label: `${finSecAssignee.firstName||''} ${finSecAssignee.surname||''}`.trim() } } as any)} style={styles.assignPill}><Text style={styles.assignPillText}>Send Message</Text></TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.emptyAssign}>None</Text>
                )}
              </View>
              {/* Approve Members */}
              <View style={styles.assignRow}>
                <Text style={styles.assignLabel}>Approve Members</Text>
                {approveAssignee ? (
                  <View style={styles.assignRight}>
                    {approveAssignee?.profile?.avatar ? (
                      <Image source={{ uri: approveAssignee.profile.avatar }} style={styles.avatar} />
                    ) : (<View style={[styles.avatar, styles.avatarFallback]} />)}
                    <Text style={styles.assignName} numberOfLines={1}>{`${approveAssignee.title?approveAssignee.title+' ':''}${approveAssignee.firstName||''} ${approveAssignee.surname||''}`.trim()}</Text>
                    <TouchableOpacity onPress={()=>{ setSelectedMember(approveAssignee._id); setDutyApproveMembers(false); saveMemberDuties(); }} style={styles.assignPillDanger}><Text style={styles.assignPillText}>Unassign</Text></TouchableOpacity>
                    <TouchableOpacity onPress={()=> nav.navigate('ComposeEmailScreen' as never, { prefill: { scope:'user', id: approveAssignee._id, label: `${approveAssignee.firstName||''} ${approveAssignee.surname||''}`.trim() } } as any)} style={styles.assignPill}><Text style={styles.assignPillText}>Send Message</Text></TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.emptyAssign}>None</Text>
                )}
              </View>
              {/* Create Work Plan */}
              <View style={[styles.assignRow, { borderBottomWidth:0 }]}>
                <Text style={styles.assignLabel}>Create Work Plan</Text>
                {workPlanAssignee ? (
                  <View style={styles.assignRight}>
                    {workPlanAssignee?.profile?.avatar ? (
                      <Image source={{ uri: workPlanAssignee.profile.avatar }} style={styles.avatar} />
                    ) : (<View style={[styles.avatar, styles.avatarFallback]} />)}
                    <Text style={styles.assignName} numberOfLines={1}>{`${workPlanAssignee.title?workPlanAssignee.title+' ':''}${workPlanAssignee.firstName||''} ${workPlanAssignee.surname||''}`.trim()}</Text>
                    <TouchableOpacity onPress={()=>{ setSelectedMember(workPlanAssignee._id); setDutyCreateWorkPlan(false); saveMemberDuties(); }} style={styles.assignPillDanger}><Text style={styles.assignPillText}>Unassign</Text></TouchableOpacity>
                    <TouchableOpacity onPress={()=> nav.navigate('ComposeEmailScreen' as never, { prefill: { scope:'user', id: workPlanAssignee._id, label: `${workPlanAssignee.firstName||''} ${workPlanAssignee.surname||''}`.trim() } } as any)} style={styles.assignPill}><Text style={styles.assignPillText}>Send Message</Text></TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.emptyAssign}>None</Text>
                )}
              </View>
            </View>
          </View>
        )}

        {(role==='SuperAdmin' || role==='MinistryAdmin') && (
          <TouchableOpacity style={[styles.outlineBtn]} onPress={()=> nav.navigate('UnitAssignmentsList' as never)}>
            <Text style={[styles.outlineText]}>View Units</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      {/* Member Picker Modal */}
      <Modal animationType="slide" transparent visible={memberPickerOpen} onRequestClose={()=> setMemberPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <Text style={{ fontWeight:'800', color:NAVY }}>Select Member</Text>
              <TouchableOpacity onPress={()=> setMemberPickerOpen(false)}><Ionicons name="close" size={20} color={NAVY} /></TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 360 }}>
              {members.map((m:any)=>{
                const name = `${m.title? m.title+' ':''}${m.firstName||''} ${m.surname||''}`.trim() || 'Unnamed';
                return (
                  <TouchableOpacity key={m._id} style={styles.memberRow} onPress={()=>{ setSelectedMember(m._id); setMemberPickerOpen(false); }}>
                    {m?.profile?.avatar ? (
                      <Image source={{ uri: m.profile.avatar }} style={styles.avatar} />
                    ) : (<View style={[styles.avatar, styles.avatarFallback]} />)}
                    <View style={{ flex:1 }}>
                      <Text style={styles.memberName}>{name}</Text>
                      {m.phone ? (<Text style={styles.memberMeta}>{m.phone}</Text>) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex:1, backgroundColor: BG },
  header: { height: 52, backgroundColor: PRIMARY, flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal: 8 },
  headerTitle: { color:'#fff', fontWeight:'800', fontSize:16 },
  field: { marginBottom: 16 },
  label: { fontSize: 12, color:'#334155', marginBottom: 6, fontWeight:'700' },
  pickerWrap: { borderWidth:1, borderColor:'#e2e8f0', borderRadius:10, overflow:'hidden' },
  checkbox: { flexDirection:'row', alignItems:'center', marginTop: 10 },
  box: { width:18, height:18, borderRadius:4, borderWidth:2, borderColor: PRIMARY, marginRight: 10 },
  boxOn: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  cbText: { color:'#0f172a', fontWeight:'700' },
  primaryBtn: { marginTop: 24, backgroundColor: PRIMARY, paddingVertical: 14, borderRadius: 12, alignItems:'center', justifyContent:'center' },
  primaryText: { color:'#fff', fontWeight:'800' }
  ,secondaryBtn:{ marginTop:12, backgroundColor:PRIMARY, paddingVertical:12, borderRadius:10, alignItems:'center' },
  secondaryText:{ color:'#fff', fontWeight:'800' },
  outlineBtn:{ marginTop:14, borderWidth:2, borderColor:PRIMARY, paddingVertical:12, borderRadius:10, alignItems:'center' },
  outlineText:{ color:PRIMARY, fontWeight:'800' },
  memberSelect:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', borderWidth:1, borderColor:'#e2e8f0', borderRadius:10, paddingVertical:10, paddingHorizontal:12 },
  memberSelectText:{ marginLeft:8, fontWeight:'700', color:'#0f172a' },
  avatar:{ width:28, height:28, borderRadius:14, backgroundColor:'#e2e8f0', marginRight:8 },
  avatarFallback:{ backgroundColor:'#CBD5E1' },
  modalBackdrop:{ flex:1, backgroundColor:'rgba(0,0,0,0.25)', alignItems:'center', justifyContent:'center', padding:16 },
  modalCard:{ backgroundColor:'#fff', borderRadius:16, padding:14, width:'92%' },
  memberRow:{ flexDirection:'row', alignItems:'center', paddingVertical:10, borderBottomWidth:1, borderBottomColor:'#F1F5F9' },
  memberName:{ fontWeight:'700', color:'#0f172a' },
  memberMeta:{ fontSize:12, color:'#64748b' },
  assignRow:{ flexDirection:'row', alignItems:'center', paddingVertical:12, paddingHorizontal:12, borderBottomWidth:1, borderBottomColor:'#F1F5F9' },
  assignLabel:{ width:140, fontWeight:'800', color:'#0f172a' },
  assignRight:{ flex:1, flexDirection:'row', alignItems:'center' },
  assignName:{ flex:1, fontWeight:'700', color:'#0f172a' },
  emptyAssign:{ color:'#64748b', fontStyle:'italic' },
  assignPill:{ backgroundColor:PRIMARY, paddingHorizontal:10, paddingVertical:8, borderRadius:999, marginLeft:8 },
  assignPillDanger:{ backgroundColor:'#ef4444', paddingHorizontal:10, paddingVertical:8, borderRadius:999, marginLeft:8 },
  assignPillText:{ color:'#fff', fontWeight:'800', fontSize:12 }
});
