import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '@theme/colors';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SalesStackParamList } from '../types';
import PrimaryButton from '@components/PrimaryButton';

type Props = NativeStackScreenProps<SalesStackParamList, 'SalesHome'>;

export default function SalesHome({ navigation }: Props) {
  // --- State ---
  const [yearModalVisible, setYearModalVisible] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(2025);

  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Year options (dynamic range)
  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  const handleYearSelect = (year: number) => {
    setSelectedYear(year);
    setYearModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Ionicons name="chevron-back" size={24} color="#000" />
        <Text style={styles.topBarTitle}>Emporium Sales</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Search Box */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={Colors.muted} style={{ marginRight: 6 }} />
          <TextInput
            placeholder="Search by Merchandise name"
            style={styles.searchInput}
            placeholderTextColor={Colors.muted}
          />
        </View>

        {/* Year Dropdown */}
        <TouchableOpacity style={styles.dropdown} onPress={() => setYearModalVisible(true)}>
          <Text style={styles.dropdownText}>{selectedYear}</Text>
          <Ionicons name="chevron-down" size={16} color={Colors.text} />
        </TouchableOpacity>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statTitle}>Total Sales for {selectedYear}:</Text>
            <Text style={styles.statValue}>₦1,000,000</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statTitle}>Net Profit for {selectedYear}</Text>
            <Text style={styles.statValue}>₦500,000</Text>
          </View>
        </View>

        {/* Record Button */}
        <PrimaryButton
          title="Record Merchandise Sales"
          onPress={() => navigation.navigate('RecordEmpty')}
          style={{ marginVertical: 16 }}
        />

        {/* Sales Table */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Total sales of each merchandise for the year</Text>

          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 1.4 }]}>Item Name</Text>
            <Text style={styles.th}>Qty Received</Text>
            <Text style={styles.th}>Qty Sold</Text>
            <Text style={styles.th}>Cost Price</Text>
            <Text style={styles.th}>Selling Price</Text>
            <Text style={styles.th}>Profit</Text>
          </View>

          {/* Example Rows */}
          <View style={styles.tableRow}>
            <View style={{ flex: 1.4 }}>
              <Text style={styles.itemTitle}>Communion</Text>
              <Text style={styles.itemSub}>250ml (Small)</Text>
            </View>
            <Text style={styles.td}>50</Text>
            <Text style={styles.td}>30</Text>
            <Text style={styles.td}>₦100</Text>
            <Text style={styles.td}>₦150</Text>
            <Text style={styles.td}>₦1500</Text>
          </View>
          <View style={styles.tableRow}>
            <View style={{ flex: 1.4 }}>
              <Text style={styles.itemTitle}>Cloths</Text>
              <Text style={styles.itemSub}>2000ml (Small)</Text>
            </View>
            <Text style={styles.td}>70</Text>
            <Text style={styles.td}>90</Text>
            <Text style={styles.td}>₦1000</Text>
            <Text style={styles.td}>₦150</Text>
            <Text style={styles.td}>₦1500</Text>
          </View>

          <TouchableOpacity>
            <Text style={styles.viewMore}>View More</Text>
          </TouchableOpacity>
        </View>

        {/* Sales Summary by Date */}
        <Text style={styles.salesSummaryTitle}>Sales Summary list by date</Text>

        {/* Date Picker Button */}
        <TouchableOpacity style={styles.datePicker} onPress={() => setShowDatePicker(true)}>
          <Ionicons name="calendar-outline" size={18} color={Colors.text} />
          <Text style={styles.datePickerText}>
            {date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </Text>
        </TouchableOpacity>

        {/* Summary Cards */}
        {[1, 2].map((i) => (
          <View key={i} style={styles.summaryCard}>
            <Text style={styles.summaryDate}>Date: May 12, 2025</Text>
            <Text style={styles.summaryText}>Total Revenue (₦) <Text style={styles.summaryValue}>₦500,000</Text></Text>
            <Text style={styles.summaryText}>Total Profit (₦) <Text style={styles.summaryValue}>₦100,000</Text></Text>
            <PrimaryButton title="View Details" onPress={() => navigation.navigate('ViewDetails')} style={{ marginTop: 10 }} />
          </View>
        ))}
      </ScrollView>

      {/* Year Picker Modal */}
      <Modal visible={yearModalVisible} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 8, padding: 20, width: 250 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 10 }}>Select Year</Text>
            <FlatList
              data={years}
              keyExtractor={(item) => item.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => handleYearSelect(item)} style={{ paddingVertical: 10 }}>
                  <Text style={{ fontSize: 14, color: item === selectedYear ? Colors.primary : Colors.text }}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <PrimaryButton title="Close" onPress={() => setYearModalVisible(false)} style={{ marginTop: 10 }} />
          </View>
        </View>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) setDate(selectedDate);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background ,paddingTop:10},
  scrollContent: { padding: 16 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, marginBottom: 12 },
  topBarTitle: { fontSize: 18, fontWeight: '600', color: Colors.text },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text },
  dropdown: { alignSelf: 'flex-end', marginTop: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  dropdownText: { fontSize: 14, marginRight: 6 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 8, padding: 12, marginHorizontal: 4, elevation: 1 },
  statTitle: { fontSize: 13, color: Colors.muted, marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: '700', color: Colors.text },
  card: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginTop: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: Colors.text },
  tableHeader: { flexDirection: 'row',borderBottomWidth: 1, borderBottomColor: Colors.border, paddingVertical: 10,  paddingBottom: 6 },
  th: { flex: 1, fontSize: 10, fontWeight: 'bold', color: '#000', textAlign: 'center' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.border, paddingVertical: 10, alignItems: 'center' },
  td: { flex: 1, fontSize: 12, color: Colors.text, textAlign: 'center' },
  itemTitle: { fontSize: 12, fontWeight: '600', color: Colors.text },
  itemSub: { fontSize: 11, color: Colors.muted },
  viewMore: { color: Colors.primary, fontSize: 13, fontWeight: '500', marginTop: 8, alignSelf: 'flex-end' },
  salesSummaryTitle: { fontSize: 14, fontWeight: '600', marginTop: 20, marginBottom: 8 },
  datePicker: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start', marginBottom: 12 },
  datePickerText: { marginLeft: 8, fontSize: 14, color: Colors.text },
  summaryCard: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 12 },
  summaryDate: { fontSize: 13, color: Colors.text, marginBottom: 6 },
  summaryText: { fontSize: 13, color: Colors.text, marginBottom: 4 },
  summaryValue: { fontWeight: '600', color: Colors.text },
});
