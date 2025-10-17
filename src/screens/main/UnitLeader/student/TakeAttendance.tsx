import React, { useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, FlatList, TouchableOpacity, Switch, TextInput } from 'react-native';
import { Student } from './types';
import { useNavigation } from '@react-navigation/native';
import { CARD_BG, SCREEN_BG, PRIMARY_BLUE, MUTED_GRAY } from './colors';

const initial: Student[] = [
  { id: 's1', firstName: 'Emeka', lastName: 'Okoro', regNo: 'REG001', className: 'JSS1', phone: '08086484940' },
  { id: 's2', firstName: 'Richard', lastName: 'Noel', regNo: 'REG002', className: 'JSS1', phone: '07012345678' },
  { id: 's3', firstName: 'Carlos', lastName: 'Mendez', regNo: 'REG003', className: 'JSS1', phone: '09087654321' },
  { id: 's4', firstName: 'Fatima', lastName: 'Khan', regNo: 'REG004', className: 'JSS1', phone: '08023456789' },
  { id: 's5', firstName: 'Liam', lastName: 'Chibuike', regNo: 'REG005', className: 'JSS1', phone: '08123456789' },
];

 const TakeAttendance: React.FC = () => {
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent'>>({});
  const [query, setQuery] = useState('');
  const nav = useNavigation();

  const togglePresent = (id: string) => {
    setAttendance(prev => ({ ...prev, [id]: prev[id] === 'present' ? 'absent' : 'present' }));
  };

  const submit = () => {
    // In real impl: save attendance to storage/api
    console.log('submit', attendance);
    nav.goBack();
  };

  const filtered = initial.filter(s => (`${s.firstName} ${s.lastName}`).toLowerCase().includes(query.toLowerCase()));

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Take Attendance</Text>
        <TouchableOpacity testID="btn-add-new-student" onPress={() => nav.navigate('AddStudentModal' as never)}><Text style={styles.add}>+ Add New Student</Text></TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <TextInput placeholder="Search by Name or Phone" value={query} onChangeText={setQuery} style={styles.searchInput} />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View>
              <Text style={styles.name}>{item.firstName} {item.lastName}</Text>
              <Text style={styles.meta}>{item.phone}</Text>
            </View>
            <TouchableOpacity style={styles.checkbox} onPress={() => togglePresent(item.id)}>
              <Text style={{color: attendance[item.id] === 'present' ? '#fff' : PRIMARY_BLUE}}>{attendance[item.id] === 'present' ? 'Present' : 'Mark'}</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <TouchableOpacity testID="btn-submit-attendance" style={styles.submit} onPress={submit}>
        <Text style={{color: '#fff', fontWeight: '700'}}>Submit Attendance</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SCREEN_BG },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
  title: { fontSize: 18, fontWeight: '700' },
  add: { color: PRIMARY_BLUE, fontWeight: '700' },
  searchRow: { paddingHorizontal: 12, marginBottom: 6 },
  searchInput: { backgroundColor: '#fff', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#eef3f5' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: CARD_BG, borderRadius: 8, marginBottom: 8 },
  name: { fontWeight: '700' },
  meta: { color: MUTED_GRAY },
  checkbox: { padding: 8, borderRadius: 8, borderWidth: 1, borderColor: PRIMARY_BLUE },
  submit: { margin: 12, backgroundColor: PRIMARY_BLUE, padding: 14, borderRadius: 10, alignItems: 'center' }
});

export default TakeAttendance;