import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Dimensions,
} from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { IconSpec } from "./ReportScreen";
import { RenderIcon } from "./RenderIcon";
import { FlashList, ListRenderItem } from "@shopify/flash-list";
import { MaterialIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import moment from "moment";
import Modal from "react-native-modal";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { PRIMARY_BLUE } from "../../AuthScreens/SuperAdmin/styles";
import AddNewSoul from "./AddNewSoul";
import AddSoulModal from './AddSoulModalSCreen';
import ModernLoader from '../../../loader/load';


const { height } = Dimensions.get("window");

type ConvertType = {
  name: string;
  gender: string;
  phone: string;
  age: string;
  through: string;
  location: string;
  date: string;
};

type RecruitType = {
  id: string;
  title: string;
  date: string;
  description: string;
};

const dataCon: RecruitType[] = [
  { id: "1", title: "Recruited 5 new vocalists", date: "25-06-2025", description: "5 New Recruits Joined" },
  { id: "2", title: "Recruited 3 new ushers", date: "28-06-2025", description: "3 New Recruits Joined" },
];

const convertsData: ConvertType[] = [
  {
    name: "Emeka Okoro",
    gender: "Male",
    phone: "08040356328",
    age: "21 - 30",
    through: "Evangelism",
    location: "Aba",
    date: "June 30, 2025",
  },
  {
    name: "Angela Chukwu",
    gender: "Female",
    phone: "08040356328",
    age: "16 - 20",
    through: "Evangelism",
    location: "Aba",
    date: "June 30, 2025",
  },
];

type RootStackParamList = {
  SoulsWon: undefined;
  AddNewSoul: undefined;
  AddSoulModal: { visible: boolean,onClose: () => void};

};

type InformationType = {
  title: string;
  buttonTitle?: string;
  icon: IconSpec;
  data: {
    name: string;
    role: string;
  };
  year: number;
};

type MemberInvitedNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "SoulsWon"
>;

type Props = {
  navigation: MemberInvitedNavigationProp;
};

const MemberInvited: React.FC<Props> = ({ navigation }) => {
  const [unitDetail, setUnitDetail] = useState<InformationType>({
    title: "",
    buttonTitle: "",
    icon: { library: "Ionicons", name: "flame" },
    data: { name: "", role: "" },
    year: 2025,
  });
  const [year, setYear] = useState<number>(2025);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const information = await AsyncStorage.getItem("addtask");
        if (information) {
          const data: InformationType = JSON.parse(information);
          setUnitDetail(data);
        }
      } catch (error) {
        console.error("Error reading from AsyncStorage", error);
      } finally {
        setTimeout(() => setLoading(false), 1000);
      }
    };
    fetchData();
  }, []);

  //date picker functions
  const [dateTime, setDateTime] = useState("");
  const [isPickerVisible, setPickerVisible] = useState(false);
  const showPicker = () => setPickerVisible(true);
  const hidePicker = () => setPickerVisible(false);
  const handleConfirm = (date: Date) => {
    const formatted = moment(date).format("MM-DD-YYYY");
    setDateTime(formatted);

    hidePicker();
  };

  const renderItemTwo = ({ item }: { item: RecruitType }) => (
    <View style={styled.card}>
      <View style={styled.headerRow}>
        <Text style={styled.title}>{item.title}</Text>
        <View style={styled.iconRow}>
          <TouchableOpacity>
            <MaterialIcons name="delete" size={24} color="red" />
          </TouchableOpacity>
          <TouchableOpacity>
            <MaterialIcons name="edit" size={24} color="#349DC5" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styled.date}>{item.date}</Text>
      <Text style={styled.description}>{item.description}</Text>
    </View>
  );

  const renderItem: ListRenderItem<ConvertType> = ({ item }) => (
    <View style={styles.convertCard}>
      <View style={styles.convertHeader}>
        <Text style={styles.convertName}>{item.name}</Text>
      </View>
      <View style={styles.convertDetails}>
        {[
          ["Gender", item.gender],
          ["Phone Number", item.phone],
          ["Age", item.age],
          ["Converted Through", item.through],
          ["Location", item.location],
          ["Date", item.date],
        ].map(([label, value], idx) => (
          <View style={styles.detailRow} key={idx}>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={styles.detailValue}>{value}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const [visible, setVisible] = useState(false);

  const handleAddNewSoul = () => {
    if (unitDetail.title === "Achievements") {
      setModalVisible(true);
    } else {
      // navigation.navigate("AddNewSoul");
      setVisible(true);
      // trying to bring in the addnewmodel
    }

  };

  const closeModal = () => setModalVisible(false);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ModernLoader fullscreen={false} spinnerSize={60} ringWidth={6} logoSize={34} />
        <Text style={{ marginTop: 12, color: '#349DC5', fontWeight:'600' }}>Loading invited data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reports</Text>
      </View>

      {/* Report Header */}
      <View style={styles.reportHeader}>
        <View style={styles.reportTypeContainer}>
          <RenderIcon spec={unitDetail?.icon} />
          <Text style={styles.reportType}>
            {unitDetail?.title || ""} ({year})
          </Text>
        </View>
        <TouchableOpacity style={styles.yearSelector}>
          <Text style={styles.yearText}>{year}</Text>
          <Ionicons name="chevron-down" size={16} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput style={styles.searchInput} placeholder="Search by name" placeholderTextColor="#999" />
        <TouchableOpacity style={styles.searchButton}>
          <Ionicons name="search" size={20} color="#999" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsHeader}>
        <Text style={styles.soulsWonText}>
          Souls Won: <Text style={styles.soulsCount}>10</Text>
        </Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddNewSoul}>
          <Ionicons name="add" size={20} color="white" />
          <Text style={styles.addButtonText}>Add New</Text>
        </TouchableOpacity>
      </View>

      {/* Filter */}
      <View style={styles.filterSection}>
        <Text style={styles.convertsTitle}>Details</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Text style={styles.filterText}>Filter by Date</Text>
          <Ionicons name="calendar" size={16} color="#349DC5" />
        </TouchableOpacity>
      </View>

      {/* FlashList */}
      {unitDetail.title === "Achievements" ? (
        <FlashList<RecruitType> data={dataCon} renderItem={renderItemTwo} keyExtractor={(item) => item.id} />
      ) : (
        <FlashList<ConvertType>
          data={convertsData}
          renderItem={renderItem}
          keyExtractor={(_, index) => index.toString()}
        />
      )}
      <AddSoulModal visible={visible} onClose={()=>setVisible(false)} />

      {/* Modal */}
      <Modal
        isVisible={modalVisible}
        onBackdropPress={closeModal}
        style={{ justifyContent: "flex-end", margin: 0 }}
        swipeDirection={["down"]}
        onSwipeComplete={closeModal}
      >
        <View style={bsStyles.container}>
          <Text style={bsStyles.header}>Add New Achievement</Text>
          <TextInput style={bsStyles.input} placeholder="Title" placeholderTextColor="#999" />
          <TouchableOpacity onPress={showPicker}>
            <View pointerEvents="none" style={[bsStyles.input, { flexDirection: "row", alignItems: "center", gap: 10 }]}>
              <FontAwesome5 name="calendar-alt" size={30} color={PRIMARY_BLUE} />

              <TextInput
                value={dateTime}
                placeholder="Select date "
                editable={false}
              />
            </View>
          </TouchableOpacity>
          <DateTimePickerModal
            isVisible={isPickerVisible}
            mode="date"
            onConfirm={handleConfirm}
            onCancel={hidePicker}
            accentColor={PRIMARY_BLUE}
          />
          <TextInput
            style={[bsStyles.input, { paddingVertical: 30, textAlign: "left" }]}
            placeholder="Description"
            placeholderTextColor="#999"
            multiline
          />
          <TouchableOpacity style={bsStyles.button} onPress={closeModal}>
            <Text style={bsStyles.buttonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const bsStyles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.9,
  },
  header: { fontSize: 18, fontWeight: "bold", marginBottom: 20 },
  input: {
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 13,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginBottom: 15,
  },
  button: {
    backgroundColor: "#349DC5",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { color: "white", fontWeight: "600" },
});




const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "white" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: "600", color: "#333" },
  reportHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 20 },
  reportTypeContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#f8f8f8", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  reportType: { fontSize: 16, fontWeight: "600", color: "#333", marginLeft: 8 },
  yearSelector: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  yearText: { fontSize: 14, color: "#333", marginRight: 5 },
  searchContainer: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, marginBottom: 20 },
  searchInput: { flex: 1, backgroundColor: "#f8f8f8", borderRadius: 8, paddingHorizontal: 15, paddingVertical: 12, fontSize: 14, color: "#333", borderWidth: 1, borderColor: "#e0e0e0" },
  searchButton: { marginLeft: 10, padding: 10 },
  statsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 20 },
  soulsWonText: { fontSize: 16, color: "#333" },
  soulsCount: { fontWeight: "bold", fontSize: 18 },
  addButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#349DC5", paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 },
  addButtonText: { color: "white", fontSize: 14, fontWeight: "500", marginLeft: 5 },
  filterSection: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 20 },
  convertsTitle: { fontSize: 16, fontWeight: "600", color: "#333" },
  filterButton: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#349DC5", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  filterText: { color: "#349DC5", fontSize: 14, marginRight: 5 },
  convertCard: { backgroundColor: "#f8f8f8", borderRadius: 12, padding: 15, marginBottom: 15, marginHorizontal: 10, borderWidth: 1, borderColor: "#e0e0e0" },
  convertHeader: { marginBottom: 10 },
  convertName: { fontSize: 16, fontWeight: "600", color: "#349DC5" },
  convertDetails: { gap: 8 },
  detailRow: { flexDirection: "row", justifyContent: "space-between" },
  detailLabel: { fontSize: 14, color: "#666" },
  detailValue: { fontSize: 14, color: "#333", fontWeight: "500" },
});

const styled = StyleSheet.create({
  card: { backgroundColor: "#fff", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: "#349DC5", marginBottom: 12, marginHorizontal: 12 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  title: { color: "#349DC5", fontWeight: "600", fontSize: 15, flexShrink: 1 },
  iconRow: { flexDirection: "row", alignItems: "center" },
  date: { fontSize: 14, color: "#444", marginTop: 6 },
  description: { fontSize: 14, color: "#444", marginTop: 2 },
});

export default MemberInvited;
