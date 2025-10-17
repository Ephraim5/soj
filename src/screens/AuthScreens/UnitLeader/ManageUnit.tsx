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
  Animated,
} from 'react-native';
import SkeletonLoading from 'expo-skeleton-loading';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { PRIMARY_BLUE } from '../SuperAdmin/styles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUnitLeaderSummary } from '../../../api/unitLeader';
import { listUnitMembers } from '../../../api/unitMembers';
import { listUnitLeaders } from '../../../api/unitLeaders';
import { heightPercentageToDP } from 'react-native-responsive-screen';

type RootStackParamList = {
  ManageSuperAdminsUnitLeaders: undefined;
};

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ManageSuperAdminsUnitLeaders'
>;

// Placeholder avatar
const AVATAR_PLACEHOLDER = 'https://www.w3schools.com/w3images/avatar2.png';

// Reanimated shim for expo-skeleton-loading (safe no-op if Reanimated is not installed)
(globalThis as any).__reanimatedWorkletInit = (globalThis as any).__reanimatedWorkletInit || (() => {});

// Enhanced skeleton: per-row SkeletonLoading wrappers to avoid wrapper stretching to full block
const ListSkeleton: React.FC<{ rows?: number; fadeOpacity?: Animated.AnimatedInterpolation<string | number> | Animated.Value }>
  = ({ rows = 6, fadeOpacity }) => {
  const Skel: any = SkeletonLoading as any;
  return (
    <Animated.View style={{ opacity: fadeOpacity ?? 1 }}>
      {Array.from({ length: rows }).map((_, i) => {
        const primaryWidth = [60, 55, 65, 50, 58, 62][i % 6];
        const secondaryWidth = [32, 28, 36, 30, 40, 34][i % 6];
        return (
          <Skel key={i} background={'#E8ECF7'} highlight={'#FFFFFF'}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#F0F4FF',
                borderRadius: 8,
                padding: 12,
                marginBottom: 10,
              }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#d1d5db', marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <View style={{ height: 12, width: `${primaryWidth}%`, backgroundColor: '#d1d5db', borderRadius: 6, marginBottom: 8 }} />
                <View style={{ height: 10, width: `${secondaryWidth}%`, backgroundColor: '#e2e8f0', borderRadius: 6 }} />
              </View>
            </View>
          </Skel>
        );
      })}
    </Animated.View>
  );
};

const ManageUnitLeadersUnitScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [leaders, setLeaders] = React.useState<any[]>([]);
  const [members, setMembers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [leaderSkeletonRows, setLeaderSkeletonRows] = React.useState<number>(4);
  const [memberSkeletonRows, setMemberSkeletonRows] = React.useState<number>(6);
  const [skeletonVisible, setSkeletonVisible] = React.useState<boolean>(true);
  const skeletonOpacity = React.useRef(new Animated.Value(1)).current;
  const loadStartRef = React.useRef<number>(Date.now());
  const MIN_SKELETON_MS = 1500; // longer dwell so user perceives layout
  const FADE_DURATION = 320;

  const loadData = React.useCallback(async () => {
    setLoading(true); setError(null);
    setSkeletonVisible(true);
    loadStartRef.current = Date.now();
    try {
      const tokenRaw = await AsyncStorage.getItem('token');
      const token = tokenRaw || (await AsyncStorage.getItem('auth_token')) || undefined;
      if (!token) throw new Error('Missing token');
      // Determine active unit id from profile: pull via unit leader summary (returns the active unit)
      const summary = await getUnitLeaderSummary(token);
      const unitId = summary?.unit?._id;
      if (!unitId) throw new Error('No active unit context');
      const [leadersRes, membersRes] = await Promise.all([
        listUnitLeaders(unitId, token),
        listUnitMembers(unitId, token)
      ]);
  const leaderList = leadersRes?.leaders || [];
  const memberList = membersRes?.members || [];
  setLeaders(leaderList);
  setMembers(memberList);
  // Dynamically set skeleton rows for next load (approximate visual expectation)
  setLeaderSkeletonRows(Math.max(1, Math.min(leaderList.length || 4, 10)));
  setMemberSkeletonRows(Math.max(1, Math.min(memberList.length || 6, 12)));
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
      const elapsed = Date.now() - loadStartRef.current;
      const wait = Math.max(0, MIN_SKELETON_MS - elapsed);
      setTimeout(() => {
        // fade out then hide
        Animated.timing(skeletonOpacity, {
          toValue: 0,
            duration: FADE_DURATION,
            useNativeDriver: true,
        }).start(() => setSkeletonVisible(false));
      }, wait);
    }
  }, []);

  React.useEffect(() => { loadData(); }, [loadData]);

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
  <Text style={styles.headerText}>Manage and Control Unit</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            placeholder="Search by name, unit, or phone number"
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
          />
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.buttonText}>Add New Unit Leader</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('WorkPlansList' as never)}>
            <Ionicons name="briefcase-outline" size={20} color="#fff" />
            <Text style={styles.buttonText}>Work Plan</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.actionButton, styles.assignButton]} onPress={()=> navigation.navigate('ApproveMembers' as never)}>
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
          <Text style={styles.buttonText}>Approve Members</Text>
        </TouchableOpacity>

        {/* Unit Leaders */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Unit Leaders</Text>
          {skeletonVisible && (<ListSkeleton rows={leaderSkeletonRows} fadeOpacity={skeletonOpacity} />)}
          {!skeletonVisible && error && (<Text style={{ color:'#c0392b' }}>{error}</Text>)}
          {!skeletonVisible && !error && leaders.length === 0 && (
            <Text style={{ color:'#666' }}>No leaders found</Text>
          )}
          {!skeletonVisible && !error && leaders.map((u) => {
            const name = `${u.title ? u.title + ' ' : ''}${u.firstName || ''} ${u.surname || ''}`.trim() || 'Unnamed';
            const avatar = u?.profile?.avatar ? { uri: u.profile.avatar } : { uri: AVATAR_PLACEHOLDER };
            return (
              <View key={u._id} style={styles.listItem}>
                <Image source={avatar} style={styles.avatar} />
                <View>
                  <Text style={styles.userName}>{name}</Text>
                  <Text style={styles.userRole}>Unit Leader</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Unit Members */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Unit Members</Text>
          {skeletonVisible && (<ListSkeleton rows={memberSkeletonRows} fadeOpacity={skeletonOpacity} />)}
          {!skeletonVisible && error && (<Text style={{ color:'#c0392b' }}>{error}</Text>)}
          {!skeletonVisible && !error && members.length === 0 && (
            <Text style={{ color:'#666' }}>No members found</Text>
          )}
          {!skeletonVisible && !error && members.map((u) => {
            const name = `${u.title ? u.title + ' ' : ''}${u.firstName || ''} ${u.surname || ''}`.trim() || 'Unnamed';
            const avatar = u?.profile?.avatar ? { uri: u.profile.avatar } : { uri: AVATAR_PLACEHOLDER } as any;
            return (
              <View key={u._id} style={styles.listItem}>
                <Image source={avatar} style={styles.avatar} />
                <View>
                  <Text style={styles.userName}>{name}</Text>
                  <Text style={styles.unitName}>Unit Member</Text>
                </View>
              </View>
            );
          })}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flexGrow: 1,
    paddingTop: heightPercentageToDP('5%'), // Replace with a static value or calculate using Dimensions if needed
    backgroundColor: '#fff',
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
  },
  container: {
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    height: 44,
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
    marginBottom: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY_BLUE,
    borderRadius: 50,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 1,
    marginHorizontal: 4,
    justifyContent: 'center',
  },
  assignButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 20,
    marginTop: 4,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
    marginLeft: 5,
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
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  userRole: {
    fontSize: 13,
    color: PRIMARY_BLUE,
    marginTop: 2,
  },
  unitName: {
    fontSize: 13,
    color: PRIMARY_BLUE,
    marginTop: 2,
  },
});

export default ManageUnitLeadersUnitScreen;
