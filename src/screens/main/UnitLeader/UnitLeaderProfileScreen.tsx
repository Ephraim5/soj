import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, StatusBar, Platform, TextInput, Switch, ScrollView, Linking, Dimensions } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NavigationProp, RouteProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import Toast from 'react-native-toast-message';
import axios from 'axios';
import { BASE_URl } from '../../../api/users';
import { Ionicons, Feather, MaterialIcons, AntDesign } from '@expo/vector-icons';
import ModernLoader from '../../../loader/load';
import { useMinimumLoader } from '../../../hooks/useMinimumLoader';
import { getUnitSummaryById, type UnitSummaryResponse } from '../../../api/unitSummary';
import { heightPercentageToDP } from 'react-native-responsive-screen';

// We reuse same RootStack params; ensure Navigation.tsx updated with UnitLeaderProfile route
type RouteParams = { userId?: string; leaderId?: string; unitId?: string } | undefined;

export default function UnitLeaderProfileScreen(): React.ReactElement {
  const navigation = useNavigation<NavigationProp<any>>();
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const viewingUserId = (route.params as any)?.userId || (route.params as any)?.leaderId || null;
  const viewingUnitId = (route.params as any)?.unitId || null;
  const readOnly = !!viewingUserId; // SuperAdmin viewing someone else
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [surname, setSurname] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [notifUnitReports, setNotifUnitReports] = useState(true);
  const [notifChurchAnnouncements, setNotifChurchAnnouncements] = useState(true);
  const [notifFinancial, setNotifFinancial] = useState(true);
  const [notifEvents, setNotifEvents] = useState(true);
  const [unitSummary, setUnitSummary] = useState<UnitSummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [unit, setUnit] = useState("");

  const showProfileLoader = useMinimumLoader(loading, { minVisibleMs: 800, showDelayMs: 120 });

  const loadUser = useCallback(async () => {
    try {
      setLoading(true);
      const raw = await AsyncStorage.getItem('user');
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');

      if (viewingUserId) {
        // SuperAdmin viewing a leader/member profile
  const res = await axios.get(`${BASE_URl}/api/users/${viewingUserId}`, { headers: { Authorization: `Bearer ${token}` } });
        const u = res.data?.user || res.data; // controller returns { ok, user }
        if (u && u._id) {
          setUserId(u._id);
           setUnit(u.unit)
          setFirstName(u.firstName || '');
          setMiddleName(u.middleName || '');
          setSurname(u.surname || '');
          setPhone(u.phone || '');
          setEmail(u.email || '');
          setTitle(u.title || '');
          setProfileImage(u?.profile?.avatar || null);
        }
      } else {
        // Self profile
        if (raw) {
          const cached = JSON.parse(raw);
          setUserId(cached._id);
        }
  const res = await axios.get(`${BASE_URl}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.data?.ok) {
          const u = res.data.user;
          setUnit(u.unit)
          setFirstName(u.firstName || '');
          setMiddleName(u.middleName || '');
          setSurname(u.surname || '');
          setPhone(u.phone || '');
          setEmail(u.email || '');
          setTitle(u.title || '');
          setProfileImage(u?.profile?.avatar || null);
          await AsyncStorage.setItem('user', JSON.stringify({ ...(JSON.parse(raw || '{}')), ...u }));
        }
      }
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Failed to load profile', text2: e.message });
    } finally { 
      setLoading(false); 
    }
  }, [viewingUserId]);

  useEffect(() => { loadUser(); }, [loadUser]);

  // Load SuperAdmin unit summary for read-only view
  useEffect(() => {
    const run = async () => {
      try {
        if (!readOnly || !viewingUnitId) { setUnitSummary(null); return; }
        setSummaryLoading(true);
        const token = await AsyncStorage.getItem('token');
        if (!token) return;
        const data = await getUnitSummaryById(token, viewingUnitId);
        if (data?.ok) setUnitSummary(data);
      } catch (e) {
        // no-op; could toast
      } finally { setSummaryLoading(false); }
    };
    run();
  }, [readOnly, viewingUnitId]);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 1 });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      const cropped = await ImageManipulator.manipulateAsync(asset.uri, [{ resize: { width: 600 } }], { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG });
      setProfileImage(cropped.uri); // optimistic
      if (!userId) { Toast.show({ type: 'error', text1: 'Cannot upload', text2: 'Missing user id' }); return; }
      const token = await AsyncStorage.getItem('token');
      if (!token) { Toast.show({ type: 'error', text1: 'Not authenticated' }); return; }
      const formData = new FormData();
      formData.append('file', { uri: cropped.uri, name: 'avatar.jpg', type: 'image/jpeg' } as any);
      formData.append('userId', userId);
      try {
  const uploadRes = await fetch(`${BASE_URl}/api/upload/profile`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData as any });
        const data = await uploadRes.json();
        if (data?.ok && data.url) {
          setProfileImage(data.url);
          const raw = await AsyncStorage.getItem('user');
          if (raw) { const parsed = JSON.parse(raw); parsed.profile = parsed.profile || {}; parsed.profile.avatar = data.url; await AsyncStorage.setItem('user', JSON.stringify(parsed)); }
          Toast.show({ type: 'success', text1: 'Avatar updated' });
        } else { Toast.show({ type: 'error', text1: 'Upload failed', text2: data?.error || 'Unknown error' }); }
      } catch (e: any) { Toast.show({ type: 'error', text1: 'Upload error', text2: e.message }); }
    } catch (e: any) { Toast.show({ type: 'error', text1: 'Image pick failed', text2: e.message }); }
  };

  const saveProfile = async () => {
    if (!userId) return;
    try {
      setSavingProfile(true);
      const token = await AsyncStorage.getItem('token');
  const res = await axios.put(`${BASE_URl}/api/users/${userId}`, { firstName, middleName, surname, phone, title }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data?.ok) {
        Toast.show({ type: 'success', text1: 'Profile updated' });
        const cachedRaw = await AsyncStorage.getItem('user');
        if (cachedRaw) { const cached = JSON.parse(cachedRaw); Object.assign(cached, { firstName, middleName, surname, phone, title }); await AsyncStorage.setItem('user', JSON.stringify(cached)); }
        setEditModalVisible(false);
      } else { Toast.show({ type: 'error', text1: 'Update failed', text2: res.data?.message || 'Unknown error' }); }
    } catch (e: any) { Toast.show({ type: 'error', text1: 'Update failed', text2: e?.response?.data?.message || e.message }); }
    finally { setSavingProfile(false); }
  };

  const submitChangePassword = async () => {
    if (!currentPassword || !newPassword) { Toast.show({ type: 'error', text1: 'Fill all password fields' }); return; }
    if (newPassword !== confirmPassword) { Toast.show({ type: 'error', text1: 'Passwords do not match' }); return; }
    try {
      setChangingPassword(true);
      const token = await AsyncStorage.getItem('token');
  const res = await axios.post(`${BASE_URl}/api/users/change-password`, { currentPassword, newPassword }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data?.ok) {
        Toast.show({ type: 'success', text1: 'Password changed' });
        setPasswordModalVisible(false);
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      } else { Toast.show({ type: 'error', text1: 'Change failed', text2: res.data?.message || 'Unknown error' }); }
    } catch (e: any) { Toast.show({ type: 'error', text1: 'Change failed', text2: e?.response?.data?.message || e.message }); }
    finally { setChangingPassword(false); }
  };

  return (
    <ScrollView
      style={[styles.container, readOnly && styles.containerReadOnly]}
      contentContainerStyle={[{ paddingBottom: 40 }, readOnly && { paddingHorizontal:0 }]}>
      {readOnly ? (
        <View style={styles.readOnlyWrapper}>
          <StatusBar barStyle="light-content" />
          {/* Blue Header */}
          <View style={styles.roHeader}> 
            <View style={styles.roHeaderTopRow}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.roBackBtn}>
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.roUnitTitle} numberOfLines={1}>{unitSummary?.unit?.name || 'Unit'}</Text>
              <View style={{ width:20 }} />
            </View>
            <View style={styles.roLeaderRow}>
              <View style={styles.roAvatarWrap}>
                <TouchableOpacity onPress={() => setModalVisible(true)} activeOpacity={0.8}>
                  <View style={styles.roAvatarCircle}> 
                    <Image source={{ uri: profileImage || 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR5yTxBxqX7UPLILheEuZbgOuYver2PQLQxuQ&s' }} style={styles.roAvatarImg} />
                  </View>
                </TouchableOpacity>
              </View>
              <View style={styles.roLeaderInfo}> 
                <Text style={styles.roLeaderRole}>{title || 'Unit Leader'}</Text>
                <Text style={styles.roLeaderName} numberOfLines={1}>{[firstName, middleName, surname].filter(Boolean).join(' ') || 'Min. Name'}</Text>
              </View>
            </View>
            {viewingUnitId && (
              <View style={styles.roMembersPillRow}>
                <Text style={styles.roMembersCountLabel}>Total Unit Members: <Text style={styles.roMembersCountValue}>{unitSummary?.counts?.membersCount ?? 0}</Text></Text>
                <TouchableOpacity onPress={()=> navigation.navigate('MemberList' as any, { unitId: viewingUnitId } as any)} style={styles.roMembersBtn}>
                  <Text style={styles.roMembersBtnText}>View Members</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Financial Summary Card */}
          <View style={styles.roFinancialCard}>
            <View style={styles.roFinancialHeader}> 
              <View style={styles.roFinIconBox}><Ionicons name="cash-outline" size={20} color="#8e6cc7" /></View>
              <Text style={styles.roFinTitle}>Financial Summary</Text>
            </View>
            <View style={styles.roFinRow}> 
              <Text style={styles.roFinLabel}>Income:</Text>
              <Text style={styles.roFinValue}>₦{(unitSummary?.finance?.income || 0).toLocaleString()}</Text>
            </View>
            <View style={styles.roFinRow}> 
              <Text style={styles.roFinLabel}>Expenses:</Text>
              <Text style={styles.roFinValue}>₦{(unitSummary?.finance?.expense || 0).toLocaleString()}</Text>
            </View>
            <View style={styles.roFinRow}> 
              <Text style={styles.roFinLabel}>Surplus/Deficit:</Text>
              <Text style={styles.roFinValue}>₦{(unitSummary?.finance?.balance || 0).toLocaleString()}</Text>
            </View>
          </View>

          {/* Metrics Tiles */}
          <View style={styles.roMetricsGrid}>
            <MetricTile icon={<Ionicons name="ribbon" size={24} color="#0B6AA0" />} label="Unit Achievements" value={unitSummary?.counts?.achievementsCount ?? 0}
              onPress={() => navigation.navigate('Achievements', { readOnlySuperAdmin: true, unitId: viewingUnitId })} />
            <MetricTile icon={<Ionicons name="flame" size={24} color="#FF7A1A" />} label="Souls Won" value={unitSummary?.counts?.soulsCount ?? 0} highlight
              onPress={() => navigation.navigate('SoulsWon', { scope: 'unit', readOnlySuperAdmin: true, unitId: viewingUnitId })} />
            <MetricTile icon={<Ionicons name="hand-left" size={24} color="#4C1D95" />} label="Unit Members Assisted" value={unitSummary?.counts?.assistsCount ?? 0}
              onPress={() => navigation.navigate('MembersAssisted', { readOnlySuperAdmin: true, unitId: viewingUnitId })} />
            <MetricTile icon={<Ionicons name="people" size={24} color="#D97706" />} label="Unit Members That Got Married" value={unitSummary?.counts?.marriagesCount ?? 0}
              onPress={() => navigation.navigate('MembersMarried', { readOnlySuperAdmin: true, unitId: viewingUnitId })} />
            <MetricTile icon={<Ionicons name="git-merge" size={24} color="#111827" />} label="External Invitations & Partnerships" value={unitSummary?.counts?.invitesCount ?? 0}
              onPress={() => navigation.navigate('InvitesScreen', { readOnlySuperAdmin: true, unitId: viewingUnitId })} />
            <MetricTile icon={<Ionicons name="musical-notes" size={24} color="#B91C1C" />} label="Songs Released" value={unitSummary?.counts?.songsCount ?? 0}
              onPress={() => navigation.navigate('SongReleased', { readOnlySuperAdmin: true, unitId: viewingUnitId })} />
          </View>
        </View>
      ) : (
        <>
          <View style={styles.avatarContainer}>
            <TouchableOpacity onPress={() => setModalVisible(true)} activeOpacity={0.85}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatar} />
              ) : (
                <Image source={{ uri: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR5yTxBxqX7UPLILheEuZbgOuYver2PQLQxuQ&s' }} style={styles.avatar} />
              )}
            </TouchableOpacity>
            {!readOnly && (
              <TouchableOpacity style={styles.editAvatar} onPress={pickImage}>
                <Feather name="edit" size={20} color="#333" />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.infoBlock}>
            {showProfileLoader ? (
              <View style={{ marginTop: 10 }}>
                <ModernLoader fullscreen={false} spinnerSize={50} ringWidth={5} logoSize={32} />
                <Text style={{ marginTop: 10, color: '#349DC5', fontWeight: '600' }}>Loading profile...</Text>
              </View>
            ) : (
              <>
                <Text style={styles.role}>{title || 'Unit Leader'}</Text>
                <Text style={styles.infoName}>{[firstName, middleName, surname].filter(Boolean).join(' ')}</Text>
                <Text style={styles.infoText}>{phone}</Text>
                <Text style={styles.infoText}>{email}</Text>
                <TouchableOpacity style={styles.editProfileBtn} onPress={() => setEditModalVisible(true)}>
                  <Text style={styles.editProfileText}>Edit Personal Info</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </>
      )}

      {/* Avatar preview modal (shared) */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackground}>
          <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
            <Text style={styles.closeText}>×</Text>
          </TouchableOpacity>
          <Image source={{ uri: profileImage || 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR5yTxBxqX7UPLILheEuZbgOuYver2PQLQxuQ&s' }} style={styles.fullImage} resizeMode="contain" />
        </View>
      </Modal>

      {!readOnly && <View style={styles.divider} />}

      {!readOnly && (
        <View style={styles.menuBlock}>
          <MenuButton label="Password Setting" icon={<Feather name="lock" size={20} color="#333" />} onPress={() => setPasswordModalVisible(true)} />
          <MenuButton label="Notification Setting" icon={<Ionicons name="notifications-outline" size={20} color="#333" />} onPress={() => setNotificationModalVisible(true)} />
          <MenuButton label="Logout" icon={<MaterialIcons name="logout" size={20} color="#333" />} />
          <MenuButton label="Delete Account" icon={<AntDesign name="delete" size={20} color="#ff3b30" />} danger />
        </View>
      )}

      {/* Edit Personal Info Modal */}
      {!readOnly && (
        <Modal visible={editModalVisible} transparent animationType="slide" onRequestClose={() => setEditModalVisible(false)}>
          <View style={styles.centeredView}>
            <View style={styles.editModalView}>
              <View style={styles.editPhotoCircle}>
                {profileImage ? <Image source={{ uri: profileImage }} style={{ width: 70, height: 70, borderRadius: 35 }} /> : <Ionicons name="person" size={42} color="#fff" />}
              </View>
              <TouchableOpacity style={styles.changePhotoBtn} onPress={pickImage}><Text style={styles.changePhotoText}>Change Photo</Text></TouchableOpacity>
              <View style={styles.inputGroup}><Text style={styles.inputLabel}>First Name</Text><TextInput style={styles.input} value={firstName} onChangeText={setFirstName} /></View>
              <View style={styles.inputGroup}><Text style={styles.inputLabel}>Middle Name</Text><TextInput style={styles.input} value={middleName} onChangeText={setMiddleName} /></View>
              <View style={styles.inputGroup}><Text style={styles.inputLabel}>Surname</Text><TextInput style={styles.input} value={surname} onChangeText={setSurname} /></View>
              <View style={styles.inputGroup}><Text style={styles.inputLabel}>Phone</Text><TextInput style={styles.input} value={phone} onChangeText={setPhone} /></View>
              <View style={styles.inputGroup}><Text style={styles.inputLabel}>Title</Text><TextInput style={styles.input} value={title} onChangeText={setTitle} /></View>
              <TouchableOpacity style={styles.saveBtn} onPress={saveProfile} disabled={savingProfile}>
                {savingProfile ? <ModernLoader fullscreen={false} spinnerSize={30} ringWidth={4} logoSize={20} /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>)}

      {/* Password Setting Modal */}
      {!readOnly && (
        <Modal visible={passwordModalVisible} transparent animationType="slide" onRequestClose={() => setPasswordModalVisible(false)}>
          <View style={styles.centeredView}>
            <View style={styles.passwordModalView}>
              <Text style={styles.passwordLabel}>Current Password</Text>
              <View style={styles.passwordInputRow}>
                <TextInput style={styles.passwordInput} secureTextEntry={!showCurrent} value={currentPassword} onChangeText={setCurrentPassword} />
                <TouchableOpacity onPress={() => setShowCurrent(s => !s)}><Feather name={showCurrent ? 'eye-off' : 'eye'} size={20} color="#333" /></TouchableOpacity>
              </View>
              <Text style={styles.passwordLabel}>New Password</Text>
              <View style={styles.passwordInputRow}>
                <TextInput style={styles.passwordInput} secureTextEntry={!showNew} value={newPassword} onChangeText={setNewPassword} />
                <TouchableOpacity onPress={() => setShowNew(s => !s)}><Feather name={showNew ? 'eye-off' : 'eye'} size={20} color="#333" /></TouchableOpacity>
              </View>
              <Text style={styles.passwordLabel}>Confirm Password</Text>
              <View style={styles.passwordInputRow}>
                <TextInput style={styles.passwordInput} secureTextEntry={!showConfirm} value={confirmPassword} onChangeText={setConfirmPassword} />
                <TouchableOpacity onPress={() => setShowConfirm(s => !s)}><Feather name={showConfirm ? 'eye-off' : 'eye'} size={20} color="#333" /></TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.saveBtn} onPress={submitChangePassword} disabled={changingPassword}>
                {changingPassword ? <ModernLoader fullscreen={false} spinnerSize={30} ringWidth={4} logoSize={20} /> : <Text style={styles.saveBtnText}>Change Password</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>)}

      {/* Notification Setting Modal */}
      {!readOnly && (
        <Modal visible={notificationModalVisible} transparent animationType="slide" onRequestClose={() => setNotificationModalVisible(false)}>
          <View style={styles.centeredView}>
            <View style={styles.notificationModalView}>
              <NotificationSwitch label="Unit Reports" value={notifUnitReports} onValueChange={setNotifUnitReports} />
              <NotificationSwitch label="Church Announcements" value={notifChurchAnnouncements} onValueChange={setNotifChurchAnnouncements} />
              <NotificationSwitch label="Financial Updates" value={notifFinancial} onValueChange={setNotifFinancial} />
              <NotificationSwitch label="Events" value={notifEvents} onValueChange={setNotifEvents} />
              <TouchableOpacity style={[styles.saveBtn, { marginTop: 20 }]} onPress={() => setNotificationModalVisible(false)}>
                <Text style={styles.saveBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>)}

    </ScrollView>
  );
}

function MenuButton({ label, icon, danger = false, onPress }: { label: string; icon: React.ReactNode; danger?: boolean; onPress?: () => void }) {
  return (
    <TouchableOpacity style={[styles.menuButton, danger && styles.dangerButton]} onPress={onPress}>
      <Text style={[styles.menuText, danger && styles.dangerText]}>{label}</Text>
      <View style={styles.menuIcon}>{icon}</View>
    </TouchableOpacity>
  );
}

function NotificationSwitch({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <View style={styles.notificationRow}>
      <Text style={styles.notificationLabel}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: '#d1e8fd', true: '#349DC5' }} thumbColor={'#fff'} />
    </View>
  );
}

function hexToRgba(hex: string, alpha: number) {
  const raw = hex.replace('#','');
  const bigint = parseInt(raw.length === 3 ? raw.split('').map(c=>c+c).join('') : raw, 16);
  const r = (bigint >> 16) & 255; const g = (bigint >> 8) & 255; const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function StatCard({ label, value, color: _unused, icon }: { label:string; value:number; color:string; icon?:string }) {
  // Unified primary palette for professional consistency
  const PRIMARY = '#349DC5';
  const iconBg = hexToRgba(PRIMARY, 0.10);
  return (
    <View style={[styles.statCard, { backgroundColor: '#fff', borderColor: hexToRgba(PRIMARY,0.30) }]}> 
      <View style={[styles.statAccentBar, { backgroundColor: PRIMARY }]} />
      <View style={styles.statInner}>
        <View style={styles.statTopRow}>
          {icon ? <View style={[styles.statIconWrap, { backgroundColor: iconBg }]}><Ionicons name={icon as any} size={18} color={PRIMARY} /></View> : null}
          <Text style={[styles.statValue, { color: PRIMARY }]} numberOfLines={1} adjustsFontSizeToFit>{(value||0).toLocaleString()}</Text>
        </View>
        <Text style={styles.statLabel} numberOfLines={2}>{label}</Text>
      </View>
    </View>
  );
}

function MetricTile({ icon, label, value, highlight, onPress }: { icon: React.ReactNode; label: string; value: number; highlight?: boolean; onPress?: () => void }) {
  const screenWidth = Dimensions.get('window').width;
  const horizontalPadding = 20; // approximate combined side spacing outside grid (roMetricsGrid horizontal padding + margins)
  const gap = 12; // gap between tiles
  const columns = 3;
  const totalGaps = gap * (columns - 1);
  const tileWidth = (screenWidth - horizontalPadding - totalGaps) / columns;
  return (
    <TouchableOpacity activeOpacity={0.75} onPress={onPress} disabled={!onPress} style={[styles.mtCard, { width: tileWidth }, highlight && styles.mtHighlight]}>
      <View style={styles.mtIcon}>{icon}</View>
      <Text style={styles.mtLabel} numberOfLines={2}>{label}</Text>
      <Text style={styles.mtValue}>{value?.toLocaleString?.() ?? value}</Text>
    </TouchableOpacity>
  );
}

function FinanceMetric({ type, label, value }: { type: 'income'|'expense'|'balance'; label: string; value: number }) {
  const map = {
    income: { color: '#10b981', icon: 'trending-up' as const },
    expense: { color: '#ef4444', icon: 'trending-down' as const },
    balance: { color: '#0b2346', icon: 'shield-checkmark' as const }
  }[type];
  return (
    <View style={[styles.financeMetric, { backgroundColor: hexToRgba(map.color, 0.08), borderColor: hexToRgba(map.color, 0.25) }]}> 
      <View style={styles.financeMetricHeader}>
        <View style={[styles.financeMetricIconWrap, { backgroundColor: hexToRgba(map.color, 0.18) }]}>
          <Ionicons name={map.icon} size={16} color={map.color} />
        </View>
        <Text style={[styles.financeMetricLabel, { color: map.color }]}>{label}</Text>
      </View>
      <Text style={[styles.financeMetricValue, { color: map.color }]}>₦{(value || 0).toLocaleString()}</Text>
    </View>
  );
}

// Finance summary row (improved layout usage)
function FinanceRow({ type, label, value }: { type:'income'|'expense'|'balance'; label:string; value:number }) {
  // Unified color scheme; only icon shape varies
  const PRIMARY = '#349DC5';
  const iconMap = {
    income: 'trending-up' as const,
    expense: 'trending-down' as const,
    balance: 'shield-checkmark' as const
  };
  const icon = iconMap[type];
  return (
    <View style={styles.financeImprovedRow}>
      <View style={[styles.financeImprovedIconWrap, { backgroundColor: hexToRgba(PRIMARY,0.18) }]}> 
        <Ionicons name={icon} size={16} color={PRIMARY} />
      </View>
      <Text style={[styles.financeImprovedLabel, { color: PRIMARY }]}>{label}</Text>
      <Text style={[styles.financeImprovedValue, { color: PRIMARY }]}>₦{(value||0).toLocaleString()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 14, paddingTop: 0, backgroundColor: '#F5F6F8' },
  containerReadOnly:{ paddingHorizontal:0 },
  readOnlyWrapper:{ flex:1, paddingBottom:24 },
  roHeader:{ backgroundColor:'#0C7FB3', paddingTop:50, paddingHorizontal:18, paddingBottom:18, borderBottomLeftRadius:0, borderBottomRightRadius:0 },
  roHeaderTopRow:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:18 },
  roBackBtn:{ width:34, height:34, borderRadius:17, backgroundColor:'rgba(255,255,255,0.18)', alignItems:'center', justifyContent:'center' },
  roUnitTitle:{ flex:1, textAlign:'center', fontSize:18, fontWeight:'700', color:'#ffffff', letterSpacing:0.3 },
  roLeaderRow:{ flexDirection:'row', alignItems:'center', marginBottom:16 },
  roAvatarWrap:{ marginRight:12 },
  roAvatarCircle:{ width:40, height:40, borderRadius:20, backgroundColor:'#083E52', alignItems:'center', justifyContent:'center' },
  roAvatarImg:{ width:40, height:40, borderRadius:20 },
  roLeaderInfo:{ flex:1 },
  roLeaderRole:{ fontSize:12, fontWeight:'600', color:'#E0F4FA', marginBottom:2 },
  roLeaderName:{ fontSize:14, fontWeight:'700', color:'#ffffff' },
  roMembersPillRow:{ flexDirection:'row', alignItems:'center', backgroundColor:'#ffffff', paddingHorizontal:14, paddingVertical:10, borderRadius:8, marginTop:4, gap:12, alignSelf:'flex-start' },
  roMembersCountLabel:{ fontSize:13, fontWeight:'600', color:'#0E3752' },
  roMembersCountValue:{ fontWeight:'800' },
  roMembersBtn:{ backgroundColor:'#0C7FB3', paddingHorizontal:14, paddingVertical:6, borderRadius:6 },
  roMembersBtnText:{ color:'#fff', fontSize:12, fontWeight:'600' },
  roFinancialCard:{ backgroundColor:'#ffffff', marginTop:20, marginHorizontal:10, borderRadius:10, padding:16, shadowColor:'#000', shadowOpacity:0.04, shadowRadius:8, elevation:3 },
  roFinancialHeader:{ flexDirection:'row', alignItems:'center', marginBottom:14 },
  roFinIconBox:{ width:38, height:38, borderRadius:8, backgroundColor:'#F1EFF6', alignItems:'center', justifyContent:'center', marginRight:10 },
  roFinTitle:{ fontSize:14, fontWeight:'700', color:'#2D1F52' },
  roFinRow:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:8 },
  roFinLabel:{ fontSize:14, color:'#3C4A55', fontWeight:'600' },
  roFinValue:{ fontSize:14, color:'#111827', fontWeight:'700' },
  roMetricsGrid:{ flexDirection:'row', flexWrap:'wrap', justifyContent:'space-between', paddingHorizontal:10, marginTop:26 },
  mtCard:{ backgroundColor:'#ffffff', borderRadius:10, paddingVertical:14, paddingHorizontal:8, marginBottom:12, alignItems:'center', justifyContent:'center', shadowColor:'#000', shadowOpacity:0.03, shadowRadius:6, elevation:2 },
  mtHighlight:{ borderWidth:2, borderColor:'#FF7A1A22' },
  mtIcon:{ marginBottom:6 },
  mtLabel:{ fontSize:11, fontWeight:'600', color:'#111827', textAlign:'center', lineHeight:14, marginBottom:4 },
  mtValue:{ fontSize:12, fontWeight:'700', color:'#111827' },
  backButton: { marginBottom: 10, alignSelf: 'flex-start' },
  avatarContainer: { alignItems: 'center', justifyContent: 'center', marginBottom: 12, position: 'relative' },
  avatar: { width: 90, height: 90, borderRadius: 45 },
  editAvatar: { position: 'absolute', bottom: 0, right: (90 / 2) - 15, backgroundColor: '#fff', borderRadius: 15, padding: 4, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2 },
  infoBlock: { alignItems: 'center', marginBottom: 16 },
  role: { fontWeight: '600', fontSize: 15, color: '#333', marginBottom: 4, textAlign: 'center' },
  infoName: { fontSize: 16, fontWeight: '700', color: '#0b2346', marginBottom: 6, textAlign: 'center' },
  infoText: { fontSize: 14, color: '#333' },
  divider: { height: 1, backgroundColor: '#ddd', marginVertical: 14 },
  /* Read-only redesigned header */
  readOnlyHeaderCard:{ flexDirection:'row', backgroundColor:'#0b2346', borderRadius:26, padding:20, marginBottom:24, alignItems:'center', shadowColor:'#000', shadowOpacity:0.12, shadowRadius:14, elevation:5 },
  readOnlyHeaderCardAlt:{},
  readOnlyHeaderInverted:{ flexDirection:'row', backgroundColor:'#0b2346', borderRadius:30, padding:26, marginBottom:30, shadowColor:'#000', shadowOpacity:0.18, shadowRadius:20, elevation:7, justifyContent:'space-between', alignItems:'center' },
  invertedInfoBlock:{ flex:1, paddingRight:22, alignItems:'flex-start' },
  headerVerticalDivider:{ width:1, alignSelf:'stretch', backgroundColor:'rgba(255,255,255,0.15)', marginHorizontal:10 },
  invertedActionsBlock:{ width:140, alignItems:'flex-end' },
  invertedActionStack:{ gap:12, width:'100%', alignItems:'flex-end' },
  actionSectionLabel:{ color:'#94a3b8', fontSize:11, fontWeight:'600', letterSpacing:0.5, marginBottom:8, textTransform:'uppercase', textAlign:'left' },
  sideActionBtn:{ flexDirection:'row', alignItems:'center', justifyContent:'flex-start', paddingVertical:8, paddingHorizontal:12, borderRadius:14 },
  callBtnVariant:{ backgroundColor:'#349DC5' },
  smsBtnVariant:{ backgroundColor:'#349DC5' },
  membersBtnVariant:{ backgroundColor:'#349DC5' },
  sideActionText:{ marginLeft:8, fontSize:12, fontWeight:'700', color:'#fff' },
  actionSectionLabelRight:{ color:'#94a3b8', fontSize:11, fontWeight:'600', letterSpacing:0.5, marginBottom:8, textTransform:'uppercase', textAlign:'right' },
  sideActionBtnRight:{ justifyContent:'flex-end' },
  headerRightColumn:{ flex:1, paddingLeft:18, justifyContent:'flex-start' },
  avatarAlignTopRight:{ alignItems:'flex-end' },
  readOnlyAvatarRingSmall:{ width:84, height:84, borderRadius:42, padding:3, backgroundColor:'#349DC5', justifyContent:'center', alignItems:'center', shadowColor:'#000', shadowOpacity:0.25, shadowRadius:5, elevation:4, marginBottom:8 },
  readOnlyAvatarSmall:{ width:78, height:78, borderRadius:39, backgroundColor:'#102347' },
  headerInfoAlt:{ },
  headerTitleTextAlt:{ fontSize:19, fontWeight:'800', color:'#ffffff' },
  headerSubRoleAlt:{ marginTop:2, fontSize:12, fontWeight:'600', color:'#a5d8ff', textTransform:'uppercase', letterSpacing:0.6 },
  headerUnitLineAlt:{ marginTop:4, fontSize:13, fontWeight:'700', color:'#f1f5f9' },
  inlineMetaRowAlt:{ flexDirection:'row', flexWrap:'wrap', gap:10, marginTop:10 },
  inlineMetaValueAlt:{ fontSize:11, fontWeight:'600', color:'#e2e8f0', backgroundColor:'rgba(255,255,255,0.08)', paddingHorizontal:10, paddingVertical:6, borderRadius:14 },
  readOnlyAvatarWrap:{ marginRight:22 },
  readOnlyAvatarRing:{ width:96, height:96, borderRadius:48, padding:3, backgroundColor:'#349DC5', justifyContent:'center', alignItems:'center', shadowColor:'#000', shadowOpacity:0.25, shadowRadius:6, elevation:4 },
  readOnlyAvatar:{ width:90, height:90, borderRadius:45, backgroundColor:'#102347' },
  headerInfo:{ flex:1 },
  headerTitleText:{ fontSize:20, fontWeight:'800', color:'#fff' },
  headerSubRole:{ marginTop:4, fontSize:12, fontWeight:'600', color:'#a5d8ff', textTransform:'uppercase', letterSpacing:0.5 },
  headerUnitLine:{ marginTop:6, fontSize:12, color:'#e2e8f0' },
  headerUnitName:{ fontWeight:'700', color:'#fff' },
  contactRow:{ flexDirection:'row', flexWrap:'wrap', marginTop:12, gap:10 },
  contactBtn:{ flexDirection:'row', alignItems:'center', backgroundColor:'#349DC5', paddingHorizontal:14, paddingVertical:8, borderRadius:24 },
  smsBtn:{ backgroundColor:'#6366f1' },
  membersBtn:{ backgroundColor:'#0d9488' },
  contactBtnText:{ marginLeft:6, color:'#fff', fontSize:12, fontWeight:'700' },
  inlineMetaRow:{ flexDirection:'row', flexWrap:'wrap', marginTop:14, gap:12 },
  inlineMetaValue:{ fontSize:11, fontWeight:'600', color:'#cbd5e1', backgroundColor:'rgba(255,255,255,0.08)', paddingHorizontal:10, paddingVertical:6, borderRadius:14 },
  menuBlock: { marginTop: 0 },
  modalBackground: { flex: 1, backgroundColor: 'rgba(8,8.7,20,0.50)', justifyContent: 'center', alignItems: 'center' },
  fullImage: { width: '100%', height: '100%' },
  closeButton: { position: 'absolute', top: 40, right: 20, zIndex: 10 },
  closeText: { color: '#fff', fontSize: 38, fontWeight: '600' },
  menuButton: { backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 10, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 11, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, borderWidth: 1, borderColor: '#F3F3F3' },
  menuText: { fontSize: 15, color: '#222', fontWeight: '500' },
  menuIcon: { marginLeft: 10 },
  dangerButton: { borderColor: '#f89590', borderWidth: 1 },
  dangerText: { color: '#ff3b30' },
  centeredView: { flex: 1, backgroundColor: 'rgba(0,0,0,0.16)', justifyContent: 'center', alignItems: 'center' },
  editModalView: { width: '90%', backgroundColor: '#fff', borderRadius: 18, padding: 22, alignItems: 'center', elevation: 6, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 7 },
  editPhotoCircle: { width: 78, height: 78, borderRadius: 39, backgroundColor: '#0B2346', alignItems: 'center', justifyContent: 'center', marginTop: 10, marginBottom: 18, borderWidth: 2, borderColor: '#349DC5' },
  changePhotoBtn: { backgroundColor: '#349DC5', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 18, marginBottom: 18 },
  changePhotoText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  inputGroup: { width: '100%', marginBottom: 10 },
  inputLabel: { fontSize: 13, color: '#222', marginBottom: 3, marginLeft: 2 },
  input: { width: '100%', borderWidth: 1, borderColor: '#d3e0ea', borderRadius: 7, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 11 : 7, fontSize: 15, backgroundColor: '#fafcff' },
  saveBtn: { backgroundColor: '#349DC5', borderRadius: 7, marginTop: 15, width: '100%', paddingVertical: 13, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16, letterSpacing: 0.3 },
  passwordModalView: { width: '90%', backgroundColor: '#fff', borderRadius: 18, padding: 22, alignItems: 'center', elevation: 6, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 7 },
  passwordLabel: { alignSelf: 'flex-start', marginBottom: 4, fontSize: 14, color: '#222', fontWeight: '600', marginTop: 10 },
  passwordInputRow: { flexDirection: 'row', alignItems: 'center', width: '100%', borderWidth: 1, borderColor: '#d3e0ea', borderRadius: 7, backgroundColor: '#fafcff', marginBottom: 10, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 11 : 7 },
  passwordInput: { flex: 1, fontSize: 15, color: '#222', padding: 0, backgroundColor: 'transparent' },
  notificationModalView: { width: '90%', backgroundColor: '#fff', borderRadius: 18, padding: 20, alignItems: 'stretch', elevation: 6, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 7, marginBottom: 0 },
  notificationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: 0.7, borderBottomColor: '#e0e0e0' },
  notificationLabel: { fontSize: 15, color: '#222', fontWeight: '500' },
  editProfileBtn: { backgroundColor: '#349DC5', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 8, marginTop: 12 },
  editProfileText: { color: '#fff', fontWeight: '600' },
  financeCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#e5ecf4', elevation:3, shadowColor:'#000', shadowOpacity:0.06, shadowRadius:10, marginBottom:16 },
  financeHeaderRow:{ flexDirection:'row', alignItems:'center', marginBottom:12 },
  financeHeaderIconWrap:{ width:36, height:36, borderRadius:18, backgroundColor:'#e1f4ff', alignItems:'center', justifyContent:'center', marginRight:10 },
  financeTitle: { fontSize: 17, fontWeight: '800', color: '#0b2346', letterSpacing:0.3 },
  financeMetricsRow:{ flexDirection:'row', justifyContent:'space-between' },
  financeMetric:{ flex:1, borderRadius:16, paddingVertical:12, paddingHorizontal:12, borderWidth:1, marginRight:10 },
  financeMetricHeader:{ flexDirection:'row', alignItems:'center', marginBottom:6 },
  financeMetricIconWrap:{ width:26, height:26, borderRadius:13, alignItems:'center', justifyContent:'center', marginRight:6 },
  financeMetricLabel:{ fontSize:11, fontWeight:'700', textTransform:'uppercase', letterSpacing:0.5 },
  financeMetricValue:{ fontSize:15, fontWeight:'800' },
  /* Column finance */
  financeCardColumn:{},
  financeCardImproved:{ backgroundColor:'#ffffff', borderRadius:26, paddingBottom:4, overflow:'hidden', marginBottom:24, shadowColor:'#000', shadowOpacity:0.08, shadowRadius:14, elevation:4 },
  financeImprovedHeader:{ flexDirection:'row', alignItems:'center', paddingVertical:14, paddingHorizontal:18, backgroundColor:'#0b2346', gap:10 },
  financeImprovedTitle:{ fontSize:17, fontWeight:'800', color:'#ffffff', letterSpacing:0.4 },
  financeLoadingText:{ marginTop:6, color:'#349DC5', fontSize:12, fontWeight:'600' },
  financeImprovedRow:{ flexDirection:'row', alignItems:'center', paddingVertical:14, paddingHorizontal:18, borderBottomWidth:1, borderBottomColor:'#eef2f7' },
  financeImprovedIconWrap:{ width:38, height:38, borderRadius:19, alignItems:'center', justifyContent:'center', marginRight:12 },
  financeImprovedLabel:{ flex:1, fontSize:13, fontWeight:'700', letterSpacing:0.5, color:'#334155' },
  financeImprovedValue:{ fontSize:16, fontWeight:'800' },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statCard:{ width:'48%', borderRadius:24, borderWidth:1, padding:0, marginBottom:20, overflow:'hidden', shadowColor:'#000', shadowOpacity:0.035, shadowRadius:10, elevation:2 },
  statAccentBar:{ height:4, width:'100%' },
  statInner:{ paddingVertical:14, paddingHorizontal:14, minHeight:118, justifyContent:'space-between' },
  statTopRow:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:10 },
  statIconWrap:{ width:46, height:46, borderRadius:23, alignItems:'center', justifyContent:'center', marginRight:10 },
  statValue:{ fontSize:24, fontWeight:'800', flex:1, textAlign:'right' },
  statLabel:{ fontSize:12, fontWeight:'600', color:'#44525f', lineHeight:16 },
});
