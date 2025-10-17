import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, Modal, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URl } from 'api/users';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PRIMARY_BLUE = '#349DC5';

interface PendingUser { _id: string; firstName: string; surname: string; email?: string; phone?: string; ministryName?: string; roles: { role: string; ministryName?: string }[] }

const ApproveMinistryAdminsScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [modalType, setModalType] = useState<'approve' | 'deny' | null>(null);
  const [target, setTarget] = useState<PendingUser | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const nav = useNavigation();
  const insets = useSafeAreaInsets();

  const fetchPending = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      const resp = await axios.get(`${BASE_URl}/api/users/pending/list?type=ministry-admins`, { headers: { Authorization: `Bearer ${token}` } });
      const list: PendingUser[] = resp.data.users || [];
      const filtered = list.filter(u => (u.roles || []).some(r => r.role === 'MinistryAdmin'));
      setUsers(filtered);
    } catch (e) { console.log('fetch ministry admins error', e); }
    finally { setLoading(false); }
  };

  useEffect(()=> { fetchPending(); }, []);

  const openModal = (type: 'approve' | 'deny', user: PendingUser) => { setTarget(user); setModalType(type); };
  const closeModal = () => { if (!submitting) { setModalType(null); setTarget(null); } };
  const approve = async () => {
    if (!target) return; setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const resp = await axios.post(`${BASE_URl}/api/users/approve`, { userId: target._id }, { headers: { Authorization: `Bearer ${token}` } });
      if (resp.data.ok) setUsers(u => u.filter(x => x._id !== target._id));
      closeModal();
    } catch(e){ console.log('approve ministry admin error', e); setSubmitting(false);} }
  const deny = async () => {
    if (!target) return; setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const resp = await axios.post(`${BASE_URl}/api/users/reject`, { userId: target._id }, { headers: { Authorization: `Bearer ${token}` } });
      if (resp.data.ok) setUsers(u => u.filter(x => x._id !== target._id));
      closeModal();
    } catch(e){ console.log('deny ministry admin error', e); setSubmitting(false);} }

  const empty = !loading && users.length === 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle='dark-content' />
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}> 
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name='chevron-back' size={24} color='#000' />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Approve Ministry Admins</Text>
      </View>
      <ScrollView contentContainerStyle={[styles.container, empty && styles.emptyContent]} showsVerticalScrollIndicator={false}>
        {loading && <ActivityIndicator style={{ marginTop:20 }} color={PRIMARY_BLUE} />}
        {empty && <Text style={styles.emptyText}>No pending ministry admin registrations</Text>}
        {users.map(u => (
          <View key={u._id} style={styles.card}>
            <View style={{ flex:1 }}>
              <Text style={styles.name}>{u.firstName} {u.surname}</Text>
              <Text style={styles.meta}>{u.ministryName || (u.roles.find(r=>r.role==='MinistryAdmin')?.ministryName) || 'Ministry'}  |  {u.email}</Text>
              <View style={styles.actionsRow}>
                <TouchableOpacity style={[styles.pillBtn, styles.approveBtn]} onPress={()=> openModal('approve', u)}>
                  <Text style={styles.pillText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.pillBtn, styles.denyBtn]} onPress={()=> openModal('deny', u)}>
                  <Text style={styles.pillText}>Deny</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
      <Modal animationType='fade' transparent visible={!!modalType} onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <TouchableOpacity style={styles.closeX} onPress={closeModal} disabled={submitting}>
              <Ionicons name='close' size={22} color='#0B2540' />
            </TouchableOpacity>
            <Text style={styles.modalQuestion}>{modalType==='approve' ? 'Approve this ministry admin?' : 'Deny this ministry admin?'}</Text>
            <Text style={styles.modalBody}>This will {modalType==='approve' ? 'grant' : 'remove'} ministry admin privileges for <Text style={styles.bold}>{target?.firstName} {target?.surname}</Text>.</Text>
            <View style={styles.modalButtonsRow}>
              {modalType === 'approve' ? (
                <>
                  <TouchableOpacity disabled={submitting} onPress={approve} style={[styles.dialogBtn, styles.dialogApprove]}>
                    <Text style={styles.dialogBtnText}>{submitting ? '...' : 'Yes, Approve'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity disabled={submitting} onPress={closeModal} style={[styles.dialogBtn, styles.dialogCancelAlt]}>
                    <Text style={styles.dialogBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity disabled={submitting} onPress={deny} style={[styles.dialogBtn, styles.dialogDeny]}>
                    <Text style={styles.dialogBtnText}>{submitting ? '...' : 'Yes, Deny'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity disabled={submitting} onPress={closeModal} style={[styles.dialogBtn, styles.dialogCancelAlt]}>
                    <Text style={styles.dialogBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </>
              )}
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
  denyBtn:{ backgroundColor:'#E11D48' },
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
  dialogDeny:{ backgroundColor:'#E11D48' },
  dialogCancelAlt:{ backgroundColor:'#9CA3AF' },
  dialogBtnText:{ color:'#fff', fontSize:13, fontWeight:'600' }
});

export default ApproveMinistryAdminsScreen;