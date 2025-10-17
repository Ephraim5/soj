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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createEvent, listEvents, EventDoc } from "../../../api/events";

// --- Mock JSON data ---
type Event = {
    id: string;
    title: string;
    date: string;
    time: string;
    location: string;
    description: string;
    url?: string;
};

const initialData: Event[] = [];

function getOrdinal(n: number): string {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function InviteAndPart({navigation}:any) {
    const [token, setToken] = useState<string|undefined>();
    const [year, setYear] = useState<string>(new Date().getFullYear().toString());
    const [query, setQuery] = useState("");
    const [data, setData] = useState<Event[]>(initialData);
    const [modalVisible, setModalVisible] = useState(false);

    // Modal states
    const [eventTitle, setEventTitle] = useState("");
    const [eventDate, setEventDate] = useState("");
    const [eventTime, setEventTime] = useState("");
    const [eventLocation, setEventLocation] = useState("");
    const [eventDescription, setEventDescription] = useState("");
    const [eventUrl, setEventUrl] = useState("");

    useEffect(()=>{
        (async()=>{
            try {
                const t1 = await AsyncStorage.getItem('token');
                const t2 = t1 ? null : await AsyncStorage.getItem('auth_token');
                const tk = (t1 || (t2 as any)) || undefined;
                setToken(tk);
                if(tk){
                    const res = await listEvents(tk);
                    const mapped: Event[] = (res.events||[]).map((e: EventDoc)=> ({
                        id: e._id,
                        title: e.title,
                        date: e.date ? String(e.date).slice(0,10) : '',
                        time: '',
                        location: e.venue || '',
                        description: e.description || '',
                        url: ''
                    }));
                    setData(mapped);
                }
            } catch(e){}
        })();
    },[]);

    const filtered = useMemo(() => {
        const list = data.filter(
            (e) =>
                (year === 'All' || e.date.startsWith(year)) &&
                e.title.toLowerCase().includes(query.toLowerCase())
        );
        return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [data, year, query]);

    const years = useMemo(() => {
        const current = new Date().getFullYear();
        const start = 2014;
        const arr: string[] = ['All'];
        for (let y = current; y >= start; y--) arr.push(String(y));
        return arr;
    }, []);

    const [yearPickerVisible, setYearPickerVisible] = useState(false);

    const handleAdd = async () => {
        if (!token) return;
        if (!eventTitle || !eventDate) return;
        try {
            const res = await createEvent({ title: eventTitle, venue: eventLocation, description: eventDescription, date: eventDate }, token);
            if(res?.ok && res.event){
                const e = res.event;
                const newItem: Event = { id: e._id, title: e.title, date: e.date ? String(e.date).slice(0,10) : '', time: eventTime, location: e.venue || '', description: e.description || '', url: '' };
                setData((prev)=>[newItem, ...prev]);
                setModalVisible(false);
                setEventTitle(""); setEventDate(""); setEventTime(""); setEventLocation(""); setEventDescription(""); setEventUrl("");
            }
        } catch(e){}
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
                    <Ionicons name="globe" size={30} color={PRIMARY_BLUE} />
                </View>
                <Text style={styles.title}>External Invitations & Partnerships</Text>
            </View>

            {/* Year Dropdown */}
            <TouchableOpacity style={styles.yearBox} onPress={() => setYearPickerVisible(true)}>
                <Text>{year === 'All' ? 'All Years' : year} ▼</Text>
            </TouchableOpacity>

            {/* Search & Add */}
            <View style={styles.searchRow}>
                <TextInput
                    placeholder="Search by name"
                    value={query}
                    onChangeText={setQuery}
                    style={styles.search}
                />
                <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
                    <Text style={styles.addBtnText}>Add New</Text>
                </TouchableOpacity>
            </View>

            {/* Section Header */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Latest Event</Text>
                <TouchableOpacity>
                    <Text style={styles.seeAll}>See All</Text>
                </TouchableOpacity>
            </View>

            {/* List */}
            <FlatList
                data={filtered}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                    const date = new Date(item.date);
                    const day = date.getDate();
                    const month = date.toLocaleString("en-GB", { month: "long" });
                    const year = date.getFullYear();
                    const formattedDate = `${getOrdinal(day)} ${month}, ${year}`;

                    return (
                        <View style={styles.eventCard}>
                            <Text style={styles.label}>Title</Text>
                            <Text style={styles.eventTitle}>{item.title}</Text>
                            <Text style={styles.label}>Date</Text>
                            <Text style={styles.eventDate}>{formattedDate}</Text>
                            <Text style={styles.label}>Time</Text>
                            <Text style={styles.eventTime}>{item.time}</Text>
                            <Text style={styles.label}>Location</Text>
                            <Text style={styles.eventLocation}>{item.location}</Text>
                            <Text style={styles.label}>Description</Text>
                            <Text style={styles.eventDescription}>{item.description}</Text>
                        </View>
                    );
                }}
            />

            {/* Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <View style={styles.modalClose}>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Text style={styles.closeX}>X</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalLabel}>Event Title</Text>
                        <TextInput
                            placeholder="Enter title"
                            value={eventTitle}
                            onChangeText={setEventTitle}
                            style={styles.input}
                        />

                        <Text style={styles.modalLabel}>Date</Text>
                        <TextInput
                            placeholder=""
                            value={eventDate}
                            onChangeText={setEventDate}
                            style={styles.input}
                        />

                        <Text style={styles.modalLabel}>Time</Text>
                        <TextInput
                            placeholder="e.g. 2:00 PM"
                            value={eventTime}
                            onChangeText={setEventTime}
                            style={styles.input}
                        />

                        <Text style={styles.modalLabel}>Location</Text>
                        <TextInput
                            placeholder="Enter location"
                            value={eventLocation}
                            onChangeText={setEventLocation}
                            style={styles.input}
                        />

                        <Text style={styles.modalLabel}>Brief Description</Text>
                        <TextInput
                            value={eventDescription}
                            onChangeText={setEventDescription}
                            style={[styles.input, { height: 60 }]}
                            multiline
                            placeholder="Type description.."
                        />

                        <Text style={styles.modalLabel}>URL [Optional]</Text>
                        <TextInput
                            placeholder="Enter URL"
                            value={eventUrl}
                            onChangeText={setEventUrl}
                            style={styles.input}
                        />

                        <TouchableOpacity style={styles.submitBtn} onPress={handleAdd}>
                            <Text style={styles.submitText}>Submit</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

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
        paddingTop: heightPercentageToDP(5),
        paddingBottom: 20,
        backgroundColor: 'white',
    },
    backButton: { marginRight: 15 },
    headerTitle: { fontSize: 20, fontWeight: '600', color: '#333' },
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

    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    sectionTitle: { fontSize: 14, fontWeight: "600" },
    seeAll: { fontSize: 14, color: "#2aa7d8" },

    eventCard: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        padding: 12,
        marginTop: 10,
        backgroundColor: "#fff",
    },
    label: {
        fontSize: 12,
        color: "#666",
        marginBottom: 2,
    },
    eventTitle: { fontSize: 16, fontWeight: "600", color: "#2aa7d8", marginBottom: 8 },
    eventDate: { fontSize: 14, color: "#333", marginBottom: 8 },
    eventTime: { fontSize: 14, color: "#333", marginBottom: 8 },
    eventLocation: { fontSize: 14, color: "#333", marginBottom: 8 },
    eventDescription: { fontSize: 14, color: "#333" },

    // Modal styles
    modalOverlay: {
        flex: 1,
        justifyContent: "center",
        backgroundColor: "rgba(183, 223, 220, 0.2)",
        padding: 20,
    },
    modalBox: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 20,
    },
    modalClose: {
        alignItems: "flex-end",
        marginBottom: 10,
    },
    closeX: { fontSize: 18, fontWeight: "bold", color: "#333" },
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
});