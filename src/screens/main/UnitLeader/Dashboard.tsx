import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView, RefreshControl, Image } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { heightPercentageToDP } from 'react-native-responsive-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUnitLeaderSummary, UnitLeaderSummary } from '../../../api/unitLeader';
import { listConversations } from '../../../api/messages';
import { eventBus } from '../../../utils/eventBus';
import React, { useEffect, useRef } from "react";
import { Colors } from '@theme/colors';
import ModernLoader from '../../../loader/load';
import axios from 'axios';
import { BASE_URl } from '../../../api/users';
import RoleSwitchModal from '../../../components/RoleSwitchModal';
import Toast from 'react-native-toast-message';
import RoleSwitchCountdownModal from '../../../components/RoleSwitchCountdownModal';
import { AppEventBus } from '../../../components/AppBootstrapGate';
import { useSoulsStore } from 'context/SoulsStore';

type RootStackParamList = {
  Dashboard: undefined;
  MemberList: undefined;
  SoulsWon: undefined;
  Notification: undefined;
  PeopleInvited: undefined;
  MainTabs: undefined;
};

// Props from React Navigation
type DashboardNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Dashboard'
>;
type DashboardRouteProp = RouteProp<RootStackParamList, 'Dashboard'>;

const Dashboard = () => {
  const navigation = useNavigation<DashboardNavigationProp>();
  useRoute<DashboardRouteProp>();
  const [summary, setSummary] = React.useState<UnitLeaderSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const [user, setUser] = React.useState<any>(null);
  const [switchModalVisible, setSwitchModalVisible] = React.useState(false);
  const [selectedRole, setSelectedRole] = React.useState<string | null>(null);
  const [selectedRoleKey, setSelectedRoleKey] = React.useState<string | null>(null);
  const [switching, setSwitching] = React.useState(false);
  const [countdownVisible, setCountdownVisible] = React.useState(false);
  const [pendingRole, setPendingRole] = React.useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = React.useState(true);
  const [unreadTotal, setUnreadTotal] = React.useState(0);
  const originalRoleRef = useRef<string | null>(null);
  const effectiveActiveRole = pendingRole || user?.activeRole;
  const {  unitCount } = useSoulsStore();
  // Selected upcoming event to show details below
  const [selectedEventId, setSelectedEventId] = React.useState<string | null>(null);

  

  const readToken = React.useCallback(async () => {
    const raw = await AsyncStorage.getItem('token');
    if (!raw) return null;
    const trimmed = raw.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed === 'string') return parsed;
        if (parsed && typeof parsed === 'object') {
          if (parsed.token && typeof parsed.token === 'string') return parsed.token;
        }
        return null;
      } catch { return null; }
    }
    return raw; // assume raw JWT string like eyJhbGci...
  }, []);

  const load = React.useCallback(async (isRefresh = false) => {
    if (isRefresh) { setRefreshing(true); } else { setLoading(true); }
    setError(null);
    try {
      const token = await readToken();
      if (!token) { throw new Error('Missing auth token'); }
      const data = await getUnitLeaderSummary(token);
      if (!data.ok) throw new Error(data.message || 'Failed');
      setSummary(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [readToken]);

  React.useEffect(() => {
    load();
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('user');
        if (raw) { setUser(JSON.parse(raw)); }
      } catch (e) { /* ignore */ }
    })();
  }, [load]);

  // Unread badge refresh on socket/message events
  React.useEffect(()=>{
    let mounted = true;
    const refresh = async()=>{
      try{ const res = await listConversations(); if(!mounted) return; const total = (res.conversations||[]).reduce((acc:number,c:any)=> acc + (c.unread||0), 0); setUnreadTotal(total); }
      catch{}
    };
    refresh();
    const off = eventBus.on('SOJ_MESSAGE', refresh);
    return ()=>{ mounted=false; off && off(); };
  },[]);

  // Keep upcoming events fresh when new events are added and on screen focus
  React.useEffect(() => {
    const off = AppEventBus.on((event) => {
      if (event === 'eventsChanged') {
        load(true);
      }
    });
    const unsubscribeFocus = navigation.addListener('focus', () => load(true));
    return () => { off && off(); unsubscribeFocus && unsubscribeFocus(); };
  }, [navigation, load]);

  React.useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('user');
        if (raw) {
          const u = JSON.parse(raw);
          setUser(u);
        }
      } catch { }
      finally { setAvatarLoading(false); }
    })();
  }, []);

  // Keep selectedEventId in sync with loaded summary
  React.useEffect(() => {
    const list = summary?.upcomingEvents || [];
    if (list.length === 0) {
      setSelectedEventId(null);
    } else if (!selectedEventId || !list.some(e => e._id === selectedEventId)) {
      setSelectedEventId(list[0]._id);
    }
  }, [summary?.upcomingEvents, selectedEventId]);

  const openSwitchModal = () => {
    if (!user?.roles || !Array.isArray(user.roles) || user.roles.length < 2) return; // nothing to switch
    setSelectedRole(user.activeRole || user.roles[0]?.role);
    setSelectedRoleKey(null);
    setSwitchModalVisible(true);
  };

  const handleConfirmFromPicker = () => {
    if (!selectedRole) { setSwitchModalVisible(false); return; }
    // Persist chosen unit id locally if provided via selectedRoleKey
    (async ()=>{
      try {
        if(selectedRoleKey){ const parts = selectedRoleKey.split('::'); const unitPart = parts[1]; if(unitPart && unitPart !== 'global'){ await AsyncStorage.setItem('activeUnitId', unitPart); } else { await AsyncStorage.removeItem('activeUnitId'); } }
      } catch {}
      setPendingRole(selectedRole);
      setSwitchModalVisible(false);
      setCountdownVisible(true);
    })();
  };

  const executeRoleSwitch = async (roleToApply?: string | null) => {
    const role = roleToApply || pendingRole;
    if (!role) { setCountdownVisible(false); return; }
    try {
      setSwitching(true);
      if (!originalRoleRef.current) originalRoleRef.current = user?.activeRole || null;
      // optimistic local & cache update
      setUser((prev: any) => prev ? { ...prev, activeRole: role } : prev);
      try {
        const cached = await AsyncStorage.getItem('user');
        if (cached) { const parsed = JSON.parse(cached); parsed.activeRole = role; await AsyncStorage.setItem('user', JSON.stringify(parsed)); }
      } catch { }
  const activeUnitId = await AsyncStorage.getItem('activeUnitId');
  AppEventBus.emit('roleSwitchOptimistic', { activeRole: role, activeUnitId });
      navigation.navigate('MainTabs');

      const token = await readToken();
      if (!token) { throw new Error('Missing auth token'); }
  await axios.post(`${BASE_URl}/api/auth/switch-role`, { role }, { headers: { Authorization: `Bearer ${token}` } });
  const me = await axios.get(`${BASE_URl}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (me.data?.ok) {
        setUser(me.data.user);
        const cachedRaw = await AsyncStorage.getItem('user');
        if (cachedRaw) {
          const merged = { ...JSON.parse(cachedRaw), ...me.data.user };
          await AsyncStorage.setItem('user', JSON.stringify(merged));
        } else {
          await AsyncStorage.setItem('user', JSON.stringify(me.data.user));
        }
        Toast.show({ type: 'success', text1: 'Role switched', text2: `Now acting as ${me.data.user.activeRole}` });
  const activeUnitId2 = await AsyncStorage.getItem('activeUnitId');
  AppEventBus.emit('roleSwitched', { activeRole: me.data.user.activeRole, activeUnitId: activeUnitId2 });
        // Notify app to refresh any role/metrics derived UI
        AppEventBus.emit('profileRefreshed', me.data.user);
        originalRoleRef.current = null;
      }
      await load();
    } catch (e) {
      if (originalRoleRef.current) {
        setUser((prev: any) => prev ? { ...prev, activeRole: originalRoleRef.current } : prev);
        try {
          const cached = await AsyncStorage.getItem('user');
          if (cached) { const parsed = JSON.parse(cached); parsed.activeRole = originalRoleRef.current; await AsyncStorage.setItem('user', JSON.stringify(parsed)); }
        } catch { }
  const activeUnitId3 = await AsyncStorage.getItem('activeUnitId');
  AppEventBus.emit('roleSwitchRevert', { activeRole: originalRoleRef.current, activeUnitId: activeUnitId3 });
      }
      const message = (e as any)?.response?.data?.message || (e as any)?.message || 'Unable to switch role';
      Toast.show({ type: 'error', text1: 'Switch failed', text2: message });
    } finally {
      setSwitching(false);
      setCountdownVisible(false);
      setPendingRole(null);
    }
  };

  const cancelCountdown = () => {
    setCountdownVisible(false);
    setPendingRole(null);
    Toast.show({ type: 'info', text1: 'Cancelled', text2: 'Role switch aborted' });
  };

  const income = summary?.finance.income || 0;
  const expense = summary?.finance.expense || 0;
  const balance = summary?.finance.balance || 0;

  return (
    <SafeAreaView style={{ flexGrow: 1 }}>
  <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <ScrollView style={styles.container} contentContainerStyle={{ flexGrow: 1 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.profileIcon} onPress={() => navigation.navigate('UnitLeaderProfile' as never)}>
              {avatarLoading ? (
                <ModernLoader fullscreen={false} spinnerSize={28} ringWidth={3} logoSize={18} />
              ) : user?.profile?.avatar ? (
                <Image source={{ uri: user.profile.avatar }} style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 3, borderColor: 'rgba(255,255,255,0.2)' }} />
              ) : (
                <Icon name="person" size={24} color="white" />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.notificationIcon} onPress={() => navigation.navigate('Notification')}>
              <Icon name="notifications" size={24} color="white" />
              {unreadTotal>0 && (
                <View style={styles.notificationBadgeWrap}>
                  <Text style={styles.notificationBadgeText}>{unreadTotal>9?'9+':unreadTotal}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>Welcome {user?.title ? user.title : ''} {user?.firstName ? user.firstName : ''}</Text>
            <Text style={styles.unitText}>{summary?.unit?.name ? `${summary.unit.name} Unit Leader` : 'No Active Unit'}</Text>
            {user?.roles?.length > 1 && (
              <TouchableOpacity style={styles.switchUnitButton} onPress={openSwitchModal}>
                <Text style={styles.switchUnitText}>Switch Role</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        {loading && (
          <View style={{ flex: 1, padding: 30, justifyContent: 'center', alignItems: 'center' }}>
            <ModernLoader fullscreen={false} spinnerSize={60} ringWidth={6} logoSize={36} />
            <Text style={{ marginTop: 14, color: Colors.primary, fontWeight: '600' }}>Loading unit dashboard...</Text>
          </View>
        )}
        {!loading && error && (
          <View style={{ padding: 24 }}>
            <Text style={{ color: '#c0392b', marginBottom: 12 }}>{error}</Text>
            <TouchableOpacity onPress={() => load()} style={{ backgroundColor: Colors.primary, padding: 12, borderRadius: 8, alignSelf: 'flex-start' }}>
              <Text style={{ color: '#fff', fontWeight: '600' }}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
        {!loading && !error && summary && (
          <ScrollView style={styles.content} nestedScrollEnabled>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <View style={styles.statHeader}>
                  <Icon name="people" size={20} color="#666" />
                  <Text style={styles.statTitle}>Total Unit Members</Text>
                </View>
                <Text style={styles.statNumber}>{summary.membersCount}</Text>
                <TouchableOpacity
                  style={styles.viewMemberButton}
                  onPress={() => navigation.navigate('MemberList')}
                >
                  <Text style={styles.viewMemberText}>View Member List</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.statCard}>
                <View style={styles.statHeader}>
                  <Icon name="flame" size={20} color="#FF6B35" />
                  <Text style={styles.statTitle}>Souls Won (Unit)</Text>
                </View>
                  <Text style={styles.statNumber}>{summary?.soulsWonCount ?? 0}</Text>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <TouchableOpacity style={styles.financeSection} onPress={()=> navigation.navigate('FinanceSummary' as never)}>
                <View style={styles.rowSpaceBetween}>
                  <View>
                    <Text style={styles.financeTitle}>Financial Summary</Text>
                    <Text style={styles.financeDate}>Current Total</Text>
                  </View>
                </View>
                <View style={styles.financeItem}><Text style={[styles.whiteText, { fontWeight: '700' }]}>Total</Text><Text style={[styles.whiteText, { fontWeight: '900' }]}>Amount</Text></View>
                <View style={styles.financeItem}><Text style={styles.whiteText}>Total Income</Text><Text style={[styles.whiteText, { fontWeight: '500' }]}>₦{income.toLocaleString()}</Text></View>
                <View style={styles.financeItem}><Text style={styles.whiteText}>Total Expenditure</Text><Text style={[styles.whiteText, { fontWeight: '500' }]}>₦{expense.toLocaleString()}</Text></View>
                <View style={styles.financeItem}><Text style={styles.whiteText}>Total Balance</Text><Text style={[styles.whiteText, { fontWeight: '500' }]}>₦{balance.toLocaleString()}</Text></View>
              </TouchableOpacity>
            </View>
            <View style={styles.eventsSection}>
              <View style={styles.eventsHeader}>
                <Icon name="calendar" size={20} color="#666" />
                <Text style={styles.eventsTitle}>Upcoming Events</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ alignItems: 'center', paddingRight: 10 }}
                style={{ flexGrow: 0, height: 100, marginBottom: 12 }}
                nestedScrollEnabled
              >
                {summary.upcomingEvents.length === 0 && (
                  <View style={[styles.eventCard, { justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{ color: '#777' }}>No upcoming events</Text>
                  </View>)}
                {summary.upcomingEvents.map(ev => {
                  const isActive = ev._id === selectedEventId;
                  return (
                    <TouchableOpacity key={ev._id} style={[styles.eventCard, isActive && styles.eventCardActive]} onPress={() => setSelectedEventId(ev._id)}>
                      <Text style={[styles.eventTitle, isActive && styles.eventTitleActive]} numberOfLines={1}>{ev.title}</Text>
                      <Text style={[styles.eventDate, isActive && styles.eventDateActive]}>{new Date(ev.date).toLocaleDateString()}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              {/* Detail panel for the selected upcoming event */}
              {selectedEventId && (
                <View style={styles.eventDetailCard}>
                  {(() => {
                    const ev = (summary.upcomingEvents || []).find(e => e._id === selectedEventId);
                    if (!ev) return null;
                    const d = new Date(ev.date);
                    const pretty = d.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                    return (
                      <>
                        <Text style={styles.detailTitle}>{ev.title}</Text>
                        <Text style={styles.detailRow}>Date: <Text style={styles.detailValue}>{pretty}</Text></Text>
                        {/* If backend adds more fields like venue/description, render them here */}
                      </>
                    );
                  })()}
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </ScrollView>
      <RoleSwitchModal
        visible={switchModalVisible}
        roles={user?.roles || []}
        activeRole={user?.activeRole}
        selectedRole={selectedRole}
        selectedKey={selectedRoleKey}
        onSelect={setSelectedRole}
        onSelectKey={setSelectedRoleKey}
        onCancel={() => setSwitchModalVisible(false)}
        onConfirm={handleConfirmFromPicker}
        loading={switching}
      />
      <RoleSwitchCountdownModal
        visible={countdownVisible}
        targetRole={pendingRole}
        seconds={8}
        onCancel={cancelCountdown}
        onConfirmNow={() => executeRoleSwitch(pendingRole)}
        onAutoExecute={() => executeRoleSwitch(pendingRole)}
        loading={switching}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#349DC5', paddingBottom: 15, paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  profileIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center',
  },
  notificationIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', position: 'relative',
  },
  notificationBadge: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#349DC5' },
  notificationBadgeWrap: { position:'absolute', top: -3, right: -3, backgroundColor:'#ef4444', minWidth:16, height:16, borderRadius:8, alignItems:'center', justifyContent:'center', paddingHorizontal:3 },
  notificationBadgeText: { color:'#fff', fontSize:9, fontWeight:'800' },
  welcomeSection: { alignItems: 'flex-start' },
  welcomeText: { fontSize: 18, fontWeight: 'bold', color: 'white', marginBottom: 5 },
  unitText: { fontSize: 16, color: 'rgba(255,255,255,0.9)', marginBottom: 15 },
  switchUnitButton: {
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 20, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  switchUnitText: { color: 'white', fontSize: 14, fontWeight: '500' },
  content: { flex: 1, padding: 20, paddingBottom: heightPercentageToDP(10) },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  statCard: {
    backgroundColor: 'white', borderRadius: 12, padding: 16, flex: 0.48,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  rowSpaceBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,

  },
  financeSection: {
    padding: 15,
    backgroundColor: '#fdffffff',
    borderRadius: 10,
    marginBottom: 20,
    flex: 0.48,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  financeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e58585ff',
  },
  financeDate: {
    fontSize: 13,
    color: 'black',
    marginBottom: 10,
  },
  financeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  whiteText: {
    color: 'black',
    fontSize: 14,
  },
  statHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  statTitle: { fontSize: 10, color: '#666', marginLeft: 5, flex: 1 },
  statNumber: { fontSize: 32, fontWeight: 'bold', color: '#333', marginBottom: 10, textAlign: 'center' },
  viewMemberButton: { backgroundColor: '#349DC5', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, alignSelf: 'flex-start' },
  viewMemberText: { color: 'white', fontSize: 12, fontWeight: '500' },
  eventsSection: { marginTop: 10 },
  eventsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  eventsTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginLeft: 8 },
  eventCard: {
    backgroundColor: 'white', borderRadius: 12, padding: 15, height: 85,
    marginRight: 15, minWidth: 150, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  eventCardActive: {
    borderColor: '#349DC5',
    borderWidth: 2,
  },
  eventTitle: { fontSize: 14, fontWeight: '600', color: '#349DC5', marginBottom: 5 },
  eventTitleActive: { color: '#1f7aa0' },
  eventDate: { fontSize: 12, color: '#666' },
  eventDateActive: { color: '#1f7aa0', fontWeight: '600' },
  eventDetailCard: {
    backgroundColor: 'white', borderRadius: 12, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
    marginTop: 4, marginBottom: heightPercentageToDP(10)
  },
  detailTitle: { fontSize: 16, fontWeight: '700', color: '#349DC5', marginBottom: 6 },
  detailRow: { fontSize: 13, color: '#444', marginBottom: 4 },
  detailValue: { fontWeight: '600', color: '#222' },
});

export default Dashboard;
