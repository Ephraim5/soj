import React from 'react';
import { SafeAreaView, View, Text, StyleSheet } from 'react-native';
import { SCREEN_BG, CARD_BG } from './colors';

 const AttendanceSummary: React.FC = () => {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Attendance Record - Emeka Okoro</Text>

        <View style={styles.card}>
          <Text style={{fontWeight:'700'}}>Full Name</Text>
          <Text style={{marginTop:6}}>Emeka Okoro</Text>
          <Text style={{marginTop:6}}>Phone: 08086484940</Text>
          <Text style={{marginTop:6}}>Joined: June 15, 2025</Text>
        </View>

        <View style={styles.card}>
          <Text style={{fontWeight:'700'}}>Total Attendance</Text>
          <Text style={{marginTop:6}}>4</Text>

          <View style={{marginTop:8}}>
            <Text>July 4, 2025 <Text>✔️</Text></Text>
            <Text>July 3, 2025 <Text>❌</Text></Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SCREEN_BG },
  container: { padding: 12 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  card: { backgroundColor: CARD_BG, padding: 12, borderRadius: 8, marginBottom: 10 }
});

export default AttendanceSummary;