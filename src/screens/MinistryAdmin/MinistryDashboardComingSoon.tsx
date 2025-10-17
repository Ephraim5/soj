import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const MinistryDashboardComingSoon: React.FC = () => {
  const nav = useNavigation();
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.badge}>MINISTRY ADMIN</Text>
        <Text style={styles.title}>Dashboard Coming Soon</Text>
        <Text style={styles.body}>Your ministry admin workspace is almost ready. Soon you will be able to:
        {'\n'}• Approve unit leaders for your ministry
        {'\n'}• Review work plans scoped to your ministry
        {'\n'}• See metrics for units under your ministry only
        {'\n'}• Manage members within your ministry context
        </Text>
        <Text style={styles.note}>For now you can still use the Support & More tabs. Any approvals you perform are limited automatically to your ministry scope.</Text>
        <TouchableOpacity onPress={()=> nav.goBack()} style={styles.btn}> 
          <Text style={styles.btnText}>Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea:{ flex:1, backgroundColor:'#fff' },
  container:{ flex:1, padding:24, justifyContent:'center' },
  badge:{ alignSelf:'flex-start', backgroundColor:'#2CA6FF10', color:'#2CA6FF', paddingHorizontal:10, paddingVertical:4, borderRadius:6, fontSize:11, fontWeight:'600', marginBottom:18 },
  title:{ fontSize:24, fontWeight:'700', color:'#0B2540', marginBottom:12 },
  body:{ fontSize:14, color:'#344054', lineHeight:20, marginBottom:20 },
  note:{ fontSize:12, color:'#667085', lineHeight:18, marginBottom:28 },
  btn:{ backgroundColor:'#2CA6FF', height:48, borderRadius:10, alignItems:'center', justifyContent:'center', paddingHorizontal:26 },
  btnText:{ color:'#fff', fontWeight:'600', fontSize:15 }
});

export default MinistryDashboardComingSoon;
