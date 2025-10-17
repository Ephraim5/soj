import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  SafeAreaView,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { heightPercentageToDP } from "react-native-responsive-screen";
import Icon from 'react-native-vector-icons/Ionicons';
import { PRIMARY_BLUE } from "../../AuthScreens/SuperAdmin/styles";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { listTestimonies, submitTestimony, TestimonyDoc } from "../../../api/testimonies";
// Types
interface Testimony {
  id: string;
  name: string;
  phone: string;
  date: string;
  ageRange: string;
  description: string;
}

const initialTestimonies: Testimony[] = [];

export default function TestimoniesScreen({ navigation }: any) {
  const [token, setToken] = useState<string | undefined>();
  useEffect(()=>{ (async()=>{ try { const t1 = await AsyncStorage.getItem('token'); const t2 = t1 ? null : await AsyncStorage.getItem('auth_token'); setToken((t1 || (t2 as any)) || undefined); } catch{} })(); },[]);
  const [testimonies, setTestimonies] = useState<Testimony[]>(initialTestimonies);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [yearPickerVisible, setYearPickerVisible] = useState(false);
  const years = useMemo(() => {
    const current = new Date().getFullYear();
    const start = 2014;
    const arr: string[] = ['All'];
    for (let y = current; y >= start; y--) arr.push(String(y));
    return arr;
  }, []);
  useEffect(()=>{
    if(!token) return;
    (async()=>{
      try {
        const res = await listTestimonies(token);
        const mapped: Testimony[] = (res.testimonies||[]).map((t: TestimonyDoc)=> ({
          id: t._id,
          name: t.title || 'Testimony',
          phone: '',
          date: t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-GB',{ day:'2-digit', month:'long', year:'numeric' }) : '',
          ageRange: '',
          description: t.body || '',
        }));
        setTestimonies(mapped);
      } catch(e){}
    })();
  },[token]);


  const filteredTestimonies = testimonies.filter((t) =>
    t.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
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

        <Text style={styles.title}>Testimonies</Text>

      </View>
      {/* Year Dropdown */}
      <TouchableOpacity style={styles.yearBox} onPress={() => setYearPickerVisible(true)}>
        <Text>{year === 'All' ? 'All Years' : year} ▼</Text>
      </TouchableOpacity>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name"
          value={searchText}
          onChangeText={setSearchText}
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addButtonText}>Add Testimony</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.totalLabel}>Total Testimonies</Text>
      <Text style={styles.totalNumber}>{testimonies.length}</Text>

      <View style={styles.assistedHeaderRow}>
        <Text style={styles.assistedHeader}>Testimonies</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Text style={styles.filterButtonText}>Filter by Date</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredTestimonies}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isExpanded = expandedIds.includes(item.id);
          return (
            <View style={styles.testimonyCard}>
              <Text style={styles.testifierName}>
                {item.name} | {item.phone}
              </Text>
              <Text style={styles.testifierDate}>Date: {item.date}</Text>
              <Text style={styles.testifierAge}>Age Range: {item.ageRange}</Text>
              <Text style={styles.testifierSummary}>
                {isExpanded ? item.description : `${item.description.slice(0, 70)}...`}
              </Text>
              <TouchableOpacity onPress={() => toggleExpand(item.id)}>
                <Text style={styles.viewMoreText}>
                  {isExpanded ? "Show less" : "Show more"}
                </Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />

      <AddNewTestimonyModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={async (newTestimony) => {
          if(!token) return;
          try {
            const res = await submitTestimony({ title: newTestimony.name, body: newTestimony.description }, token);
            if(res?.ok && res?.testimony){
              setTestimonies((prev)=>[
                ...prev,
                {
                  id: res?.testimony?._id ?? "",
                  name: res?.testimony?.title ?? "_",
                  phone: '',
                  date: res?.testimony?.createdAt ? new Date(res?.testimony?.createdAt).toLocaleDateString('en-GB',{ day:'2-digit', month:'long', year:'numeric' }) : '',
                  ageRange: '',
                  description: res?.testimony?.body || ''
                }
              ]);
            }
          } catch(e){}
        }}
      />

      {/* Year Picker Modal */}
      <Modal visible={yearPickerVisible} transparent animationType="fade" onRequestClose={() => setYearPickerVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: 320 }]}> 
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Select Year</Text>
              <TouchableOpacity onPress={() => setYearPickerVisible(false)}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>
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
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function AddNewTestimonyModal({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (testimony: Testimony) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [ageRange, setAgeRange] = useState("");
  const [description, setDescription] = useState("");

  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  const handleSubmit = () => {
    const newItem: Testimony = {
      id: Date.now().toString(),
      name,
      phone,
      date: formatDate(date),
      ageRange,
      description,
    };
    onSubmit(newItem);
    onClose();
    setName("");
    setPhone("");
    setAgeRange("");
    setDescription("");
    setDate(new Date());
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalTitle}>Add New Testimony</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Testifier Name"
            value={name}
            onChangeText={setName}
          />

          <TextInput
            style={styles.input}
            placeholder="Phone"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.datePickerText}>{formatDate(date)}</Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) setDate(selectedDate);
              }}
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Age Range e.g. 21 - 30"
            value={ageRange}
            onChangeText={setAgeRange}
          />

          <TextInput
            style={[styles.input, { height: 80 }]}
            placeholder="Testimony Description"
            multiline
            value={description}
            onChangeText={setDescription}
          />

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Submit</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16, paddingTop: heightPercentageToDP(3), height: heightPercentageToDP(100) },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: heightPercentageToDP(5),
    paddingBottom: 20,
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
  yearText: { fontSize: 16 },
  searchRow: { flexDirection: "row", marginTop: 12 },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    paddingHorizontal: 10,
    height: 40,
  },
  addButton: {
    marginLeft: 8,
    backgroundColor: "#009ACD",
    paddingHorizontal: 16,
    borderRadius: 6,
    justifyContent: "center",
  },
  addButtonText: { color: "#fff", fontWeight: "500" },
  totalLabel: { marginTop: 20, fontSize: 16, color: "#555" },
  totalNumber: { fontSize: 20, fontWeight: "700" },
  assistedHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    alignItems: "center",
  },
  assistedHeader: { fontSize: 16, fontWeight: "600" },
  filterButton: {
    backgroundColor: "#F2F2F2",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  filterButtonText: { color: "#333" },
  testimonyCard: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  testifierName: { fontWeight: "600", fontSize: 16 },
  testifierDate: { color: "#777", marginTop: 4 },
  testifierAge: { color: "#777", marginTop: 2 },
  testifierSummary: { marginTop: 6, color: "#444" },
  viewMoreText: { color: "#009ACD", marginTop: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    width: "90%",
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: { fontSize: 16, fontWeight: "600" },
  closeText: { fontSize: 18 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    paddingHorizontal: 10,
    height: 40,
    marginTop: 12,
  },
  datePickerButton: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    paddingHorizontal: 10,
    height: 40,
    marginTop: 12,
    justifyContent: "center",
  },
  datePickerText: { color: "#333" },
  submitButton: {
    backgroundColor: "#009ACD",
    marginTop: 20,
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  submitButtonText: { color: "#fff", fontWeight: "600" },
});
