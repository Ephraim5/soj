import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URl } from '../../../api/users';
import Toast from 'react-native-toast-message';
import RoleSwitchModal from '../../../components/RoleSwitchModal';
import RoleSwitchCountdownModal from '../../../components/RoleSwitchCountdownModal';
import useMinimumLoader from '../../../hooks/useMinimumLoader';
import { AppEventBus } from '../../../components/AppBootstrapGate';
import React from 'react';
import { useSoulsStore } from '../../../context/SoulsStore';
import { listConversations } from '../../../api/messages';
import { eventBus } from '../../../utils/eventBus';
import { Colors } from '@theme/colors';
import { PRIMARY_BLUE } from '@screens/AuthScreens/SuperAdmin/styles';
import { getFinanceSummary } from '@api/finance';

type RootStackParamList = {
  DashboardMember: undefined;
  MemberList: undefined;
  SoulsWon: { scope?: 'mine'|'unit' } | undefined;
  PeopleInvited: undefined;
};

// Props from React Navigation
type DashboardNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'DashboardMember'
>;
type DashboardRouteProp = RouteProp<RootStackParamList, 'DashboardMember'>;

const DashboardMember = () => {
  const navigation = useNavigation<DashboardNavigationProp>();
  useRoute<DashboardRouteProp>();
  const { personalCount, unitCount } = useSoulsStore();

  const [profile, setProfile] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [switchModalVisible, setSwitchModalVisible] = React.useState(false);
  const [selectedRole, setSelectedRole] = React.useState<string | null>(null);
  const [selectedRoleKey, setSelectedRoleKey] = React.useState<string | null>(null);
  const [countdownVisible, setCountdownVisible] = React.useState(false);
  const [pendingRole, setPendingRole] = React.useState<string | null>(null);
  const [switching, setSwitching] = React.useState(false);
  const originalRoleRef = React.useRef<string | null>(null);
  const effectiveActiveRole = pendingRole || profile?.activeRole;
  const [unreadTotal, setUnreadTotal] = React.useState(0);
  const [hasFinSecDuty, setHasFinSecDuty] = React.useState(false);
  const [summaryTotals, setSummaryTotals] = React.useState<{ income: number; expense: number; net: number }>({ income: 0, expense: 0, net: 0 });

  const showLoader = useMinimumLoader(loading, { minVisibleMs: 800, showDelayMs: 120 });

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
    return raw;
  }, []);

  const fetchProfile = React.useCallback(async () => {
    try {
      setError(null);
      const token = await readToken();
      if (!token) { setError('Missing token'); setLoading(false); return; }
  const res = await axios.get(`${BASE_URl}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data?.ok) {
        setProfile(res.data.user);
        await AsyncStorage.setItem('user', JSON.stringify(res.data.user));
      } else { setError('Failed to load profile'); }
    } catch (e:any) {
      setError(e?.response?.data?.message || e.message);
    } finally { setLoading(false); }
  }, [readToken]);

  React.useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // Refetch profile whenever this screen gains focus (ensures newly assigned duties reflect)
  React.useEffect(() => {
    const unsubscribe = (navigation as any).addListener('focus', () => {
      fetchProfile();
    });
    return unsubscribe;
  }, [navigation, fetchProfile]);

  // Refresh profile on global events (assignments or profile updates)
  React.useEffect(() => {
    const off = AppEventBus.on((event) => {
      if (event === 'profileRefreshed' || event === 'assignmentsChanged') {
        // Re-read from AsyncStorage to stay in sync quickly
        (async () => {
          try { const raw = await AsyncStorage.getItem('user'); if (raw) setProfile(JSON.parse(raw)); } catch {}
        })();
      }
    });
    return () => { off && off(); };
  }, []);

  // Derive Financial Secretary duty for the currently active unit across any role (Member or UnitLeader)
  React.useEffect(()=>{
    (async () => {
      try {
        const u = profile;
        if (!u) { setHasFinSecDuty(false); return; }
        const roles = Array.isArray(u.roles) ? u.roles : [];
        const activeUnitId = await AsyncStorage.getItem('activeUnitId');
        // Determine unit to check: explicit activeUnitId, otherwise the unit tied to the activeRole
        let unitIdToCheck: string | null = activeUnitId || null;
        if (!unitIdToCheck) {
          const match = roles.find((r:any)=> r.role === (u.activeRole||'') && (r.unit||r.unitId));
          if (match) unitIdToCheck = String(match.unit||match.unitId);
        }
        if (!unitIdToCheck) { setHasFinSecDuty(false); return; }
        const has = roles.some((r:any)=> String(r.unit||r.unitId||'')===String(unitIdToCheck) && Array.isArray(r.duties) && (r.duties.includes('FinancialSecretary') || r.duties.includes('Financial Secretary')));
        setHasFinSecDuty(has);
      } catch { setHasFinSecDuty(false); }
    })();
  }, [profile]);

  // Load finance summary totals for the active unit when user has Financial Secretary duty
  React.useEffect(() => {
    (async () => {
      try {
        // Reset to zeros first
        setSummaryTotals({ income: 0, expense: 0, net: 0 });
        if (!hasFinSecDuty) return;
        const u = profile; if (!u) return;
        const roles = Array.isArray(u.roles) ? u.roles : [];
        const activeUnitId = await AsyncStorage.getItem('activeUnitId');
        let unitIdToUse: string | null = activeUnitId || null;
        if (!unitIdToUse) {
          const match = roles.find((r:any)=> r.role === (u.activeRole||'') && (r.unit||r.unitId));
          if (match) unitIdToUse = String(match.unit||match.unitId);
        }
        if (!unitIdToUse) return;
        const token = await AsyncStorage.getItem('token');
        if (!token) return;
        const res = await getFinanceSummary(unitIdToUse, token);
        if (res?.summary?.totals) {
          const t = res.summary.totals;
          setSummaryTotals({
            income: Number(t.income)||0,
            expense: Number(t.expense)||0,
            net: Number(t.net)||0,
          });
        }
      } catch {
        // keep defaults
      }
    })();
  }, [hasFinSecDuty, profile]);

  // Unread badge
  React.useEffect(()=>{
    let mounted = true;
    const refresh = async()=>{ try{ const res = await listConversations(); if(!mounted) return; const total = (res.conversations||[]).reduce((acc:number,c:any)=> acc + (c.unread||0), 0); setUnreadTotal(total); }catch{} };
    refresh();
    const off = eventBus.on('SOJ_MESSAGE', refresh);
    return ()=>{ mounted=false; off && off(); };
  },[]);

  const openSwitchModal = () => {
    if (!profile?.roles) return; setSelectedRole(profile.activeRole || profile.roles[0]?.role); setSelectedRoleKey(null); setSwitchModalVisible(true);
  };

  const handleConfirmFromPicker = () => {
    if (!selectedRole) { setSwitchModalVisible(false); return; }
    (async () => {
      try {
        if (selectedRoleKey) {
          const parts = selectedRoleKey.split('::');
          const unitPart = parts[1];
          if (unitPart && unitPart !== 'global') {
            await AsyncStorage.setItem('activeUnitId', unitPart);
          } else {
            await AsyncStorage.removeItem('activeUnitId');
          }
        }
      } catch {}
      setPendingRole(selectedRole);
      setSwitchModalVisible(false);
      setCountdownVisible(true);
    })();
  };

  const executeRoleSwitch = async (roleToApply?: string | null) => {
    const role = roleToApply || pendingRole; if (!role) { setCountdownVisible(false); return; }
    try {
      setSwitching(true);
      if (!originalRoleRef.current) originalRoleRef.current = profile?.activeRole || null;
      setProfile((prev:any) => prev ? { ...prev, activeRole: role } : prev);
      try { const cached = await AsyncStorage.getItem('user'); if (cached) { const parsed = JSON.parse(cached); parsed.activeRole = role; await AsyncStorage.setItem('user', JSON.stringify(parsed)); } } catch {}
  const activeUnitId = await AsyncStorage.getItem('activeUnitId');
  AppEventBus.emit('roleSwitchOptimistic', { activeRole: role, activeUnitId });
    // Navigate to the app's main tab navigator; HomeScreen will render the right dashboard for the active role
    navigation.navigate('MainTabs' as any);
      const token = await readToken(); if (!token) throw new Error('Missing token');
  await axios.post(`${BASE_URl}/api/auth/switch-role`, { role }, { headers: { Authorization: `Bearer ${token}` } });
  const res = await axios.get(`${BASE_URl}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data?.ok) {
        setProfile(res.data.user);
        await AsyncStorage.setItem('user', JSON.stringify(res.data.user));
        Toast.show({ type: 'success', text1: 'Role switched', text2: `Now acting as ${res.data.user.activeRole}` });
  const activeUnitId2 = await AsyncStorage.getItem('activeUnitId');
  AppEventBus.emit('roleSwitched', { activeRole: res.data.user.activeRole, activeUnitId: activeUnitId2 });
        AppEventBus.emit('profileRefreshed', res.data.user);
        originalRoleRef.current = null;
      }
    } catch (e:any) {
      if (originalRoleRef.current) {
        setProfile((prev:any) => prev ? { ...prev, activeRole: originalRoleRef.current } : prev);
        try { const cached = await AsyncStorage.getItem('user'); if (cached) { const parsed = JSON.parse(cached); parsed.activeRole = originalRoleRef.current; await AsyncStorage.setItem('user', JSON.stringify(parsed)); } } catch {}
  const activeUnitId3 = await AsyncStorage.getItem('activeUnitId');
  AppEventBus.emit('roleSwitchRevert', { activeRole: originalRoleRef.current, activeUnitId: activeUnitId3 });
      }
      Toast.show({ type: 'error', text1: 'Switch failed', text2: e?.response?.data?.message || e.message });
    } finally {
      setSwitching(false); setCountdownVisible(false); setPendingRole(null);
    }
  };

  const cancelCountdown = () => { setCountdownVisible(false); setPendingRole(null); Toast.show({ type: 'info', text1: 'Cancelled', text2: 'Role switch aborted' }); };

  return (
    <SafeAreaView style={{ flexGrow: 1 }}>
  <StatusBar barStyle="dark-content" backgroundColor={PRIMARY_BLUE} />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.profileIcon} onPress={() => navigation.navigate('ProfileAdmin' as any)}>
              {profile?.profile?.avatar ? (
                <Image source={{ uri: profile.profile.avatar }} style={{ width: 40, height: 40, borderRadius: 20 }} />
              ) : (
                <Icon name="person" size={24} color="white" />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.notificationIcon} onPress={() => navigation.navigate('Notification' as any)}>
              <Icon name="notifications" size={24} color="white" />
              {unreadTotal>0 && (
                <View style={styles.notificationBadgeWrap}>
                  <Text style={styles.notificationBadgeText}>{unreadTotal>9?'9+':unreadTotal}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>Welcome {profile?.title ? profile.title : ''} {profile?.firstName ? profile.firstName : ''}</Text>
            <Text style={styles.unitText}>
              {(() => {
                const active = (profile?.roles||[]).find((r:any)=> r.role === (profile?.activeRole||''));
                const nameGuess = active?.unitName || active?.unitLabel || active?.ministryName || 'Chabod Unit';
                return hasFinSecDuty ? `${nameGuess} | Financial Secretary` : `${nameGuess} | ${effectiveActiveRole || 'Member'}`;
              })()}
            </Text>
            {Array.isArray(profile?.roles) && profile.roles.length > 1 && (
              <TouchableOpacity style={styles.switchUnitButton} onPress={openSwitchModal} disabled={switching}>
                <Text style={styles.switchUnitText}>{switching ? 'Switching...' : 'Switch Role'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        {showLoader && (
          <View style={{ padding: 16 }}>
            <ActivityIndicator color="#349DC5" />
          </View>
        )}
        {error && !loading && <Text style={{ color: 'red', marginHorizontal:20, marginBottom:10 }}>Error: {error}</Text>}
        <ScrollView style={styles.content}>
          {hasFinSecDuty && (
            <TouchableOpacity activeOpacity={0.8} onPress={()=> navigation.navigate('FinanceSummary' as never)} style={styles.summaryCard}>
              <View style={styles.fsTitleRow}>
                <View style={styles.fsIconWrap}>
                  <Icon name="cash-outline" size={18} color="#c0841a" />
                </View>
                <Text style={styles.fsTitleText}>Financial Summary</Text>
              </View>
              <View style={styles.fsRow}>
                <Text style={styles.fsLabel}>Income:</Text>
                <Text style={styles.fsValue}>₦{(summaryTotals.income||0).toLocaleString()}</Text>
              </View>
              <View style={styles.fsRow}>
                <Text style={styles.fsLabel}>Expenses:</Text>
                <Text style={styles.fsValue}>₦{(summaryTotals.expense||0).toLocaleString()}</Text>
              </View>
              <View style={styles.fsRow}>
                <Text style={styles.fsLabel}>Surplus/Deficit:</Text>
                <Text style={[styles.fsValue, { color: (summaryTotals.net || 0) >= 0 ? 'green' : 'red' }]}>₦{(summaryTotals.net||0).toLocaleString()}</Text>
              </View>
            </TouchableOpacity>
          )}

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <Icon name="people" size={20} color="#666" />
                <Text style={styles.statTitle}>Total Unit Members</Text>
              </View>
              <Text style={styles.statNumber}>{profile?.metrics?.unitMembers ?? '—'}</Text>
              {/* <TouchableOpacity style={styles.viewMemberButton} onPress={async () => {
                // Try pass explicit unitId from active selection if available
                let unitIdToUse: string | undefined;
                try {
                  const aid = await AsyncStorage.getItem('activeUnitId');
                  if (aid) unitIdToUse = aid;
                } catch {}
                // navigation.navigate('MemberList' as any, unitIdToUse ? { unitId: unitIdToUse } : undefined as any);
              }}>
                <Text style={styles.viewMemberText}>View Member List</Text>
              </TouchableOpacity> */}
            </View>
            {/* cards will show according to unit after here unit  */}
           
          </View>
          
          <View style={styles.eventsSection}>
            <View style={styles.eventsHeader}>
              <Icon name="calendar" size={20} color="#666" />
              <Text style={styles.eventsTitle}>Upcoming Events</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow:1, height: 100 }}>
              {(profile?.metrics?.upcomingEvents || []).slice(0,6).map((ev:any)=> (
                <TouchableOpacity style={styles.eventCard} key={ev._id || ev.title}> 
                  <Text style={styles.eventTitle}>{ev.title}</Text>
                  <Text style={styles.eventDate}>{ev.date ? new Date(ev.date).toLocaleDateString() : ''}</Text>
                </TouchableOpacity>
              ))}
              {!profile?.metrics?.upcomingEvents?.length && (
                <TouchableOpacity style={styles.eventCard}>
                  <Text style={styles.eventTitle}>No Events</Text>
                  <Text style={styles.eventDate}>—</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </ScrollView>
      </ScrollView>
      <RoleSwitchModal
        visible={switchModalVisible}
        roles={profile?.roles || []}
        activeRole={profile?.activeRole}
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
  container: { flex: 1, backgroundColor: '#f5f5f5' },
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
 
  content: { flex: 1, padding: 20 },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 16,
  },
  fsTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  fsIconWrap: { width: 30, height: 30, borderRadius: 6, backgroundColor: '#FFF5E5', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  fsTitleText: { fontSize: 16, fontWeight: '800', color: '#1f2937' },
  fsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  fsLabel: { fontSize: 14, color: '#6b7280' },
  fsValue: { fontSize: 16, fontWeight: '800', color: '#111827' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  statCard: {
    backgroundColor: 'white', borderRadius: 12, padding: 16, flex: 0.48,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statTitle: { fontSize: 10, color: '#666', marginLeft: 5, textAlign: 'center' },
  statNumber: { fontSize: 32, fontWeight: 'bold', color: '#333', marginBottom: 10, textAlign: 'center' },
  viewMemberButton: { backgroundColor: '#349DC5', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, alignSelf: 'center' },
  viewMemberText: { color: 'white', fontSize: 12, fontWeight: '500' },
  eventsSection: { marginTop: 10 },
  eventsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  eventsTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginLeft: 8 },
  eventCard: {
    backgroundColor: 'white', borderRadius: 12, padding: 15, height: 85,
    marginRight: 15, minWidth: 150, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  eventTitle: { fontSize: 14, fontWeight: '600', color: '#349DC5', marginBottom: 5 },
  eventDate: { fontSize: 12, color: '#666' },
});

export default DashboardMember;
