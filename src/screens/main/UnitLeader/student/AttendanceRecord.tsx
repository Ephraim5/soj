import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { CARD_BG, SCREEN_BG, MUTED_GRAY, PRIMARY_BLUE } from './colors';

const mockRecords = [
  { id: 'a1', studentId: 's1', label: 'Emeka Okoro | 08086484940 | Male' },
  { id: 'a2', studentId: 's2', label: 'Richard Noel | 07012345678 | Male' },
  { id: 'a3', studentId: 's3', label: 'Carlos Mendez | 09087654321 | Male' },
];

 const AttendanceRecord: React.FC = () => {
  const route = useRoute();
  // @ts-ignore
  const { studentId } = route.params || {};

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Attendance Register</Text>
          <TouchableOpacity style={styles.printBtn}><Text style={{color:'#fff'}}>Print as PDF</Text></TouchableOpacity>
        </View>

        <View style={styles.meta}>
          <Text style={{fontWeight:'700'}}>Total Attendance: 23</Text>
          <Text style={{color: MUTED_GRAY}}>Male: 10 • Female: 13</Text>
        </View>

        <FlatList
          data={mockRecords}
          keyExtractor={i => i.id}
          renderItem={({ item }) => (
            <View style={styles.record}>
              <Text>{item.label}</Text>
            </View>
          )}
          style={{marginTop:12}}
        />

      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SCREEN_BG },
  container: { padding: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700' },
  printBtn: { backgroundColor: PRIMARY_BLUE, padding: 10, borderRadius: 8 },
  meta: { marginTop: 12, backgroundColor: CARD_BG, padding: 12, borderRadius: 8 },
  record: { backgroundColor: CARD_BG, padding: 12, borderRadius: 8, marginTop: 8 }
});
export default AttendanceRecord;