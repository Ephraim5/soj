import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    Modal,
    SafeAreaView,
} from "react-native";
import { PRIMARY_BLUE } from "../../AuthScreens/SuperAdmin/styles";
import Icon from 'react-native-vector-icons/Ionicons';
import { heightPercentageToDP } from "react-native-responsive-screen";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { listMarriages, createMarriage, updateMarriage as apiUpdateMarriage, deleteMarriage as apiDeleteMarriage, Marriage as MarriageDoc } from '../../../api/marriages';
import { getUnitMemberSummary } from '../../../api/unitMemberSummary';
import { listUnitMembers, UnitMemberLite } from '../../../api/unitMembers';

export default function MarriagesScreen({navigation, route}:any) {
    const readOnlySuperAdmin = route?.params?.readOnlySuperAdmin;
    const routeUnitId = route?.params?.unitId as string | undefined;
    const [year, setYear] = useState<string>(new Date().getFullYear().toString());
    const [query, setQuery] = useState("");
    const [data, setData] = useState<MarriageDoc[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [yearPickerVisible, setYearPickerVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editing, setEditing] = useState<MarriageDoc | null>(null);
    const [token, setToken] = useState<string>('');
    const [unitId, setUnitId] = useState<string | undefined>(undefined);
    const [members, setMembers] = useState<UnitMemberLite[]>([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [memberSearch, setMemberSearch] = useState('');
    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

    // Modal states
    const [selectedName, setSelectedName] = useState("");
    const [marriageDate, setMarriageDate] = useState("");
    const [note, setNote] = useState("");

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const tk = (await AsyncStorage.getItem('token')) || (await AsyncStorage.getItem('auth_token')) || '';
                setToken(tk);
                if(!tk) return;
                const params: any = { q: query };
                if (year !== 'All') params.year = year;
                // if viewing a specific unit passed in route, include it
                if (routeUnitId) params.unitId = routeUnitId;
                const list = await listMarriages(tk, params);
                setData(list);
            } catch (e) {
                console.log('marriages load error', e);
            } finally {
                setLoading(false);
            }
        })();
    }, [year, query, routeUnitId]);

    useEffect(() => {
        (async () => {
            try {
                const tk = (await AsyncStorage.getItem('token')) || (await AsyncStorage.getItem('auth_token')) || '';
                if (!tk) return;
                if (readOnlySuperAdmin && routeUnitId) {
                    setUnitId(routeUnitId);
                    setMembersLoading(true);
                    const res = await listUnitMembers(routeUnitId, tk);
                    setMembers(res.members || []);
                    setMembersLoading(false);
                    return;
                }
                const summary = await getUnitMemberSummary(tk);
                const uid = summary.unit?._id;
                setUnitId(uid);
                if (uid) {
                    setMembersLoading(true);
                    const res = await listUnitMembers(uid, tk);
                    setMembers(res.members || []);
                }
            } catch (e) {
                console.log('load unit members error', e);
            } finally {
                setMembersLoading(false);
            }
        })();
    }, [readOnlySuperAdmin, routeUnitId]);

    const years = useMemo(() => {
        const current = new Date().getFullYear();
        const start = 2014; // baseline year
        const arr: string[] = ['All'];
        for (let y = current; y >= start; y--) arr.push(String(y));
        return arr;
    }, []);

    const handleSubmit = async () => {
        if (readOnlySuperAdmin) return; // block in read-only
        const finalName = selectedMemberId ? selectedName : selectedName;
        if (!finalName || !marriageDate) return;
        try{
            setSubmitting(true);
            const tk = (await AsyncStorage.getItem('token')) || (await AsyncStorage.getItem('auth_token')) || '';
            if (editing) {
                const updated = await apiUpdateMarriage(tk, editing._id, { name: finalName, date: marriageDate, note });
                setData(prev => prev.map(m => m._id === updated._id ? updated : m));
            } else {
                const doc = await createMarriage(tk, { name: finalName, date: marriageDate, note });
                setData(prev => [doc, ...prev]);
            }
            setModalVisible(false);
            setEditing(null);
            setSelectedName("");
            setMarriageDate("");
            setNote("");
            setSelectedMemberId(null);
            setMemberSearch('');
        }catch(e){
            console.log('marriage submit error', e);
        }finally{
            setSubmitting(false);
        }
    };

    const openAddModal = () => {
        if (readOnlySuperAdmin) return;
        setEditing(null);
        setSelectedName("");
        setMarriageDate("");
        setNote("");
        setSelectedMemberId(null);
        setMemberSearch('');
        setModalVisible(true);
    };

    const openEdit = (m: MarriageDoc) => {
        if (readOnlySuperAdmin) return;
        setEditing(m);
        setSelectedName(m.name || '');
        setMarriageDate((m.date || '').slice(0,10));
        setNote(m.note || '');
        setSelectedMemberId(null);
        setMemberSearch('');
        setModalVisible(true);
    };

    const handleDelete = async (id: string) => {
        if (readOnlySuperAdmin) return;
        try{
            const tk = (await AsyncStorage.getItem('token')) || (await AsyncStorage.getItem('auth_token')) || '';
            await apiDeleteMarriage(tk, id);
            setData(prev => prev.filter(m => m._id !== id));
        }catch(e){
            console.log('delete marriage error', e);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Icon name="chevron-back" size={24} color="#333" />
                </TouchableOpacity>
            </View>         
               <View style={styles.row}>
                <View style={styles.iconBox}>
                    <Ionicons name="people" size={30} color={PRIMARY_BLUE} />
                </View>
                <Text style={styles.title}>Unit Members That Got Married</Text>
            </View>

            {/* Year Dropdown */}
            <TouchableOpacity style={styles.yearBox} onPress={() => setYearPickerVisible(true)}>
                <Text>{year === 'All' ? 'All Years' : year} ▼</Text>
            </TouchableOpacity>

            {/* Search & Add */}
            <View style={styles.searchRow}>
                <TextInput
                    placeholder="Search by name or phone number"
                    value={query}
                    onChangeText={setQuery}
                    style={styles.search}
                />
                {!readOnlySuperAdmin && (
                    <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
                        <Text style={styles.addBtnText}>Add New</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Count */}
            <View style={{ display: 'flex', flexDirection: "row", justifyContent: "space-between" }}>
                <View style={{ alignContent: "center" }}>
                    <Text style={styles.count}>Number of Marriages in {year === 'All' ? 'All Years' : year}</Text>
                    <Text style={[styles.countNumber, { textAlign: "left" }]}>{data.length}</Text>
                </View>

                {/* Filter by Date */}
                <TouchableOpacity style={styles.filterBtn}>
                    <Text style={styles.filterText}>Filter by Date 📅</Text>
                </TouchableOpacity>
            </View>

            {/* List */}
            <FlatList
                data={data}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <Text style={styles.name}>{item.name}</Text>
                        <Text style={styles.date}>
                            {new Date(item.date).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                            })}
                        </Text>
                        {item.note ? <Text style={styles.note}>{item.note}</Text> : null}
                        {!readOnlySuperAdmin && (
                            <View style={{ flexDirection:'row', gap:12, marginTop:8 }}>
                                <TouchableOpacity onPress={() => openEdit(item)} style={styles.smallBtn}><Text style={styles.smallBtnText}>Edit</Text></TouchableOpacity>
                                <TouchableOpacity onPress={() => handleDelete(item._id)} style={[styles.smallBtn, { backgroundColor:'#e74c3c' }]}><Text style={styles.smallBtnText}>Delete</Text></TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}
            />

            {/* Modal */}
            {!readOnlySuperAdmin && (
                        <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <View style={{ display: "flex", flexDirection: "row", justifyContent: "space-between" }}>
                                                        <Text style={styles.modalLabel}>Select Member</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Text style={styles.modalLabel} >
                                    X
                                </Text>
                            </TouchableOpacity>
                        </View>
                                                {/* Search input for unit members */}
                                                <TextInput
                                                        placeholder="Search member by name/phone"
                                                        value={memberSearch}
                                                        onChangeText={setMemberSearch}
                                                        style={styles.input}
                                                />

                                                {/* Members list */}
                                                <View style={{ maxHeight: 200, borderWidth: 1, borderColor: '#eee', borderRadius: 8, marginBottom: 12 }}>
                                                    <FlatList
                                                        data={members.filter(m =>
                                                            (m.name || `${m.firstName||''} ${m.surname||''}`).toLowerCase().includes(memberSearch.toLowerCase()) ||
                                                            (m.phone||'').includes(memberSearch)
                                                        )}
                                                        keyExtractor={(item) => item._id}
                                                        ListEmptyComponent={() => (
                                                            <View style={{ padding: 12 }}>
                                                                <Text style={{ color: '#666' }}>{membersLoading ? 'Loading members…' : 'No members found'}</Text>
                                                            </View>
                                                        )}
                                                        renderItem={({ item }) => {
                                                            const label = item.name || `${item.firstName||''} ${item.surname||''}`.trim();
                                                            const selected = selectedMemberId === item._id;
                                                            return (
                                                                <TouchableOpacity
                                                                    onPress={() => { setSelectedMemberId(item._id); setSelectedName(label); }}
                                                                    style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f2f2f2' }}
                                                                >
                                                                    <View style={{ flex:1, paddingRight: 8 }}>
                                                                        <Text style={{ fontWeight:'600', color:'#333' }}>{label}</Text>
                                                                        {!!item.phone && <Text style={{ color:'#666', fontSize:12 }}>{item.phone}</Text>}
                                                                    </View>
                                                                    <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={selected ? '#2aa7d8' : '#bbb'} />
                                                                </TouchableOpacity>
                                                            );
                                                        }}
                                                    />
                                                </View>

                        <Text style={styles.modalLabel}>Marriage Date</Text>
                        <TextInput
                            placeholder="YYYY-MM-DD"
                            value={marriageDate}
                            onChangeText={setMarriageDate}
                            style={styles.input}
                        />

                        <Text style={styles.modalLabel}>Additional Note (optional)</Text>
                        <TextInput
                            value={note}
                            onChangeText={setNote}
                            style={[styles.input, { height: 60 }]}
                            multiline
                        />

                                                <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
                            <Text style={styles.submitText}>{submitting? (editing? 'Updating...' : 'Submitting...') : (editing? 'Update' : 'Submit')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
            )}

            {/* Year Picker Modal */}
            <Modal visible={yearPickerVisible} transparent animationType="fade" onRequestClose={() => setYearPickerVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalBox, { maxHeight: 320 }]}> 
                        <Text style={[styles.modalLabel, { marginBottom: 8 }]}>Select Year</Text>
                        <FlatList
                            data={years}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f2f2f2' }}
                                    onPress={() => { setYear(item); setYearPickerVisible(false); }}
                                >
                                    <Text style={{ fontSize: 16, color: item === year ? '#2aa7d8' : '#333', fontWeight: item === year ? '700' as any : '500' }}>{item === 'All' ? 'All Years' : item}</Text>
                                </TouchableOpacity>
                            )}
                        />
                        <TouchableOpacity style={[styles.submitBtn, { marginTop: 12, backgroundColor: '#999' }]} onPress={() => setYearPickerVisible(false)}>
                            <Text style={styles.submitText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
        paddingTop: heightPercentageToDP(3),
        paddingBottom: 10,
    backgroundColor: 'white',
  },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#333' },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  reportTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  reportType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
    row: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
    iconBox: {
        width: 28,
        height: 28,
        borderRadius: 6,
        backgroundColor: "#f2f2f2",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 8,
    },
    title: { fontSize: 16, fontWeight: "600" },

    yearBox: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 6,
        padding: 6,
        alignSelf: "flex-end",
        marginTop: 10,
        marginBottom: 12,
    },

    searchRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
    search: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        padding: 8,
    },
    addBtn: {
        backgroundColor: "#2aa7d8",
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 8,
        marginLeft: 8,
    },
    addBtnText: { color: "#fff", fontWeight: "600" },

    count: { fontSize: 14, marginTop: 10 },
    countNumber: { fontSize: 20, fontWeight: "700", color: "#2aa7d8", marginBottom: 8 },

    filterBtn: {
        alignSelf: "flex-start",
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 6,
        padding: 8,
        marginBottom: 10,
    },
    filterText: { fontSize: 14 },

    card: {
        borderWidth: 1,
        borderColor: "#e6eef2",
        borderRadius: 8,
        padding: 12,
        marginTop: 10,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
    },
    name: { fontSize: 16, fontWeight: "600", color: "#2aa7d8" },
    date: { fontSize: 12, color: "#666", marginTop: 4 },
    note: { fontSize: 14, marginTop: 6 },

    // Modal styles
    modalOverlay: {
        flex: 1,
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.2)",
        padding: 20,
    },
    modalBox: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 20,
        borderWidth: 1,
        borderColor: '#eef2f5',
    },
    modalLabel: { fontSize: 14, fontWeight: "500", marginBottom: 6 },
    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        padding: 8,
        marginBottom: 12,
    },
    submitBtn: {
        backgroundColor: "#2aa7d8",
        padding: 12,
        borderRadius: 8,
        alignItems: "center",
    },
    submitText: { color: "#fff", fontWeight: "700" },
    smallBtn: {
        backgroundColor: '#2aa7d8',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
    },
    smallBtnText: { color:'#fff', fontWeight:'600' },
});
