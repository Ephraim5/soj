import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SkeletonLoading from 'expo-skeleton-loading';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { InteractionManager } from 'react-native';
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { PRIMARY_BLUE } from './styles'; // ensure PRIMARY_BLUE is #349DC5 in styles file
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URl } from 'api/users';
import { heightPercentageToDP } from 'react-native-responsive-screen';

interface BackendUserRole { role: string; unit?: { _id: string; name: string } | null }
interface BackendUser { _id: string; firstName: string; surname: string; middleName?: string; email?: string; phone?: string; roles: BackendUserRole[]; approved: boolean; }

interface DisplayUser { id: string; name: string; role: 'Super Admin' | 'Unit Leader'; image?: string; unit: string; }

type RootStackParamList = {
  ManageSuperAdminsUnitLeaders: undefined;
};

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ManageSuperAdminsUnitLeaders'
>;

// Placeholder avatar
const AVATAR_PLACEHOLDER = 'https://www.w3schools.com/w3images/avatar2.png';

const ManageSuperAdminsUnitLeadersScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [superAdmins, setSuperAdmins] = React.useState<DisplayUser[]>([]);
  const [unitLeaders, setUnitLeaders] = React.useState<DisplayUser[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [isMultiSuperAdmin, setIsMultiSuperAdmin] = React.useState<boolean>(false);
  const [pendingUnitLeaders, setPendingUnitLeaders] = React.useState<number>(0);
  const [pendingSuperAdmins, setPendingSuperAdmins] = React.useState<number>(0);
  const [pendingMinistryAdmins, setPendingMinistryAdmins] = React.useState<number>(0);
  const [pendingWorkPlans, setPendingWorkPlans] = React.useState<number>(0);
  // Avoid Android useInsertionEffect warning by deferring RefreshControl mount
  const [pullReady, setPullReady] = React.useState(false);

  // Skeleton state
  const [skeletonVisible, setSkeletonVisible] = React.useState(true);
  const [superAdminSkeletonRows, setSuperAdminSkeletonRows] = React.useState(4);
  const [unitLeaderSkeletonRows, setUnitLeaderSkeletonRows] = React.useState(6);
  const skeletonOpacity = React.useRef(new Animated.Value(1)).current;
  const loadStartRef = React.useRef<number>(Date.now());
  const MIN_SKELETON_MS = 1500;
  const FADE_DURATION = 320;

  // Reanimated shim (in case) for expo-skeleton-loading
  (globalThis as any).__reanimatedWorkletInit = (globalThis as any).__reanimatedWorkletInit || (() => { });

  const ListSkeleton: React.FC<{ rows: number; fade?: Animated.Value }> = ({ rows, fade }) => {
    const Skel: any = SkeletonLoading as any;
    return (
      <Animated.View style={{ opacity: fade ?? 1 }}>
        {Array.from({ length: rows }).map((_, i) => {
          const primaryWidth = [60, 55, 65, 50, 58, 62][i % 6];
          const secondaryWidth = [32, 28, 36, 30, 40, 34][i % 6];
          return (
            <Skel key={i} background={'#E8ECF7'} highlight={'#FFFFFF'}>
              <View style={styles.listItem}>
                <View style={styles.avatarSkeleton} />
                <View style={{ flex: 1 }}>
                  <View style={[styles.barPrimary, { width: `${primaryWidth}%` }]} />
                  <View style={[styles.barSecondary, { width: `${secondaryWidth}%` }]} />
                </View>
              </View>
            </Skel>
          );
        })}
      </Animated.View>
    );
  };

  const mapBackendUsers = (users: BackendUser[]): { superAdmins: DisplayUser[]; unitLeaders: DisplayUser[] } => {
    const s: DisplayUser[] = [];
    const l: DisplayUser[] = [];
    users.forEach(u => {
      if (!u.approved) return; // list only approved users
      (u.roles || []).forEach((r: BackendUserRole) => {
        if (r.role === 'SuperAdmin') {
          s.push({ id: u._id, name: `${u.firstName} ${u.surname}`.trim(), role: 'Super Admin', image: AVATAR_PLACEHOLDER, unit: '' });
        } else if (r.role === 'UnitLeader') {
          l.push({ id: u._id, name: `${u.firstName} ${u.surname}`.trim(), role: 'Unit Leader', image: AVATAR_PLACEHOLDER, unit: r.unit?.name || '' });
        }
      });
    });
    return { superAdmins: s, unitLeaders: l };
  };

  const fetchData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      setLoading(true);
      setSkeletonVisible(true);
      skeletonOpacity.setValue(1);
      loadStartRef.current = Date.now();
      const resp = await axios.get(`${BASE_URl}/api/users`, { headers: { Authorization: `Bearer ${token}` } });
      const list: BackendUser[] = resp.data.users || [];
      const { superAdmins, unitLeaders } = mapBackendUsers(list);
      setSuperAdmins(superAdmins);
      setUnitLeaders(unitLeaders);
      // dynamic skeleton rows for subsequent refreshes
      setSuperAdminSkeletonRows(Math.max(1, Math.min(superAdmins.length || 4, 10)));
      setUnitLeaderSkeletonRows(Math.max(1, Math.min(unitLeaders.length || 6, 12)));
    } catch (e) {
      console.log('fetch users error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
      const elapsed = Date.now() - loadStartRef.current;
      const wait = Math.max(0, MIN_SKELETON_MS - elapsed);
      setTimeout(() => {
        Animated.timing(skeletonOpacity, { toValue: 0, duration: FADE_DURATION, useNativeDriver: true }).start(() => setSkeletonVisible(false));
      }, wait);
    }
  };

  React.useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => { fetchData(); });
    return () => task.cancel();
  }, []);

  // Enable pull-to-refresh only after interactions to prevent insertion-phase updates
  React.useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => setPullReady(true));
    return () => task.cancel();
  }, []);

  // Load current user and determine if multi superadmin (deferred until after interactions)
  React.useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      (async () => {
        try {
          const raw = await AsyncStorage.getItem('user');
          if (raw) {
            const u = JSON.parse(raw);
            const isSuper = Array.isArray(u?.roles) && u.roles.some((r: any) => r.role === 'SuperAdmin');
            setIsMultiSuperAdmin(!!(isSuper && u?.multi));
          }
        } catch (e) { /* ignore */ }
      })();
    });
    return () => task.cancel();
  }, []);

  // Fetch pending counts reusable
  const fetchPendingCounts = React.useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      // Pending Unit Leaders
      try {
        const resp = await axios.get(`${BASE_URl}/api/users/pending/list`, { params: { type: 'unit-leaders' }, headers: { Authorization: `Bearer ${token}` } });
        const list: any[] = resp.data?.users || [];
        const count = list.filter((u: any) => Array.isArray(u.roles) && u.roles.some((r: any) => r.role === 'UnitLeader')).length;
        setPendingUnitLeaders(count);
      } catch {}
      // Pending SuperAdmins (multi only)
      try {
        const resp2 = await axios.get(`${BASE_URl}/api/superadmins/pending`, { headers: { Authorization: `Bearer ${token}` } });
        const list2: any[] = resp2.data?.users || [];
        setPendingSuperAdmins(list2.length);
      } catch {
        setPendingSuperAdmins(0);
      }
      // Pending Ministry Admins
      try {
        const resp3 = await axios.get(`${BASE_URl}/api/users/pending/list`, { params: { type: 'ministry-admins' }, headers: { Authorization: `Bearer ${token}` } });
        const list3: any[] = resp3.data?.users || [];
        const count3 = list3.filter((u: any) => Array.isArray(u.roles) && u.roles.some((r: any) => r.role === 'MinistryAdmin')).length;
        setPendingMinistryAdmins(count3);
      } catch {}
      // Pending Work Plans
      try {
        const resp4 = await axios.get(`${BASE_URl}/api/workplans`, { params: { status: 'pending' }, headers: { Authorization: `Bearer ${token}` } });
        const items: any[] = resp4.data?.items || resp4.data?.plans || [];
        setPendingWorkPlans(items.length || 0);
      } catch {}
    } catch {}
  }, []);

  // initial load (deferred)
  React.useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => { fetchPendingCounts(); });
    return () => task.cancel();
  }, [fetchPendingCounts]);

  // Refresh on screen focus
  useFocusEffect(React.useCallback(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      fetchData();
      fetchPendingCounts();
    });
    return () => task.cancel();
  }, [fetchPendingCounts]));

  const onRefresh = React.useCallback(() => {
    if (!pullReady) return;
    // Schedule state updates after current interactions for safety
    InteractionManager.runAfterInteractions(() => {
      setRefreshing(true);
      fetchData();
    });
  }, [pullReady, fetchData]);
  const filteredSuperAdmins = superAdmins.filter(u => u.name.toLowerCase().includes(query.toLowerCase()));
  const filteredUnitLeaders = unitLeaders.filter(u => (u.name + u.unit).toLowerCase().includes(query.toLowerCase()));

  return (
    <SafeAreaView style={styles.safeArea}>
  <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Manage Super Admins & Unit Leaders</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
        refreshControl={pullReady ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
      >

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            placeholder="Search by name, unit, or phone number"
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
          />
        </View>

        {/* Buttons */}
        {/* Buttons with badges */}
        <View style={styles.buttonRow}>
          {/* Approve Ministry Admins */}
          <View style={styles.badgeWrap} pointerEvents="box-none">
            <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('ApproveMinistryAdmins' as never)}>
              <Ionicons name="checkmark-done-outline" size={20} color="#fff" />
              <Text style={styles.buttonText}>Approve Ministry Admins</Text>
              {pendingMinistryAdmins > 0 && (
                <View style={[styles.badge, styles.badgeRightCenter]}><Text style={styles.badgeText}>{pendingMinistryAdmins}</Text></View>
              )}
            </TouchableOpacity>
          </View>
          {/* Work Plans */}
          <View style={styles.badgeWrap} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('AdminWorkPlansList' as any)}
            >
              <Ionicons name="briefcase-outline" size={20} color="#fff" />
              <Text style={styles.buttonText}>Work Plans</Text>
              {pendingWorkPlans > 0 && (
                <View style={[styles.badge, styles.badgeAmber, styles.badgeRightCenter]}><Text style={styles.badgeText}>{pendingWorkPlans}</Text></View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Approve Unit Leaders , who have registered */}
        <View style={styles.buttonRow}>
          <View style={styles.badgeWrap} pointerEvents="box-none">
            <TouchableOpacity style={[styles.actionButton, styles.assignButton]} onPress={() => navigation.navigate('ApproveUnitLeaders' as never)}>
              <Ionicons name="checkmark-done-outline" size={20} color="#fff" />
              <Text style={styles.buttonText}>Approve Unit Leaders</Text>
              {pendingUnitLeaders > 0 && (
                <View style={[styles.badge, styles.badgeRightCenter]}><Text style={styles.badgeText}>{pendingUnitLeaders}</Text></View>
              )}
            </TouchableOpacity>
          </View>
          {isMultiSuperAdmin && (
            <View style={styles.badgeWrap} pointerEvents="box-none">
              <TouchableOpacity style={[styles.actionButton, styles.assignButton]} onPress={() => navigation.navigate('ApproveSuperAdmins' as never)}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#fff" />
                <Text style={styles.buttonText}>Approve Super Admins</Text>
                {pendingSuperAdmins > 0 && (
                  <View style={[styles.badge, styles.badgeRightCenter]}><Text style={styles.badgeText}>{pendingSuperAdmins}</Text></View>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
        {/* Super Admins */}
        <View style={styles.section}>
          {/* Registered super admins */}
          <Text style={styles.sectionTitle}>Super Admins</Text>
          {skeletonVisible && (
            <ListSkeleton rows={superAdminSkeletonRows} fade={skeletonOpacity} />
          )}
          {!skeletonVisible && filteredSuperAdmins.map((user) => {
            const active = selectedId === user.id;
            return (
              <TouchableOpacity key={user.id} activeOpacity={0.8} onPress={() => setSelectedId(user.id)} style={[styles.listItem, active && styles.listItemActive]}>
                <Image source={{ uri: user.image }} style={styles.avatar} />
                <View>
                  <Text style={styles.userName}>{user.name}</Text>
                  <Text style={styles.userRole}>Super Admin</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Unit Leaders, Registered */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Unit Leaders</Text>
          {skeletonVisible && (
            <ListSkeleton rows={unitLeaderSkeletonRows} fade={skeletonOpacity} />
          )}
          {!skeletonVisible && filteredUnitLeaders.map((user) => {
            const active = selectedId === user.id;
            return (
              <TouchableOpacity key={user.id} activeOpacity={0.8} onPress={() => setSelectedId(user.id)} style={[styles.listItem, active && styles.listItemActive]}>
                <Image source={{ uri: user.image }} style={styles.avatar} />
                <View>
                  <Text style={styles.userName}>{user.name}</Text>
                  <Text style={styles.unitName}>{user.unit}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: heightPercentageToDP('5%'), // Replace with a static value or calculate using Dimensions if needed
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 8,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  scrollView: {
    flex: 1,
    paddingBottom: 10
  },
  container: {
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY_BLUE,
    borderRadius: 28,
    paddingVertical: 12,
    paddingHorizontal: 18,
    flex: 1,
    marginHorizontal: 4,
    justifyContent: 'center',
    position: 'relative',
  },
  assignButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 26,
    marginBottom: 24,
    marginTop: 6,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  badgeWrap: {
    position: 'relative',
    flex: 1,
    marginHorizontal: 4,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  badgeTopRight: {
    top: -6,
    right: -6,
  },
  badgeBottomRight: {
    top: undefined,
    bottom: -6,
    right: -6,
  },
  badgeRightCenter: {
    top: '50%',
    right: 2,
    transform: [{ translateY: -10 }], // center vertically based on badge height ~20
  },
  badgeAmber: {
    backgroundColor: '#F59E0B',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
    color: '#374151',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F4FF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  listItemActive: {
    backgroundColor: '#D9EAF7',
    borderLeftWidth: 4,
    borderLeftColor: PRIMARY_BLUE,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 14,
    backgroundColor: '#E2E8F0'
  },
  userName: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#111827',
  },
  userRole: {
    fontSize: 12,
    color: PRIMARY_BLUE,
    marginTop: 4,
    fontWeight: '600'
  },
  unitName: {
    fontSize: 12,
    color: PRIMARY_BLUE,
    marginTop: 4,
    fontWeight: '600'
  },
  // Skeleton specific styles
  avatarSkeleton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 14,
    backgroundColor: '#d1d5db'
  },
  barPrimary: {
    height: 12,
    backgroundColor: '#d1d5db',
    borderRadius: 6,
    marginBottom: 8,
  },
  barSecondary: {
    height: 10,
    backgroundColor: '#e2e8f0',
    borderRadius: 6,
  },
});

export default ManageSuperAdminsUnitLeadersScreen;
