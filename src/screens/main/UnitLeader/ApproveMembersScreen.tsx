import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, Modal, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BASE_URl } from '../../../api/users';

const PRIMARY_BLUE = '#349DC5';

interface PendingUser { _id: string; firstName: string; surname: string; email?: string; phone?: string; roles: { role: string; unit?: { _id: string; name: string } | null }[] }

const ApproveMembersScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [target, setTarget] = useState<PendingUser | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const nav = useNavigation();
  const insets = useSafeAreaInsets();

  const fetchPending = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      // For UnitLeader: backend listPending auto-scopes to members in their units
      const resp = await axios.get(`${BASE_URl}/api/users/pending/list`, { headers: { Authorization: `Bearer ${token}` } });
      const list: PendingUser[] = resp.data.users || [];
      // Retain only Members
      const filtered = list.filter(u => (u.roles || []).some(r => r.role === 'Member'));
      setUsers(filtered);
    } catch (e) { console.log('fetch pending members error', e); }
    finally { setLoading(false); }
  };

  useEffect(()=> { fetchPending(); }, []);

  const openApprove = (user: PendingUser) => { setTarget(user); setModalOpen(true); };
  const closeModal = () => { if (!submitting) { setModalOpen(false); setTarget(null); } };
  const approve = async () => {
    if (!target) return; setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const resp = await axios.post(`${BASE_URl}/api/users/approve`, { userId: target._id }, { headers: { Authorization: `Bearer ${token}` } });
      if (resp.data.ok) setUsers(u => u.filter(x => x._id !== target._id));
      closeModal();
    } catch(e){ console.log('approve member error', e); setSubmitting(false);} }

  const empty = !loading && users.length === 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle='dark-content' />
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}> 
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name='chevron-back' size={24} color='#000' />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Approve Members</Text>
      </View>
      <ScrollView contentContainerStyle={[styles.container, empty && styles.emptyContent]} showsVerticalScrollIndicator={false}>
        {loading && <ActivityIndicator style={{ marginTop:20 }} color={PRIMARY_BLUE} />}
        {empty && <Text style={styles.emptyText}>No pending members</Text>}
        {users.map(u => {
          const unitName = (u.roles||[]).find(r=>r.role==='Member' && r.unit)?.unit?.name || 'Unit';
          return (
            <View key={u._id} style={styles.card}>
              <View style={{ flex:1 }}>
                <Text style={styles.name}>{u.firstName} {u.surname}</Text>
                <Text style={styles.meta}>{unitName}  |  {u.email || u.phone || ''}</Text>
                <View style={styles.actionsRow}>
                  <TouchableOpacity style={[styles.pillBtn, styles.approveBtn]} onPress={()=> openApprove(u)}>
                    <Text style={styles.pillText}>Approve</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <Modal animationType='fade' transparent visible={!!modalOpen} onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <TouchableOpacity style={styles.closeX} onPress={closeModal} disabled={submitting}>
              <Ionicons name='close' size={22} color='#0B2540' />
            </TouchableOpacity>
            <Text style={styles.modalQuestion}>Approve this member?</Text>
            <Text style={styles.modalBody}>This will grant full access to <Text style={styles.bold}>{target?.firstName} {target?.surname}</Text>.</Text>
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity disabled={submitting} onPress={approve} style={[styles.dialogBtn, styles.dialogApprove]}>
                <Text style={styles.dialogBtnText}>{submitting ? '...' : 'Yes, Approve'}</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={submitting} onPress={closeModal} style={[styles.dialogBtn, styles.dialogCancelAlt]}>
                <Text style={styles.dialogBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea:{ flex:1, backgroundColor:'#fff' },
  header:{ flexDirection:'row', alignItems:'center', zIndex:20, paddingHorizontal:16, paddingBottom:8, backgroundColor:'#fff', borderBottomWidth:1, borderBottomColor:'#EEF2F5' },
  backBtn:{ padding:4, marginRight:4 },
  headerTitle:{ flex:1, textAlign:'left', fontSize:16, fontWeight:'600', color:'#0B2540' },
  container:{ padding:16, paddingBottom:40 },
  emptyContent:{ flexGrow:1, justifyContent:'center' },
  card:{ flexDirection:'row', backgroundColor:'#F5F9FC', borderRadius:14, padding:14, marginBottom:14, borderWidth:1, borderColor:'#E3EDF3' },
  name:{ fontSize:14, fontWeight:'600', color:'#111827' },
  meta:{ fontSize:11, color:'#374151', marginTop:4, marginBottom:8 },
  actionsRow:{ flexDirection:'row', gap:10 },
  pillBtn:{ flex:1, height:40, borderRadius:999, alignItems:'center', justifyContent:'center' },
  approveBtn:{ backgroundColor:PRIMARY_BLUE },
  pillText:{ color:'#fff', fontSize:13, fontWeight:'600' },
  emptyText:{ textAlign:'center', fontSize:13, color:'#6B7280' },
  modalBackdrop:{ flex:1, backgroundColor:'rgba(0,0,0,0.25)', alignItems:'center', justifyContent:'center', padding:24 },
  modalCard:{ backgroundColor:'#fff', borderRadius:20, padding:24, width:'100%', position:'relative' },
  closeX:{ position:'absolute', top:12, right:12, padding:4 },
  modalQuestion:{ fontSize:16, fontWeight:'700', color:'#0B2540', marginTop:4, marginBottom:14, textAlign:'center' },
  modalBody:{ fontSize:13, color:'#183B56', lineHeight:20, marginBottom:22, textAlign:'center' },
  bold:{ fontWeight:'700', color:'#0B2540' },
  modalButtonsRow:{ flexDirection:'row', gap:12 },
  dialogBtn:{ flex:1, height:46, borderRadius:999, alignItems:'center', justifyContent:'center', paddingHorizontal:10 },
  dialogApprove:{ backgroundColor:PRIMARY_BLUE },
  dialogCancelAlt:{ backgroundColor:'#9CA3AF' },
  dialogBtnText:{ color:'#fff', fontSize:13, fontWeight:'600' }
});

export default ApproveMembersScreen;
