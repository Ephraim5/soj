import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'https://streamsofjoyumuahia-api.onrender.com';

export default function UnitAssignmentsListScreen({ navigation }: any){
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState<any[]>([]);
  useEffect(()=>{ (async()=>{ try{ const tk = await AsyncStorage.getItem('token'); if(!tk) return; const res = await fetch(`${API_BASE}/api/units/assignments`, { headers:{ Authorization:`Bearer ${tk}` } }); const json = await res.json(); if(json.ok) setUnits(json.units||[]); } finally{ setLoading(false); } })(); },[]);
  if(loading) return <SafeAreaView style={{flex:1,justifyContent:'center',alignItems:'center'}}><ActivityIndicator size="large" /></SafeAreaView>;
  return (
    <SafeAreaView style={{ flex:1, backgroundColor:'#fff' }}>
      <View style={styles.header}><Text style={styles.headerTitle}>Units</Text></View>
      <FlatList data={units} keyExtractor={(i)=> i._id} renderItem={({item})=> (
        <TouchableOpacity style={styles.row} onPress={()=> navigation.navigate('UnitAssignmentsDetail', { unit: item })}>
          <View>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>Leader: {item.leaderName||'_'} • Ministry: {item.ministryName || '-'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#64748b" />
        </TouchableOpacity>
      )} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header:{ padding:16, borderBottomWidth:1, borderColor:'#e2e8f0' },
  headerTitle:{ fontWeight:'800', fontSize:16 },
  row:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:14, borderBottomWidth:1, borderColor:'#e5e7eb' },
  name:{ fontWeight:'700', color:'#0f172a' },
  meta:{ color:'#475569', marginTop:2 }
});
