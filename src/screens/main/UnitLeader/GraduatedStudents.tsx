import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";

// Define your stack screens
type RootStackParamList = {
  GraduatedStudents: undefined;
  GraduatedStudentsList: undefined;
};

// Navigation type for this screen
type GraduatedStudentsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "GraduatedStudents"
>;

const optionsMap: { [key: string]: string[] } = {
  year: [
    "2014","2015","2016","2017","2018","2019","2020","2021","2022","2023","2024",
    "2025","2026","2027","2028","2029","2030","2031","2032","2033","2034","2035",
  ],
};

const GraduatedStudents = () => {
  const navigation = useNavigation<GraduatedStudentsScreenNavigationProp>();

  const [selectedYear, setSelectedYear] = useState("2025");
  const [showPicker, setShowPicker] = useState(false);
  const [currentOptions, setCurrentOptions] = useState<string[]>([]);
  const [currentKey, setCurrentKey] = useState("");

  const openPicker = (key: string) => {
    setCurrentKey(key);
    setCurrentOptions(optionsMap[key]);
    setShowPicker(true);
  };

  const selectOption = (item: string) => {
    if (currentKey === "year") setSelectedYear(item);
    setShowPicker(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.container}>
        {/* Header with Back + Title and Year selector */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Graduated Students</Text>
          </View>

          <TouchableOpacity
            onPress={() => openPicker("year")}
            style={styles.yearButton}
            activeOpacity={0.8}
          >
            <Text style={styles.yearButtonText}>{selectedYear}</Text>
            <Ionicons name="chevron-down" size={18} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Card */}
        <View style={styles.card}>
           
          <Text style={styles.cardTitle}> <FontAwesome5 name="user-graduate" size={30} color="#8c48f9" />    Graduated Students</Text>
          <Text style={styles.infoText}>Total Graduated in {selectedYear}</Text>
          <Text style={styles.count}>12</Text>
          <Text style={styles.infoText}>Latest Graduation Ceremony</Text>
          <Text style={styles.date}>May 25, 2025</Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate("GraduatedStudentsList")}
          >
            <Text style={styles.buttonText}>View Graduated students</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.secondaryButton}>
          <Text style={styles.buttonText}>Update Graduation Ceremony Date</Text>
        </TouchableOpacity>
      </View>

      {/* Year Picker Modal */}
      <Modal
        animationType="fade"
        transparent
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
    </SafeAreaView>
  );
};

export default GraduatedStudents;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#eeededff",
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  /* Header */
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    paddingRight: 6,
    paddingVertical: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginLeft: 6,
  },
  yearButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DDD",
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  yearButtonText: {
    color: "#333",
    fontWeight: "600",
    marginRight: 6,
  },

  /* Card */
  card: {
    backgroundColor: "#f9f9f9",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: "#999",
  },
  count: {
    fontSize: 20,
    fontWeight: "700",
    color: "#349DC5",
    marginVertical: 4,
  },
  date: {
    fontSize: 14,
    fontWeight: "600",
    color: "#349DC5",
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: "#349DC5",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  secondaryButton: {
    backgroundColor: "#349DC5",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },

  /* Picker */
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
});
