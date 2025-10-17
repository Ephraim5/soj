import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

export default function UnitAssignmentsDetailScreen({ route }: any){
  const unit = route?.params?.unit || {};
  return (
    <SafeAreaView style={{ flex:1, backgroundColor:'#fff' }}>
      <View style={styles.header}><Text style={styles.headerTitle}>{unit.name}</Text></View>
      <View style={{ padding:16 }}>
        <Text style={styles.row}>Leader: <Text style={styles.val}>{unit.leaderName || '_'}</Text></Text>
        <Text style={styles.row}>Ministry: <Text style={styles.val}>{unit.ministryName || '-'}</Text></Text>
        <Text style={styles.row}>Attendance Taking: <Text style={styles.val}>{unit.attendanceTaking? 'Yes':'No'}</Text></Text>
        <Text style={styles.row}>Music Unit: <Text style={styles.val}>{unit.musicUnit? 'Yes':'No'}</Text></Text>
        <Text style={[styles.row,{marginTop:10}]}>Enabled Cards:</Text>
        {Array.isArray(unit.enabledReportCards) && unit.enabledReportCards.length ? unit.enabledReportCards.map((k:string)=> (
          <Text key={k} style={styles.card}>{k}</Text>
        )) : <Text style={{ color:'#475569' }}>None</Text>}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header:{ padding:16, borderBottomWidth:1, borderColor:'#e2e8f0' },
  headerTitle:{ fontWeight:'800', fontSize:16 },
  row:{ color:'#0f172a', marginBottom:6 },
  val:{ fontWeight:'700' },
  card:{ backgroundColor:'#f1f5f9', paddingVertical:6, paddingHorizontal:10, borderRadius:8, marginTop:6, color:'#0f172a', alignSelf:'flex-start' }
});
