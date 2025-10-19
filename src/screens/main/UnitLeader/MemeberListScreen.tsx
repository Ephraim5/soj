import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  TextInput,
  Modal,
  Image,
  Linking,
  Switch,
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useRoute } from '@react-navigation/native';
import { PRIMARY_BLUE } from '../../AuthScreens/SuperAdmin/styles';
import { MaterialIcons } from '@expo/vector-icons';
import { CheckBox } from 'react-native-elements';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import ModernLoader from '../../../loader/load';
import { listUnitMembers, UnitMemberLite } from '../../../api/unitMembers';
import { BASE_URl } from '../../../api/users';
import { getUnitSummaryById } from '../../../api/unitSummary';


type RootStackParamList = {
  MemberList: { unitId?: string } | undefined;
  SoulsWon: undefined;
};

type MemberListScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'MemberList'
>;

type Props = {
  navigation: MemberListScreenNavigationProp;
  route: RouteProp<RootStackParamList, 'MemberList'>;
};
type filterType = {
  all: boolean;
  male: boolean;
  female: boolean;
  employed: boolean;
  unemployed: boolean;
  married: boolean;
  single: boolean;
  widowed: boolean;
  divorced: boolean;
}
const MemberListScreen: React.FC<Props> = ({ navigation, route }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [filters, setFilters] = useState<filterType>({
    all: false,
    male: false,
    female: false,
    employed: false,
    unemployed: false,
    married: false,
    single: false,
    widowed: false,
    divorced: false,
  });
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<UnitMemberLite[]>([]);
  const [search, setSearch] = useState('');
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [selected, setSelected] = useState<UnitMemberLite | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<any>(null);
  const [totalMembers, setTotalMembers] = useState<number>(0);
  const [femaleMembers, setFemaleMembers] = useState<number>(0);
  const [maleMembers, setMaleMembers] = useState<number>(0);
  const [canAddMember, setCanAddMember] = useState<boolean>(false);
  const [unitNames, setUnitNames] = useState<Record<string,string>>({});
  const [finSec, setFinSec] = useState<boolean>(false);
  const [finSecLoading, setFinSecLoading] = useState<boolean>(false);
  const [effectiveUnitId, setEffectiveUnitId] = useState<string | undefined>(undefined);

  const unitId = (route.params as any)?.unitId;

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const token = await AsyncStorage.getItem('token');
        if(!token){ return; }
        // Determine role capability
        try {
          const raw = await AsyncStorage.getItem('user');
          if (raw) {
            const u = JSON.parse(raw);
            const isLeader = u?.activeRole === 'UnitLeader' || (Array.isArray(u?.roles) && u.roles.some((r: any)=>r.role==='UnitLeader'));
            // SuperAdmin must not see Add button, leaders can. Members also should not here.
            const isSuper = u?.activeRole === 'SuperAdmin' || (Array.isArray(u?.roles) && u.roles.some((r: any)=>r.role==='SuperAdmin'));
            setCanAddMember(isLeader && !isSuper);
          }
        } catch {}
  // Prefer explicit unitId, otherwise fall back to stored activeUnitId
  const effUnitId = unitId || (await AsyncStorage.getItem('activeUnitId')) || undefined;
  setEffectiveUnitId(effUnitId);
  if(effUnitId){
    const res = await listUnitMembers(effUnitId, token);
          setMembers(res.members || []);
          // Fetch unit-level summary for counts
          try {
            const sum = await getUnitSummaryById(token, effUnitId);
            if (sum?.ok) {
              setTotalMembers(sum.counts?.membersCount || 0);
              setFemaleMembers(sum.counts?.femaleCount || 0);
              setMaleMembers(sum.counts?.maleCount || 0);
            }
          } catch {}
          // Fallback: compute counts locally if summary lacks gender counts
          try {
            const fem = (res.members || []).filter(m => (m.gender || (m as any)?.profile?.gender || '').toLowerCase() === 'female').length;
            const mal = (res.members || []).filter(m => (m.gender || (m as any)?.profile?.gender || '').toLowerCase() === 'male').length;
            if (!femaleMembers) setFemaleMembers(fem);
            if (!maleMembers) setMaleMembers(mal);
            if (!totalMembers) setTotalMembers((res.members || []).length);
          } catch {}
        } else {
          // fallback: attempt to use active role's unit? Skipped; expect unitId provided by navigation
        }
      } catch (e:any) {
        console.log('members fetch error', e?.message);
      } finally { setLoading(false); }
    };
    run();
  }, [unitId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let base = members;
    if(q){
      base = base.filter(m => {
        const name = [m.title, m.firstName, m.surname].filter(Boolean).join(' ').toLowerCase();
        return name.includes(q) || (m.phone||'').toLowerCase().includes(q);
      });
    }
    // note: filter chips not wired to real attributes yet; keep UI only
    return base;
  }, [members, search]);

  const openMemberDetails = async (m: UnitMemberLite) => {
    try {
      setSelected(m);
      setDetailsVisible(true);
      setDetailsLoading(true);
      const token = await AsyncStorage.getItem('token');
      if(!token) return;
      const res = await axios.get(`${BASE_URl}/api/users/${m._id}`, { headers: { Authorization: `Bearer ${token}` } });
      const u = res.data?.user || res.data || null;
      setSelectedDetails(u);
      // Resolve unit names for roles
      try {
        const ids: string[] = Array.from(new Set(((u?.roles||[]).map((r:any)=> r?.unit && typeof r.unit === 'string' ? String(r.unit) : null).filter(Boolean)) as string[]));
        if(ids.length){
          const unitsRes = await axios.get(`${BASE_URl}/api/units`, { headers: { Authorization: `Bearer ${token}` } });
          const list = unitsRes.data?.units || [];
          const map: Record<string,string> = {};
          for(const it of list){ map[String(it._id)] = it.name; }
          setUnitNames(map);
        }
      } catch {}
      // Determine current Financial Secretary assignment within effective unit
      try {
        const eu = effectiveUnitId || (await AsyncStorage.getItem('activeUnitId')) || undefined;
        const hasFin = Array.isArray(u?.roles) && u.roles.some((r:any)=> (String(r?.unit||'')===String(eu)) && Array.isArray(r?.duties) && r.duties.includes('FinancialSecretary'));
        setFinSec(!!hasFin);
      } catch {}
    } catch (e:any) {
      console.log('load member details error', e?.message);
    } finally {
      setDetailsLoading(false);
    }
  };

  const fmtDate = (d?: string | Date) => {
    if(!d) return '';
    const dt = typeof d === 'string' ? new Date(d) : d;
    if(isNaN(dt.getTime())) return '';
    return dt.toLocaleDateString();
  };

  const callPhone = (phone?: string) => {
    if(!phone) return;
    const url = `tel:${phone}`;
    Linking.openURL(url).catch(() => {});
  };

  const smsPhone = (phone?: string) => {
    if(!phone) return;
    const url = `sms:${phone}`;
    Linking.openURL(url).catch(() => {});
  };

  const handleSoulWon = () => {
    navigation.navigate('SoulsWon');
  };
  const showModel = () => {
    setModalVisible(true);
  };

  const handleFilterChange = (filter: keyof filterType) => {
  setFilters(prev => {
    const resetFilters = Object.keys(prev).reduce((acc, key) => {
      acc[key as keyof filterType] = false;
      return acc;
    }, {} as filterType);

    return { ...resetFilters, [filter]: true };
  });
};



  const handleSubmit = () => {
    setModalVisible(false);
  };

  const onToggleFinSec = async (value: boolean) => {
    try{
      if(!selectedDetails) return;
      const token = await AsyncStorage.getItem('token'); if(!token) return;
      if(!effectiveUnitId){ const tmp = await AsyncStorage.getItem('activeUnitId'); setEffectiveUnitId(tmp || undefined); }
      const unit = effectiveUnitId || (await AsyncStorage.getItem('activeUnitId')) || undefined;
      if(!unit) return;
      setFinSecLoading(true);
      if(value){
        await axios.post(`${BASE_URl}/api/units/${unit}/assign-finsec`, { userId: selectedDetails._id }, { headers:{ Authorization:`Bearer ${token}` } });
        setFinSec(true);
      } else {
        await axios.post(`${BASE_URl}/api/units/${unit}/unassign-finsec`, {}, { headers:{ Authorization:`Bearer ${token}` } });
        setFinSec(false);
      }
    }catch(e:any){
      // rollback UI on error
      setFinSec(prev=>!prev);
      console.log('finsec toggle error', e?.response?.data?.message || e?.message);
    } finally { setFinSecLoading(false); }
  };

  const openEmailCompose = (email?: string) => {
    if(email){
      const url = `mailto:${email}`;
      Linking.openURL(url).catch(()=>{});
    } else if (selectedDetails?.phone) {
      smsPhone(selectedDetails.phone);
    }
  };

  return (
    <View style={styles.container}>
  <StatusBar barStyle={"dark-content"} hidden={false}  />
      <View style={[styles.header, unitId ? { paddingBottom: 6 } : null]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        {!unitId && <Text style={styles.headerTitle}>Unit Member List</Text>}
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search a member by name, phone number or title"
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity onPress={showModel}>
          <MaterialIcons name="format-list-bulleted-add" size={30} color={"#333"} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Total Members</Text>
          <Text style={styles.statNumber}>{totalMembers || members.length}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Female Members</Text>
          <Text style={styles.statNumber}>{femaleMembers || '-'}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Male Members</Text>
          <Text style={styles.statNumber}>{maleMembers || '-'}</Text>
        </View>
      </View>

      <View style={styles.membersSection}>
        <View style={styles.membersHeader}>
          <Text style={styles.sectionTitle}>All Members</Text>
          {canAddMember ? (
            <TouchableOpacity onPress={handleSoulWon} style={{ padding: 10, backgroundColor: '#349DC5', borderRadius: 8 }}>
              <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>Add Another Member</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {loading ? (
          <View style={{ paddingVertical:30 }}>
            <ModernLoader fullscreen={false} spinnerSize={48} ringWidth={5} logoSize={30} />
          </View>
        ) : (
          <ScrollView style={styles.membersList}>
            {filtered.map((m) => {
              const fullname = [m.title, m.firstName, m.middleName, m.surname].filter(Boolean).join(' ') || (m as any).name;
              const initials = fullname
                ? fullname.split(' ').slice(0,2).map((p: string)=>p[0]).join('').toUpperCase()
                : 'M';
              const avatar = (m as any)?.profile?.avatar as string | undefined;
              return (
                <TouchableOpacity key={m._id} style={styles.memberItem} onPress={() => openMemberDetails(m)}>
                  <View style={styles.avatarContainer}>
                    {avatar ? (
                      <Image source={{ uri: avatar }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                    ) : (
                      <View style={styles.initialsCircle}>
                        <Text style={styles.initialsText}>{initials}</Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{fullname}</Text>
                    {!!m.phone && <Text style={styles.memberSub}>{m.phone}</Text>}
                  </View>
                  <Icon name="chevron-forward" size={20} color="#aaa" />
                </TouchableOpacity>
              );
            })}
            {filtered.length === 0 && (
              <Text style={{ textAlign:'center', color:'#666', paddingVertical:16 }}>No members found</Text>
            )}
          </ScrollView>
        )}
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filter Members</Text>
            {(Object.keys(filters) as (keyof filterType)[]).map(filter => (
              <View key={filter} style={styles.checkboxContainer}>
                <CheckBox
                  checked={filters[filter]}
                  onPress={() => handleFilterChange(filter)}
                  checkedColor={PRIMARY_BLUE}
                  uncheckedColor="#ccc"
                />
                <Text style={styles.checkboxLabel}>
                  {filter.charAt(0).toUpperCase() + filter.slice(1)} Members
                </Text>
              </View>
            ))}

            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>SUBMIT</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Member Details Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={detailsVisible}
        onRequestClose={() => setDetailsVisible(false)}
      >
        <View style={styles.detailsOverlay}>
          <View style={styles.detailsCard}>
            <View style={{ alignSelf:'flex-end' }}>
              <TouchableOpacity onPress={() => setDetailsVisible(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            {detailsLoading ? (
              <ModernLoader fullscreen={false} spinnerSize={48} ringWidth={5} logoSize={28} />
            ) : (
              <ScrollView style={{ alignSelf: 'stretch' }} contentContainerStyle={{ alignItems:'center', paddingBottom: 8 }}>
                <View style={styles.detailsAvatarCircle}>
                  {selectedDetails?.profile?.avatar ? (
                    <Image source={{ uri: selectedDetails.profile.avatar }} style={{ width: 86, height: 86, borderRadius: 43 }} />
                  ) : (
                    <Icon name="person" size={36} color="#fff" />
                  )}
                </View>
                <Text style={styles.detailsName}>
                  {[
                    selectedDetails?.title,
                    selectedDetails?.firstName,
                    selectedDetails?.middleName,
                    selectedDetails?.surname
                  ].filter(Boolean).join(' ')}
                </Text>
                {!!selectedDetails?.email && (
                  <Text style={styles.detailsMeta}>{selectedDetails.email}</Text>
                )}
                {!!selectedDetails?.phone && (
                  <Text style={styles.detailsMeta}>{selectedDetails.phone}</Text>
                )}

                {/* Quick actions */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity style={[styles.actionBtn,{ backgroundColor:'#0B2346' }]} onPress={() => callPhone(selectedDetails?.phone)}>
                    <Icon name="call" size={16} color="#fff" />
                    <Text style={styles.actionText}>Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn,{ backgroundColor:'#349DC5' }]} onPress={() => smsPhone(selectedDetails?.phone)}>
                    <Icon name="chatbubble-ellipses" size={16} color="#fff" />
                    <Text style={styles.actionText}>SMS</Text>
                  </TouchableOpacity>
                </View>

                {/* Profile details */}
                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionTitle}>Profile</Text>
                  {!!(selectedDetails?.profile?.gender || selectedDetails?.gender) && (
                    <Text style={styles.detailsMeta}>Gender: {selectedDetails?.profile?.gender || selectedDetails?.gender}</Text>
                  )}
                  {!!selectedDetails?.profile?.dob && (
                    <Text style={styles.detailsMeta}>DOB: {fmtDate(selectedDetails.profile.dob)}</Text>
                  )}
                  {!!selectedDetails?.profile?.maritalStatus && (
                    <Text style={styles.detailsMeta}>Marital Status: {selectedDetails.profile.maritalStatus}</Text>
                  )}
                  {!!selectedDetails?.profile?.employmentStatus && (
                    <Text style={styles.detailsMeta}>Employment: {selectedDetails.profile.employmentStatus}</Text>
                  )}
                  {!!selectedDetails?.profile?.occupation && (
                    <Text style={styles.detailsMeta}>Occupation: {selectedDetails.profile.occupation}</Text>
                  )}
                  {!!selectedDetails?.profile?.education && (
                    <Text style={styles.detailsMeta}>Education: {selectedDetails.profile.education}</Text>
                  )}
                  {!!selectedDetails?.profile?.address && (
                    <Text style={styles.detailsMeta}>Address: {selectedDetails.profile.address}</Text>
                  )}
                </View>

                {/* Role & Status */}
                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionTitle}>Roles</Text>
                  {Array.isArray(selectedDetails?.roles) && selectedDetails.roles.length > 0 ? (
                    selectedDetails.roles.map((r: any, idx: number) => {
                      const unitName = r?.unit?.name || (typeof r?.unit === 'string' ? (unitNames[String(r.unit)] || '') : '');
                      const roleName = r?.role === 'UnitLeader' ? 'Unit Leader' : r?.role;
                      const label = `${roleName}${unitName ? ' – ' + unitName : ''}`;
                      return (
                        <Text key={idx} style={styles.detailsMeta}>
                          {label}
                        </Text>
                      );
                    })
                  ) : (
                    <Text style={styles.detailsMeta}>No roles</Text>
                  )}
                  {!!selectedDetails?.activeRole && (
                    <Text style={styles.detailsMeta}>Active Role: {selectedDetails.activeRole}</Text>
                  )}
                  <Text style={styles.detailsMeta}>Approved: {selectedDetails?.approved ? 'Yes' : 'No'}</Text>
                  <Text style={styles.detailsMeta}>Verified: {selectedDetails?.isVerified ? 'Yes' : 'No'}</Text>
                  {!!selectedDetails?.createdAt && (
                    <Text style={styles.detailsMeta}>Joined: {fmtDate(selectedDetails.createdAt)}</Text>
                  )}
                </View>

                {/* Actions & toggles */}
                <View style={[styles.detailsSection, { backgroundColor:'#fff' }]}>
                  {/* Send Message */}
                  <TouchableOpacity style={styles.optionRow} onPress={()=> openEmailCompose(selectedDetails?.email)}>
                    <View style={[styles.optionIconWrap, { backgroundColor:'#ecfdf5' }]}>
                      <Icon name="chatbubble-ellipses" size={18} color="#10b981" />
                    </View>
                    <Text style={styles.optionLabel}>Send Message</Text>
                    <Icon name="chevron-forward" size={18} color="#9ca3af" />
                  </TouchableOpacity>

                  {/* Make Unit Fin. Secretary */}
                  <View style={styles.optionRow}>
                    <View style={[styles.optionIconWrap, { backgroundColor:'#eff6ff' }]}>
                      <Icon name="person" size={18} color="#1d4ed8" />
                    </View>
                    <Text style={styles.optionLabel}>Make Unit Fin. Secretary</Text>
                    <Switch value={finSec} onValueChange={onToggleFinSec} disabled={finSecLoading} />
                  </View>

                  {/* Deactivate Account (placeholder) */}
                  <View style={styles.optionRow}>
                    <View style={[styles.optionIconWrap, { backgroundColor:'#fff7ed' }]}>
                      <Icon name="close-circle" size={18} color="#f59e0b" />
                    </View>
                    <Text style={styles.optionLabel}>Deactivate Account</Text>
                    <Switch value={false} onValueChange={()=>{}} disabled />
                  </View>

                  {/* Delete Account (visible but guarded) */}
                  <TouchableOpacity style={styles.optionRow} disabled>
                    <View style={[styles.optionIconWrap, { backgroundColor:'#fef2f2' }]}>
                      <Icon name="trash" size={18} color="#ef4444" />
                    </View>
                    <Text style={[styles.optionLabel, { color:'#ef4444' }]}>Delete Account</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor:PRIMARY_BLUE,
    marginBottom: 10,
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: 'white',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
    flexDirection: 'row',
    gap:10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 13,
    color: '#111',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    elevation: 1,
  },
  statLabel: {
    fontSize: 12,
    color: PRIMARY_BLUE,
    marginBottom: 6,
    fontWeight: '700',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0b0b0b',
  },
  membersSection: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  membersHeader: {
    marginBottom: 15,
    justifyContent: 'space-between',
    paddingVertical: 10,
    flexDirection: 'row',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  membersList: {
    flex: 1,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    elevation: 1,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  initialsCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PRIMARY_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 12,
  },
  memberName: {
    fontSize: 14,
    color: '#0b2346',
    fontWeight: '800',
    flex: 1,
  },
  memberSub: { fontSize: 12, color: '#4b5563', marginTop: 2 },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(234, 242, 245, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    width: '80%',
    alignItems: 'flex-start',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  checkboxLabel: {
    marginLeft: 5,
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#349DC5',
    padding: 10,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  detailsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  detailsCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#eef1f5',
    alignItems: 'center',
  },
  detailsAvatarCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#0B2346',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#349DC5',
  },
  detailsName: { fontSize: 18, fontWeight: '800', color: '#14234b', marginBottom: 6, textAlign: 'center' },
  detailsMeta: { fontSize: 14, color: '#374151', marginBottom: 4 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 8, marginBottom: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  actionText: { color: '#fff', fontWeight: '700' },
  detailsSection: { alignSelf: 'stretch', backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginTop: 8, borderWidth: 1, borderColor: '#eef1f5' },
  detailsSectionTitle: { fontSize: 13, fontWeight: '800', color: '#0b2346', marginBottom: 6, textTransform: 'uppercase' },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  optionIconWrap: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  optionLabel: { flex: 1, color: '#111827', fontSize: 14, fontWeight: '700', marginLeft: 10 },
});

export default MemberListScreen;