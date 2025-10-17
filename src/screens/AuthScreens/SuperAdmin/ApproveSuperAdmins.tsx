import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Image, ActivityIndicator, Modal, StatusBar, InteractionManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URl } from 'api/users';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ModernLoader from '../../../loader/load';
import Toast from 'react-native-toast-message';

const PRIMARY_BLUE = '#349DC5';
const AVATAR_PLACEHOLDER = 'https://www.w3schools.com/w3images/avatar2.png';

interface PendingSuperAdmin { _id: string; firstName: string; surname: string; email?: string; phone?: string; approved?: boolean; superAdminPending?: boolean; multi?: boolean }

const ApproveSuperAdminsScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<PendingSuperAdmin[]>([]);
  const [modalType, setModalType] = useState<'approve' | 'deny' | null>(null);
  const [target, setTarget] = useState<PendingSuperAdmin | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [forbidden, setForbidden] = useState<string | null>(null);
  const nav = useNavigation();
  const insets = useSafeAreaInsets();

  const fetchPending = async () => {
    try {
      setLoading(true);
      setForbidden(null);
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      const resp = await axios.get(`${BASE_URl}/api/superadmins/pending`, { headers: { Authorization: `Bearer ${token}` } });
      if (resp.status === 200 && resp.data?.ok) {
        setUsers(resp.data.users || []);
      } else {
        setUsers([]);
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message;
      const status = e?.response?.status;
      if (status === 403) setForbidden(msg || 'Forbidden');
      else if (status === 404) { /* route not available on this backend */ setUsers([]); }
      else { /* Other errors: keep quiet to avoid log spam, leave users empty */ setUsers([]); }
    } finally { setLoading(false); }
  };

  // Defer fetching until after navigation transitions/insertions settle to avoid scheduling updates during insertion
  useFocusEffect(React.useCallback(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      fetchPending();
    });
    return () => task.cancel();
  }, []));

  const openModal = (type: 'approve' | 'deny', user: PendingSuperAdmin) => { setTarget(user); setModalType(type); };
  const closeModal = () => { if (!submitting) { setModalType(null); setTarget(null); } };

  const approve = async () => {
    if (!target) return; setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const resp = await axios.post(`${BASE_URl}/api/superadmins/approve`, { userId: target._id }, { headers: { Authorization: `Bearer ${token}` } });
      if (resp.data?.ok) {
        setUsers(u => u.filter(x => x._id !== target._id));
        Toast.show({ type: 'success', text1: 'Approved', text2: `${target.firstName} ${target.surname} is now a Super Admin` });
      }
      setSubmitting(false);
      closeModal();
    } catch (e) { console.log('approve superadmin error', e); setSubmitting(false); }
  };

  const deny = async () => {
    if (!target) return; setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const resp = await axios.post(`${BASE_URl}/api/users/reject`, { userId: target._id }, { headers: { Authorization: `Bearer ${token}` } });
      if (resp.data?.ok) {
        setUsers(u => u.filter(x => x._id !== target._id));
        Toast.show({ type: 'success', text1: 'Denied', text2: `${target.firstName} ${target.surname} request denied` });
      }
      setSubmitting(false);
      closeModal();
    } catch (e) { console.log('deny superadmin error', e); setSubmitting(false); }
  };

  const empty = !loading && users.length === 0 && !forbidden;

  const EmptyIllustration = () => (
    <View style={styles.illustrationWrapper}>
      <View style={styles.illusContainer}>
        <View style={[styles.sheet, styles.sheetBehind]}>
          <View style={[styles.hole, { left: 18 }]} />
          <View style={[styles.hole, { right: 18 }]} />
          <View style={[styles.clipBar, styles.clipBarAngled]} />
        </View>
        <View style={[styles.sheet, styles.sheetFront]}>
          <View style={[styles.hole, { left: 28 }]} />
          <View style={[styles.hole, { right: 28 }]} />
          <View style={styles.clipBarTop} />
          <View style={styles.placeholderBlock} />
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Approve Super Admins</Text>
      </View>
      <ScrollView contentContainerStyle={[styles.container, empty && styles.emptyContent]} showsVerticalScrollIndicator={false}>
        {loading && (
          <View style={{ marginTop: 20 }}>
            <ModernLoader fullscreen={false} spinnerSize={60} ringWidth={6} logoSize={34} />
          </View>
        )}
        {forbidden && !loading && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Not allowed</Text>
            <Text style={styles.emptyText}>{forbidden || 'Only multi SuperAdmins can approve SuperAdmins.'}</Text>
          </View>
        )}
        {empty && (
          <View style={styles.emptyBox}>
            <EmptyIllustration />
            <Text style={styles.emptyTitle}>No Pending Approvals</Text>
            <Text style={styles.emptyText}>No pending superadmin registrations</Text>
          </View>
        )}
        {users.map(u => (
          <View key={u._id} style={styles.card}>
            <View style={styles.avatarWrap}>
              <Image source={{ uri: AVATAR_PLACEHOLDER }} style={styles.avatar} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{u.firstName} {u.surname} | <Text style={styles.unit}>Super Admin</Text></Text>
              <Text style={styles.meta}>📞 {u.phone || 'N/A'}  |  {u.email || ''}</Text>
              <View style={styles.actionsRow}>
                <TouchableOpacity style={[styles.pillBtn, styles.approveBtn]} onPress={() => openModal('approve', u)}>
                  <Text style={styles.pillText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.pillBtn, styles.denyBtn]} onPress={() => openModal('deny', u)}>
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
              <Ionicons name="close" size={22} color="#0B2540" />
            </TouchableOpacity>
            <Text style={styles.modalQuestion}>
              {modalType === 'approve' ? 'Approve this superadmin?' : 'Deny this superadmin?'}
            </Text>
            <Text style={styles.modalBody}>
              This will {modalType === 'approve' ? 'grant' : 'remove'} SuperAdmin privileges for <Text style={styles.bold}>{target?.firstName} {target?.surname}</Text>.
            </Text>
            <View style={styles.modalButtonsRow}>
              {modalType === 'approve' ? (
                <>
                  <TouchableOpacity disabled={submitting} onPress={approve} style={[styles.dialogBtn, styles.dialogApprove]}>
                    <Text style={styles.dialogBtnText}>{submitting ? '...' : 'Yes, Approve'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity disabled={submitting} onPress={closeModal} style={[styles.dialogBtn, styles.dialogCancelAlt]}>
                    <Text style={styles.dialogBtnText}>No, Cancel</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity disabled={submitting} onPress={deny} style={[styles.dialogBtn, styles.dialogDeny]}>
                    <Text style={styles.dialogBtnText}>{submitting ? '...' : 'Yes, Deny'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity disabled={submitting} onPress={closeModal} style={[styles.dialogBtn, styles.dialogCancelAlt]}>
                    <Text style={styles.dialogBtnText}>No, Cancel</Text>
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
  safeArea: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', zIndex: 20, paddingHorizontal: 16, paddingBottom: 8, backgroundColor:'#fff', borderBottomWidth:1, borderBottomColor:'#EEF2F5' },
  backBtn: { padding: 4, marginRight: 4 },
  headerTitle: { flex: 1, textAlign: 'left', fontSize: 16, fontWeight: '600', color: '#0B2540' },
  container: { padding: 16, paddingBottom: 40 },
  emptyContent:{ flexGrow:1, justifyContent:'center' },
  card: { flexDirection: 'row', backgroundColor: '#F5F9FC', borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#E3EDF3' },
  avatarWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 14, borderWidth: 2, borderColor: PRIMARY_BLUE },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#E5E7EB' },
  name: { fontSize: 14, fontWeight: '600', color: '#111827' },
  unit: { color: PRIMARY_BLUE, fontWeight: '600' },
  meta: { fontSize: 11, color: '#374151', marginTop: 4, marginBottom: 8 },
  actionsRow: { flexDirection: 'row', gap: 10 },
  pillBtn: { flex: 1, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  approveBtn: { backgroundColor: PRIMARY_BLUE },
  denyBtn: { backgroundColor: '#E11D48' },
  pillText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  emptyBox: { alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginBottom: 6, color: '#111' },
  emptyText: { fontSize: 13, color: '#6B7280' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', position: 'relative' },
  closeX: { position: 'absolute', top: 12, right: 12, padding: 4 },
  modalQuestion: { fontSize: 16, fontWeight: '700', color: '#0B2540', marginTop: 4, marginBottom: 14, textAlign: 'center' },
  modalBody: { fontSize: 13, color: '#183B56', lineHeight: 20, marginBottom: 22, textAlign: 'center' },
  bold: { fontWeight: '700', color: '#0B2540' },
  modalButtonsRow: { flexDirection: 'row', gap: 12 },
  dialogBtn: { flex: 1, height: 46, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  dialogApprove: { backgroundColor: PRIMARY_BLUE },
  dialogDeny: { backgroundColor: '#E11D48' },
  dialogCancelAlt: { backgroundColor: '#9CA3AF' },
  dialogBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  illustrationWrapper: { marginTop: 10, marginBottom: 12 },
  illusContainer: { width: 220, height: 180, alignItems: 'center', justifyContent: 'center' },
  sheet: { position: 'absolute', width: 160, height: 120, backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#0B2540', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  sheetBehind: { transform: [{ rotate: '-12deg' }], top: 20 },
  sheetFront: { transform: [{ rotate: '3deg' }], top: 25 },
  hole: { position: 'absolute', top: 10, width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff', borderWidth: 2, borderColor: '#0B2540' },
  clipBar: { position: 'absolute', width: 70, height: 10, borderRadius: 4, backgroundColor: PRIMARY_BLUE, top: 18, left: 45 },
  clipBarAngled: { transform: [{ rotate: '-8deg' }] },
  clipBarTop: { position: 'absolute', width: 90, height: 22, borderRadius: 4, backgroundColor: PRIMARY_BLUE, top: 10, left: 35 },
  placeholderBlock: { position: 'absolute', width: 140, height: 95, backgroundColor: '#E5E7EB', top: 40, left: 10, borderRadius: 6 }
});

export default ApproveSuperAdminsScreen;
