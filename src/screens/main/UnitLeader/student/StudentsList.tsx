import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { Student } from './types';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../../navigation/Navigation';
import { CARD_BG, SCREEN_BG, MUTED_GRAY,PRIMARY_BLUE } from './colors';
import { Ionicons } from '@expo/vector-icons';

const initial: Student[] = [
  { id: 's1', firstName: 'Emeka', lastName: 'Okoro', regNo: 'REG001', className: 'JSS1', phone: '08086484940' },
  { id: 's2', firstName: 'Carlos', lastName: 'Mendez', regNo: 'REG002', className: 'JSS1', phone: '09087654321' },
  { id: 's3', firstName: 'Fatima', lastName: 'Khan', regNo: 'REG003', className: 'JSS1', phone: '08023456789' },
];

 const StudentsList: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [query, setQuery] = useState('');
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    setStudents(initial);
  }, []);

  const filtered = students.filter(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(query.toLowerCase()) || (s.phone || '').includes(query));

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.searchRow}>
          <TextInput placeholder="Search by Name or Phone" value={query} onChangeText={setQuery} style={styles.searchInput} />
          <TouchableOpacity style={styles.filterBtn}><Ionicons name="options" size={20} /></TouchableOpacity>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{flex:1}}>
                <Text style={styles.name}>{item.firstName} {item.lastName}</Text>
                <Text style={styles.meta}>{item.phone}</Text>
                <Text style={[styles.meta, {marginTop:6}]}>Joined: June 15, 2025</Text>
              </View>
              <TouchableOpacity testID={`btn-view-attendance-record-${item.id}`} style={styles.actionBtn} onPress={() => nav.navigate('AttendanceRecord', { studentId: item.id })}>
                <Text style={{color: '#fff'}}>View Attendance Record</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SCREEN_BG },
  container: { padding: 12 },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  searchInput: { flex: 1, backgroundColor: '#fff', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#eef3f5' },
  filterBtn: { marginLeft: 8, padding: 10, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#eef3f5' },
  card: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: CARD_BG, borderRadius: 8, marginBottom: 10 },
  name: { fontWeight: '700', fontSize: 16 },
  meta: { color: MUTED_GRAY },
  actionBtn: { backgroundColor: PRIMARY_BLUE, padding: 10, borderRadius: 8 }
});
export default StudentsList;