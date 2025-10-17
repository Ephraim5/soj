import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

type Student = {
  id: string;
  fullName: string;
  gender: string;
  phone: string;
  maritalStatus: string;
  dateJoined: string; // ex: "June 15, 2025"
};

const optionsMap: { [key: string]: string[] } = {
  gender: ["All", "Male", "Female"],
  year: [
    "Year",
    "2014","2015","2016","2017","2018","2019","2020","2021","2022","2023","2024",
    "2025","2026","2027","2028","2029","2030","2031","2032","2033","2034","2035",
  ],
  month: [
    "Month",
    "January","February","March","April","May","June","July",
    "August","September","October","November","December",
  ],
};

const GraduatedStudentsList: React.FC = () => {
  const navigation = useNavigation();

  const [search, setSearch] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [currentOptions, setCurrentOptions] = useState<string[]>([]);
  const [currentKey, setCurrentKey] = useState<string>("");

  // Defaults set to "All" so the list shows everything initially.
  // If you want the previous behavior (e.g., default to "Male" and "2025"),
  // change these initial values.
  const [selectedGender, setSelectedGender] = useState<string>("All");
  const [selectedYear, setSelectedYear] = useState<string>("Year");
  const [selectedMonth, setSelectedMonth] = useState<string>("Month");

  const openPicker = (key: string) => {
    setCurrentKey(key);
    setCurrentOptions(optionsMap[key]);
    setShowPicker(true);
  };

  const selectOption = (item: string) => {
    if (currentKey === "gender") setSelectedGender(item);
    else if (currentKey === "year") setSelectedYear(item);
    else if (currentKey === "month") setSelectedMonth(item);
    setShowPicker(false);
  };

  const students: Student[] = [
    {
      id: "1",
      fullName: "Emeka Okoro",
      gender: "Male",
      phone: "08086484940",
      maritalStatus: "Single",
      dateJoined: "June 15, 2025",
    },
    {
      id: "2",
      fullName: "Favour Okoro",
      gender: "Male",
      phone: "08086484941",
      maritalStatus: "Single",
      dateJoined: "June 15, 2025",
    },
    {
      id: "3",
      fullName: "Emeka John",
      gender: "Female",
      phone: "08086884940",
      maritalStatus: "Married",
      dateJoined: "June 15, 2024",
    },
    {
      id: "4",
      fullName: "Emeka Marry",
      gender: "Female",
      phone: "08086884950",
      maritalStatus: "Married",
      dateJoined: "June 15, 2022",
    },
    {
      id: "5",
      fullName: "Paul Marry",
      gender: "Male",
      phone: "08086884950",
      maritalStatus: "Married",
      dateJoined: "June 15, 2022",
    },
  ];

  // Filtering logic:
  // - If search text provided, match either name (case-insensitive) OR phone digits
  // - Apply gender/year/month filters only when they're not "All"
  const filteredStudents = useMemo(() => {
    const searchTrim = search.trim().toLowerCase();
    const searchDigits = search.replace(/\D/g, "");

    return students.filter((stu) => {
      // Search (name or phone)
      if (searchTrim.length > 0) {
        const matchesName = stu.fullName.toLowerCase().includes(searchTrim);
        const phoneDigits = stu.phone.replace(/\D/g, "");
        const matchesPhone =
          searchDigits.length > 0 && phoneDigits.includes(searchDigits);
        if (!matchesName && !matchesPhone) return false;
      }

      // Gender filter
      if (selectedGender && selectedGender !== "All") {
        if (stu.gender !== selectedGender) return false;
      }

      // Year filter (we check if dateJoined includes the year substring)
      if (selectedYear && selectedYear !== "Year" && selectedYear !== "All") {
        if (!stu.dateJoined.includes(selectedYear)) return false;
      }

      // Month filter (check if dateJoined includes the month name)
      if (selectedMonth && selectedMonth !== "All" && selectedMonth !== "Month") {
        if (!stu.dateJoined.includes(selectedMonth)) return false;
      }

      return true;
    });
  }, [students, search, selectedGender, selectedYear, selectedMonth]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Student Directory</Text>
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by Name or Phone"
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
            keyboardType="default"
          />
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        </View>

        {/* Filters */}
        <View style={styles.filtersRow}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => openPicker("gender")}
          >
            <Text style={styles.filterText}>{selectedGender}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => openPicker("year")}
          >
            <Text style={styles.filterText}>{selectedYear}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => openPicker("month")}
          >
            <Text style={styles.filterText}>{selectedMonth}</Text>
          </TouchableOpacity>
        </View>

        {/* Student List */}
        {filteredStudents.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No students found</Text>
          </View>
        ) : (
          <FlatList
            data={filteredStudents}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.name}>{item.fullName}</Text>

                <Text style={styles.Coninfo}>
                  Gender: <Text style={styles.info}>{item.gender}</Text>
                </Text>
                <Text style={styles.Coninfo}>
                  Phone Number: <Text style={styles.info}>{item.phone}</Text>
                </Text>
                <Text style={styles.Coninfo}>
                  Marital Status: <Text style={styles.info}>{item.maritalStatus}</Text>
                </Text>
                <Text style={styles.Coninfo}>
                  Date Joined: <Text style={styles.info}>{item.dateJoined}</Text>
                </Text>
              </View>
            )}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Picker Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={showPicker}
          onRequestClose={() => setShowPicker(false)}
        >
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerContent}>
              <FlatList
                data={currentOptions}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.optionItem}
                    onPress={() => selectOption(item)}
                  >
                    <Text style={styles.optionText}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowPicker(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

export default GraduatedStudentsList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginLeft: 12,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f1f1",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 15,
    color: "#333",
  },
  searchIcon: {
    marginLeft: 8,
  },
  filtersRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  filterButton: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    padding: 8,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 4,
    borderColor: "#c7c4c4",
    borderWidth: 1,
  },
  filterText: {
    color: "#333",
    fontWeight: "500",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#f9f9f9",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#349DC5",
    marginBottom: 6,
  },
  info: {
    fontSize: 14,
    color: "#333",
    marginBottom: 2,
    fontWeight: "400",
  },
  Coninfo: {
    fontSize: 14,
    color: "#333",
    marginBottom: 2,
    fontWeight: "700",
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  pickerContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    width: "80%",
    maxHeight: "60%",
  },
  optionItem: {
    paddingVertical: 12,
  },
  optionText: {
    fontSize: 16,
    color: "#333",
  },
  cancelButton: {
    marginTop: 12,
    backgroundColor: "#349DC5",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelText: {
    color: "#fff",
    fontWeight: "600",
  },
  emptyBox: {
    marginTop: 24,
    alignItems: "center",
  },
  emptyText: {
    color: "#999",
    fontSize: 16,
  },
});
