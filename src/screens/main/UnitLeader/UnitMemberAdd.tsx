import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  Modal,
  Platform,
  KeyboardAvoidingView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { PRIMARY_BLUE } from '../../AuthScreens/SuperAdmin/styles';
import { heightPercentageToDP } from 'react-native-responsive-screen';

// =========================
// Types
// =========================
export type AssistedMember = {
  id: string;
  memberId: string;
  fullName: string;
  phone?: string;
  assistedOn: string; // ISO date string, e.g., "2025-06-20"
  reason: string;
  howHelped: string;
};

export type MemberDirectoryItem = {
  id: string;
  fullName: string;
  phone?: string;
};

// Request shape suitable for an API
export type CreateAssistedRequest = {
  memberId: string;
  assistedOn: string; // ISO 8601
  reason: string;
  howHelped: string;
};

// API + hooks
import { useAssists, useUnitMembers } from '../../../hooks/useUnitMemberData';
import { listUnitMembers, UnitMemberLite } from '../../../api/unitMembers';
import { Assistance } from '../../../api/assists';


const formatDateLong = (iso: string) => {
  const d = new Date(iso);
  const day = d.getDate();
  const month = d.toLocaleString('en-US', { month: 'long' });
  const year = d.getFullYear();
  return `${day} ${month}, ${year}`;
};

const yearFromISO = (iso: string) => new Date(iso).getFullYear();

const makeId = () => Math.random().toString(36).slice(2, 10);


interface AddModalProps {
  visible: boolean;
  directoryFetcher: (query: string) => Promise<MemberDirectoryItem[]>;
  onClose: () => void;
  onSubmit: (payload: CreateAssistedRequest, resolvedMemberName: string) => void;
}

const AddAssistedMemberModal: React.FC<AddModalProps> = ({ visible, directoryFetcher, onClose, onSubmit }) => {
  const [query, setQuery] = useState('');
  const [directory, setDirectory] = useState<MemberDirectoryItem[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberDirectoryItem | null>(null);
  const [assistedOn, setAssistedOn] = useState<string>(new Date().toISOString().slice(0, 10));
  const [showPicker, setShowPicker] = useState<boolean>(false);
  const [reason, setReason] = useState('');
  const [search, setSearch] = useState('');
  const [how, setHow] = useState('');
  const [loadingDir, setLoadingDir] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoadingDir(true);
      try {
        const res = await directoryFetcher(query);
        if (active) setDirectory(res);
      } catch { if (active) setDirectory([]); }
      finally { if (active) setLoadingDir(false); }
    })();
    return () => { active = false; };
  }, [query, directoryFetcher]);

  useEffect(() => {
    if (search.trim().length > 0) {
      setQuery(search);
    } else {
      setQuery('');
    }
  }, [search]);

  const canSubmit = selectedMember && assistedOn && reason.trim() && how.trim();

  const reset = () => {
    setQuery('');
    setSelectedMember(null);
    setAssistedOn(new Date().toISOString().slice(0, 10));
    setReason('');
    setHow('');
  };

  const handleSubmit = () => {
    if (!canSubmit || !selectedMember) return;
    onSubmit(
      {
        memberId: selectedMember.id,
        assistedOn,
        reason: reason.trim(),
        howHelped: how.trim(),
      },
      selectedMember.fullName
    );
    reset();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalBackdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalCard}>
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalTitle}>Add New</Text>
            <Pressable onPress={() => { reset(); onClose(); }} hitSlop={10}>
              <Text style={styles.closeX}>×</Text>
            </Pressable>
          </View>

          <Text style={[styles.modalLabel, { marginTop: 14 }]}>Search </Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search By Name Or Phone Number"
            style={styles.textInput}
            placeholderTextColor="#8A96A0"
          />

          <Text style={styles.modalLabel}>Select Member</Text>
          <View style={styles.searchField}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              placeholder="Search by Name/Phone"
              value={query}
              onChangeText={setQuery}
              style={styles.searchInput}
              placeholderTextColor="#8A96A0"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')}>
                <Text style={{color:"#999"}}>✕</Text>
              </Pressable>
            )}
          </View>

          <View style={{ maxHeight: 120, marginTop: 8 }}>
            <FlatList
              data={directory}
              keyExtractor={(i) => i.id}
              keyboardShouldPersistTaps="handled"
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.memberPickItem, selectedMember?.id === item.id && styles.memberPickItemSelected]}
                  onPress={() => setSelectedMember(item)}
                >
                  <Avatar name={item.fullName} size={28} />
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={styles.memberPickName}>{item.fullName}</Text>
                    {!!item.phone && <Text style={styles.memberPickPhone}>{item.phone}</Text>}
                  </View>
                  {selectedMember?.id === item.id && <Text style={{ fontSize: 16, color:PRIMARY_BLUE }}>✓</Text>}
                </Pressable>
              )}
              ListEmptyComponent={() => (
                <Text style={{ color: '#777', textAlign: 'center', marginTop: 6 }}>
                  {loadingDir ? 'Loading...' : 'No results'}
                </Text>
              )}
            />
          </View>

          <Text style={[styles.modalLabel, { marginTop: 14 }]}>Date of Assistance</Text>
          <Pressable style={styles.iconField} onPress={() => setShowPicker(true)}>
            <Text style={styles.calendarIcon}>📅</Text>
            <Text style={[styles.iconFieldInput, { paddingVertical: 0 }]}>{assistedOn}</Text>
          </Pressable>
          {showPicker && (
            <DateTimePicker
              value={new Date(assistedOn)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(e: DateTimePickerEvent, d?: Date) => {
                if (Platform.OS !== 'ios') setShowPicker(false);
                if (d) {
                  const iso = d.toISOString().slice(0,10);
                  setAssistedOn(iso);
                }
              }}
              maximumDate={new Date()}
            />
          )}

          <Text style={[styles.modalLabel, { marginTop: 14 }]}>Reason for Assistance</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Reason"
            style={styles.textInput}
            placeholderTextColor="#8A96A0"
          />

          <Text style={[styles.modalLabel, { marginTop: 14 }]}>How He/She Was Assisted</Text>
          <TextInput
            value={how}
            onChangeText={setHow}
            placeholder="e.g., Paid medical bill"
            style={styles.textInput}
            placeholderTextColor="#8A96A0"
          />

          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            style={[styles.primaryBtn, !canSubmit && { opacity: 0.5 }]}
          >
            <Text style={styles.primaryBtnText}>Submit</Text>
          </Pressable>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

// =========================
// Card
// =========================
const MemberAssistedCard: React.FC<{ item: AssistedMember }> = ({ item }) => {
  return (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Avatar name={item.fullName} />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={styles.cardName}>{item.fullName}</Text>
          <Text style={styles.cardDate}>{formatDateLong(item.assistedOn)}</Text>
        </View>
      </View>
      <View style={{ marginTop: 10 }}>
        <Text style={styles.cardMeta}>[Reason + How They Were Helped]</Text>
      </View>
    </View>
  );
};

// Simple initials avatar
const Avatar: React.FC<{ name: string; size?: number }> = ({ name, size = 36 }) => {
  const initials = name
    .split(' ')
    .map((p) => p[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#E8F1FD',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#C9E1FF',
      }}
    >
      <Text style={{ color: PRIMARY_BLUE, fontWeight: '700' }}>{initials}</Text>
    </View>
  );
};

const yearsAround = (center: number, pad = 2) => {
  const out: number[] = [];
  for (let y = center - pad; y <= center + pad; y++) out.push(y);
  return out;
};

export default function MembersAssistedScreen({ route, navigation }: any) {
  const readOnlySuperAdmin = route?.params?.readOnlySuperAdmin;
  const routeUnitId = route?.params?.unitId as string | undefined;
  const [token, setToken] = useState<string | undefined>();
  const [unitId, setUnitId] = useState<string | undefined>(routeUnitId);
  const [query, setQuery] = useState('');
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState<number | 'All'>(thisYear);
  const [yearOpen, setYearOpen] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewText, setViewText] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const t1 = await AsyncStorage.getItem('token');
        const t2 = await AsyncStorage.getItem('auth_token');
        setToken(t1 || t2 || undefined);
      } catch {}
      // When in read-only superadmin mode we rely solely on route param unitId
      if (readOnlySuperAdmin && routeUnitId) return;
      try {
        const rawUser = await AsyncStorage.getItem('user');
        if (rawUser) {
          const parsed = JSON.parse(rawUser);
          const activeName = parsed.activeRole;
          const active = (parsed.roles||[]).find((r:any)=> r.role===activeName) || (parsed.roles||[]).find((r:any)=> r.role==='UnitLeader');
          if (active?.unit) setUnitId(active.unit);
        }
      } catch {}
    })();
  }, [readOnlySuperAdmin, routeUnitId]);

  const { data, loading, error, refresh, create, remove } = useAssists(token, { scope: 'auto', unitId, year: year==='All'? undefined : year });

  const items: AssistedMember[] = useMemo(() => {
    const arr: Assistance[] = (data?.assists || []);
    return arr.map(a => ({
      id: a._id,
      memberId: a.member,
      fullName: a.memberName,
      phone: a.phone,
      assistedOn: a.assistedOn,
      reason: a.reason,
      howHelped: a.howHelped,
    }));
  }, [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((x) => {
      const matchYear = year==='All' ? true : yearFromISO(x.assistedOn) === year;
      const matchQ = !q || x.fullName.toLowerCase().includes(q);
      return matchYear && matchQ;
    });
  }, [items, query, year]);

  const totalNumber = filtered.length;

  const handleCreate = async (payload: CreateAssistedRequest, resolvedMemberName: string) => {
    if (readOnlySuperAdmin) return; // block in read-only mode
    if (!token) return;
    try {
      await create({
        memberId: payload.memberId,
        assistedOn: payload.assistedOn,
        reason: payload.reason,
        howHelped: payload.howHelped,
      });
      setModalVisible(false);
    } catch (e) {}
  };

  const yearOptions = ['All', ...yearsAround(thisYear, 2)] as (number|'All')[];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF' }}>
  <StatusBar barStyle={"dark-content"}/>
      <View style={styles.screenWrap}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable hitSlop={10}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
        </View>

        {/* Tab Row */}
        <View style={styles.tabRow}>
          <View style={styles.pillTabActive}>
            <Text style={styles.pillTabActiveText}>Members Assisted</Text>
          </View>

          <View style={{ flex: 1 }} />

          {/* Year Dropdown (simple inline picker) */}
          <View>
            <Pressable style={styles.yearSelector} onPress={() => setYearOpen(v=>!v)}>
              <Text style={styles.yearText}>{year}</Text>
            </Pressable>
            {yearOpen && (
              <View style={styles.dropdownCard}>
                {yearOptions.map((y) => (
                  <TouchableOpacity key={String(y)} style={styles.dropdownItem} onPress={() => { setYear(y); setYearOpen(false); }}>
                    <Text style={{ color: '#222' }}>{String(y)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Search + Add New */}
        <View style={styles.searchAddRow}>
          <View style={styles.searchField}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              placeholder="Search by name"
              placeholderTextColor="#8A96A0"
              value={query}
              onChangeText={setQuery}
              style={styles.searchInput}
            />
          </View>
          {!readOnlySuperAdmin && (
            <Pressable style={styles.addNewBtn} onPress={() => setModalVisible(true)}>
              <Text style={styles.addNewText}>Add New</Text>
            </Pressable>
          )}
        </View>

        {/* Total Number */}
        <View style={{ marginTop: 8 }}>
          <Text style={styles.totalNumberLabel}>Total Number</Text>
          <Text style={styles.totalNumberValue}>{totalNumber}</Text>
        </View>

        {/* Section Title + Filter Button (visual only) */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Assisted Members</Text>
          <Pressable style={[styles.filterBtn, (loading||isRefreshing) && { opacity: 0.6 }]} disabled={loading||isRefreshing} onPress={async () => { setIsRefreshing(true); try { await refresh(); } finally { setIsRefreshing(false); } }}>
            <Text style={{ marginRight: 6 }}>{(loading||isRefreshing)? 'Refreshing...' : 'Refresh'}</Text>
            <Text>🔄</Text>
          </Pressable>
        </View>

        {/* Cards */}
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => (
            <View>
              <MemberAssistedCard item={item} />
              <View style={{ flexDirection: 'row', marginTop: 6, justifyContent: 'flex-end' }}>
                <Pressable onPress={() => setViewText(`${item.reason}\n\n${item.howHelped}`)} style={[styles.smallBtn, { marginRight: 8 }]}>
                  <Text style={{ color: PRIMARY_BLUE, fontWeight: '700' }}>View</Text>
                </Pressable>
                {!readOnlySuperAdmin && (
                  <Pressable onPress={() => setConfirmDeleteId(item.id)} style={[styles.smallBtn]}> 
                    <Text style={{ color: '#D22', fontWeight: '700' }}>Delete</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}
        />
      </View>

      {/* Modal */}
      {!readOnlySuperAdmin && (
        <AddAssistedMemberModal
          visible={modalVisible}
          directoryFetcher={async (q) => {
            if (!unitId || !token) return [];
            try {
              const res = await listUnitMembers(unitId, token);
              const members = (res.members||[]) as UnitMemberLite[];
              return members.map(m => ({ id: m._id, fullName: m.name || `${m.firstName||''} ${m.surname||''}`.trim(), phone: m.phone }))
                .filter(m => !q || m.fullName.toLowerCase().includes(q.toLowerCase()) || (m.phone||'').toLowerCase().includes(q.toLowerCase()));
            } catch { return []; }
          }}
          onClose={() => setModalVisible(false)}
          onSubmit={handleCreate}
        />
      )}

      {/* View Long Text Modal */}
      <Modal visible={!!viewText} transparent animationType="fade">
        <View style={styles.viewBackdrop}>
          <View style={styles.viewCard}>
            <Text style={styles.sectionTitle}>Details</Text>
            <Text style={{ color: '#222', marginTop: 8 }}>{viewText}</Text>
            <Pressable onPress={() => setViewText(null)} style={[styles.primaryBtn, { marginTop: 14 }]}>
              <Text style={styles.primaryBtnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Delete Confirm Modal */}
      {!readOnlySuperAdmin && (
        <Modal visible={!!confirmDeleteId} transparent animationType="fade">
          <View style={styles.viewBackdrop}>
            <View style={styles.viewCard}>
              <Text style={styles.sectionTitle}>Confirm Delete</Text>
              <Text style={{ color: '#444', marginTop: 8 }}>This will remove the record permanently.</Text>
              <View style={{ flexDirection: 'row', marginTop: 14 }}>
                <Pressable onPress={() => setConfirmDeleteId(null)} style={[styles.smallBtn, { marginRight: 8 }]}>
                  <Text style={{ color: '#333', fontWeight: '700' }}>Cancel</Text>
                </Pressable>
                <Pressable onPress={async () => { if (confirmDeleteId) { await remove(confirmDeleteId); setConfirmDeleteId(null); } }} style={[styles.smallBtn]}> 
                  <Text style={{ color: '#D22', fontWeight: '700' }}>Delete</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

// =========================
// Styles
// =========================
const styles = StyleSheet.create({
  screenWrap: {
    flex: 1,
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  backIcon: { color: 'black', fontSize: 28, lineHeight: 28 },
  headerTitle: { color: 'black', fontSize: 20, fontWeight: '700' },

  tabRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pillTabActive: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  pillTabActiveText: { color: 'black', fontWeight: '700' ,fontSize: 20},
  yearSelector: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: PRIMARY_BLUE,
  },
  yearText: { color: 'black', fontWeight: '600' },
  dropdownCard: {
    position: 'absolute',
    right: 0,
    top: 46,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PRIMARY_BLUE,
    paddingVertical: 6,
    zIndex: 20,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  searchAddRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor:PRIMARY_BLUE,
    paddingHorizontal: 10,
    height: 44,
    borderRadius: 10,
  },
  searchIcon: { fontSize: 16, marginRight: 8, color:PRIMARY_BLUE },
  searchInput: { flex: 1, color: 'black', paddingVertical: 0 },

  addNewBtn: {
    marginLeft: 10,
    backgroundColor: PRIMARY_BLUE,
    borderRadius: 10,
    paddingHorizontal: 16,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addNewText: { color: 'white', fontWeight: '700' },

  totalNumberLabel: { color: '#484848ff', fontSize: 16 },
  totalNumberValue: { color: '#484848ff', fontSize: 28, fontWeight: '800' },

  sectionHeaderRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { color: 'black', fontSize: 16, fontWeight: '700' },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: PRIMARY_BLUE,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 36,
  },

  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor:PRIMARY_BLUE,
    marginTop: 8,
    borderRadius: 12,
    padding: 12,
  },
  cardName: { color: 'black', fontSize: 15, fontWeight: '700' },
  cardDate: { color: '#050505ff', fontSize: 12, marginTop: 2 },
  cardMeta: { color: '#000000ff', fontSize: 12 },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(181, 205, 203, 0.45)',
    padding: 16,
    justifyContent: 'center',
  },
  modalCard: {
    backgroundColor: '#fff',
    top:heightPercentageToDP('10%'),
    borderRadius: 12,
    borderWidth: 1,
    borderColor:PRIMARY_BLUE,
    padding: 14,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modalTitle: { color: '#4d4d4dff', fontWeight: '800', fontSize: 16 },
  closeX: { color: '#999', fontSize: 22 },
  modalLabel: { color: 'rgba(73, 73, 73, 1)', fontSize: 13, fontWeight: '600', marginTop: 6 },

  iconField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffffff',
    borderWidth: 1,
    borderColor: PRIMARY_BLUE,
    paddingHorizontal: 10,
    height: 44,
    borderRadius: 10,
  },
  calendarIcon: { fontSize: 16, marginRight: 8, color: '#9FB3C8' },
  iconFieldInput: { flex: 1, color: 'black', paddingVertical: 0 },

  textInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor:PRIMARY_BLUE,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
    color: 'black',
  },

  memberPickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: PRIMARY_BLUE,
    padding: 10,
    borderRadius: 10,
  },
  memberPickItemSelected: {
    borderColor: PRIMARY_BLUE,
  },
  memberPickName: { color: 'black', fontWeight: '700' },
  memberPickPhone: { color:PRIMARY_BLUE, fontSize: 12 },

  primaryBtn: {
    marginTop: 16,
    backgroundColor: PRIMARY_BLUE,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: 'white', fontWeight: '800' },
  smallBtn: {
    borderWidth: 1,
    borderColor: PRIMARY_BLUE,
    paddingHorizontal: 12,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#fff'
  },
  viewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  viewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PRIMARY_BLUE,
    padding: 16,
    width: '100%'
  },
});
