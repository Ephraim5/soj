import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, TextInput, ScrollView, RefreshControl, ActivityIndicator, Modal, InteractionManager } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useRoute, RouteProp } from '@react-navigation/native';
import ModernLoader from '../../../loader/load';
import { useSoulsStore } from '../../../context/SoulsStore';
import { heightPercentageToDP } from 'react-native-responsive-screen';
import AddSoulModal from './AddSoulModalSCreen';

type SoulsStack = {
  SoulsWon: { scope?: 'mine'|'unit' }|undefined;
  AddSoulModal: undefined;
};
type SoulsNav = NativeStackNavigationProp<SoulsStack,'SoulsWon'>;
type SoulsRoute = RouteProp<SoulsStack,'SoulsWon'>;

const UnifiedSoulsWonScreen: React.FC<{ navigation: SoulsNav }> = ({ navigation }) => {
  const route = useRoute<SoulsRoute>();
  const scope = route.params?.scope || 'mine';
  const readOnlySuperAdmin = (route.params as any)?.readOnlySuperAdmin;
  const [query, setQuery] = useState('');
  type YearOption = 'All' | number;
  const [year, setYear] = useState<YearOption>('All');
  const [showYearList, setShowYearList] = useState(false);
  // Use global souls store to avoid duplicate network calls
  const { personal, unit } = useSoulsStore();
  const loading = scope === 'unit' ? unit.loading : personal.loading;
  const [refreshing, setRefreshing] = useState(false);
  const error = scope === 'unit' ? unit.error : personal.error;
  const refresh = scope === 'unit' ? unit.refresh : personal.refresh;
  const souls = scope === 'unit' ? (unit.data?.souls || []) : (personal.data?.souls || []);
  const availableYears = useMemo(() => {
    const set = new Set<number>();
    // include from data
    for (const s of souls) {
      const d = s?.dateWon ? new Date(s.dateWon) : undefined;
      if (d && !isNaN(d.getTime())) set.add(d.getFullYear());
    }
    // ensure a recent range is always present (current down to current-5)
    const nowYear = new Date().getFullYear();
    for (let y = nowYear; y >= nowYear - 80; y--) set.add(y);
    return Array.from(set).sort((a,b)=>b-a);
  }, [souls]);
  const filtered = useMemo(()=>{
    const q = query.toLowerCase();
    const byYear = year === 'All' ? souls : souls.filter(s => {
      const d = s?.dateWon ? new Date(s.dateWon) : undefined;
      return d && !isNaN(d.getTime()) && d.getFullYear() === year;
    });
    return byYear.filter(s => !q || s.name?.toLowerCase().includes(q) || s.phone?.includes(q));
  },[souls,query,year]);
  const title = scope==='unit' ? 'Souls Won (Unit)' : 'Souls You Won';
  const [showAdd, setShowAdd] = useState(false);
  const [convertedViewText, setConvertedViewText] = useState<string | null>(null);
  const [convertedViewTitle, setConvertedViewTitle] = useState<string>('Converted Through');
  const handleAdd = () => { if (readOnlySuperAdmin) return; if (scope==='mine') setShowAdd(true); }; // disable for superadmin read-only

  // Ensure data loads on screen mount or scope change
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      refresh();
    });
    return () => task.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  const onPullRefresh = async () => {
    setRefreshing(true);
    try { await refresh(); } finally { setRefreshing(false); }
  };

  return (
    <View style={uStyles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      <View style={uStyles.header}>
        <TouchableOpacity style={uStyles.backButton} onPress={()=>navigation.goBack()}>
          <Icon name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={uStyles.headerTitle}>{title}</Text>
        <TouchableOpacity style={uStyles.yearBtn} onPress={()=>setShowYearList(s=>!s)}>
          <Text style={uStyles.yearBtnText}>{year === 'All' ? 'All' : String(year)}</Text>
          <Icon name={showYearList ? 'chevron-up' : 'chevron-down'} size={16} color="#0d5c75" />
        </TouchableOpacity>
      </View>
      {showYearList && (
        <View style={uStyles.yearMenu}>
          <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
            <TouchableOpacity style={uStyles.yearMenuItem} onPress={()=>{ setYear('All'); setShowYearList(false); }}>
              <Text style={uStyles.yearMenuItemText}>All</Text>
            </TouchableOpacity>
            {availableYears.map(y => (
              <TouchableOpacity key={y} style={uStyles.yearMenuItem} onPress={()=>{ setYear(y); setShowYearList(false); }}>
                <Text style={uStyles.yearMenuItemText}>{y}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      <View style={uStyles.searchContainer}>
        <TextInput style={uStyles.searchInput} placeholder="Search by name" placeholderTextColor="#999" value={query} onChangeText={setQuery} />
        <TouchableOpacity style={uStyles.refreshButton} onPress={refresh} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#0d5c75" />
          ) : (
            <Icon name="refresh" size={18} color="#0d5c75" />
          )}
        </TouchableOpacity>
      </View>
      {loading && <ModernLoader fullscreen={false} spinnerSize={60} ringWidth={6} logoSize={34} />}
      {!loading && error && (
        <View style={{ paddingHorizontal:20 }}>
          <Text style={{ color:'red', textAlign:'center', marginBottom:10 }}>Failed to load souls</Text>
          <TouchableOpacity onPress={refresh} style={uStyles.retryBtn}><Text style={uStyles.retryText}>Retry</Text></TouchableOpacity>
        </View>
      )}
      {!loading && !error && (
        <>
          <View style={uStyles.statsHeader}>
            <Text style={uStyles.soulsWonText}><Text style={uStyles.soulsCount}>{filtered.length}</Text>{filtered.length === 1 ? ' Soul' : ' Souls'} Won</Text>
            {scope==='mine' && !readOnlySuperAdmin && (
              <TouchableOpacity style={uStyles.addButton} onPress={handleAdd}>
                <Icon name="add" size={20} color="white" />
                <Text style={uStyles.addButtonText}>Add New Soul</Text>
              </TouchableOpacity>
            )}
          </View>
          <ScrollView
            style={{ flex:1, paddingHorizontal:20 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onPullRefresh} />}
          >
            {filtered.map(s=> (
              <View key={s._id} style={uStyles.convertCard}>
                <View style={uStyles.convertHeader}><Text style={uStyles.convertName}>{s.name||'Unnamed'}</Text></View>
                <View style={uStyles.convertDetails}>
                  <View style={[uStyles.detailRow, { marginTop: 0 }]}>
                    <Text style={uStyles.detailLabel}>Gender</Text>
                    <Text style={uStyles.detailValue}>{s.gender || '-'}</Text>
                  </View>
                  {s.phone && (
                    <View style={[uStyles.detailRow, { marginTop: 8 }]}>
                      <Text style={uStyles.detailLabel}>Phone Number</Text>
                      <Text style={uStyles.detailValue}>{s.phone}</Text>
                    </View>
                  )}
                  <View style={[uStyles.detailRow, { marginTop: 8 }]}>
                    <Text style={uStyles.detailLabel}>Age Range</Text>
                    <Text style={uStyles.detailValue}>{s.ageRange || '-'}</Text>
                  </View>
                  <View style={[uStyles.detailRow, { marginTop: 8 }]}>
                    <Text style={uStyles.detailLabel}>Converted Through</Text>
                    <View style={uStyles.valueWithAction}>
                     
                      {!!s.convertedThrough && (
                        <TouchableOpacity
                          style={uStyles.viewBtn}
                          onPress={() => { setConvertedViewTitle(s.name || 'Converted Through'); setConvertedViewText(s.convertedThrough!); }}
                        >
                          <Text style={uStyles.viewBtnText}>View</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  <View style={[uStyles.detailRow, { marginTop: 8 }]}>
                    <Text style={uStyles.detailLabel}>Location</Text>
                    <Text style={uStyles.detailValue}>{s.location || '-'}</Text>
                  </View>
                  <View style={[uStyles.detailRow, { marginTop: 8 }]}>
                    <Text style={uStyles.detailLabel}>Date</Text>
                    <Text style={uStyles.detailValue}>{s.dateWon? new Date(s.dateWon).toLocaleDateString(undefined,{ year:'numeric', month:'long', day:'numeric' }):'-'}</Text>
                  </View>
                </View>
              </View>
            ))}
            {!filtered.length && <Text style={{ textAlign:'center', padding:20, color:'#666' }}>{souls.length? 'No matches':'No souls yet'}</Text>}
          </ScrollView>
          {/* Add Soul Modal */}
          {!readOnlySuperAdmin && <AddSoulModal visible={showAdd} onClose={()=>setShowAdd(false)} />}
          {/* Converted Through Modal */}
          <Modal
            transparent
            visible={!!convertedViewText}
            onRequestClose={() => setConvertedViewText(null)}
            animationType="fade"
          >
            <View style={uStyles.modalOverlay}>
              <View style={uStyles.modalCard}>
                <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <Text style={uStyles.modalTitle}>{convertedViewTitle}</Text>
                  <TouchableOpacity onPress={() => setConvertedViewText(null)}><Icon name="close" size={22} color="#1b3a46" /></TouchableOpacity>
                </View>
                <ScrollView style={{ maxHeight: 260 }}>
                  <Text style={uStyles.modalBody}>{convertedViewText}</Text>
                </ScrollView>
                <TouchableOpacity style={uStyles.modalCloseBtn} onPress={() => setConvertedViewText(null)}>
                  <Text style={uStyles.modalCloseText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </>
      )}
    </View>
  );
};

const uStyles = StyleSheet.create({
  container:{ flexGrow:1, backgroundColor:'white', paddingTop:heightPercentageToDP(5) },
  header:{ flexDirection:'row', alignItems:'center', paddingHorizontal:20, paddingTop:10, paddingBottom:12 },
  backButton:{ marginRight:15 },
  headerTitle:{ fontSize:20, fontWeight:'600', color:'#333', flex:1 },
  yearBtn:{ flexDirection:'row', alignItems:'center', backgroundColor:'#eef6f9', paddingHorizontal:10, paddingVertical:6, borderRadius:8, borderWidth:1, borderColor:'#dbeff6' },
  yearBtnText:{ color:'#0d5c75', fontWeight:'700', marginRight:6 },
  yearMenu:{ position:'absolute', right:20, top:heightPercentageToDP(11), backgroundColor:'#fff', borderWidth:1, borderColor:'#e0e0e0', borderRadius:10, elevation:3, shadowColor:'#000', shadowOpacity:0.08, shadowRadius:8, shadowOffset:{ width:0, height:2 }, zIndex:50 },
  yearMenuItem:{ paddingHorizontal:14, paddingVertical:12, borderBottomWidth:1, borderBottomColor:'#f1f1f1' },
  yearMenuItemText:{ color:'#0d5c75', fontWeight:'600' },
  searchContainer:{ flexDirection:'row', alignItems:'center', paddingHorizontal:20, marginBottom:14, marginTop:6 },
  searchInput:{ flex:1, backgroundColor:'#f8f8f8', borderRadius:8, paddingHorizontal:15, paddingVertical:12, fontSize:14, color:'#333', borderWidth:1, borderColor:'#e0e0e0' },
  refreshButton:{ marginLeft:10, width:36, height:36, borderRadius:18, backgroundColor:'#e9f4f8', alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:'#dbeff6' },
  statsHeader:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:20, marginBottom:20 },
  soulsWonText:{ fontSize:16, color:'#333' },
  soulsCount:{ fontWeight:'bold', fontSize:18 },
  addButton:{ flexDirection:'row', alignItems:'center', backgroundColor:'#349DC5', paddingHorizontal:15, paddingVertical:8, borderRadius:8 },
  addButtonText:{ color:'white', fontSize:14, fontWeight:'500', marginLeft:5 },
  retryBtn:{ alignSelf:'center', backgroundColor:'#349DC5', paddingHorizontal:20, paddingVertical:10, borderRadius:6 },
  retryText:{ color:'white', fontWeight:'600' },
  convertCard:{ backgroundColor:'#f8f8f8', borderRadius:12, padding:15, marginBottom:15, borderWidth:1, borderColor:'#e0e0e0' },
  convertHeader:{ marginBottom:10 },
  convertName:{ fontSize:16, fontWeight:'600', color:'#349DC5' },
  convertDetails:{},
  detailRow:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  detailLabel:{ fontSize:14, color:'#666' },
  detailValue:{ fontSize:14, color:'#333', fontWeight:'500' },
  valueWithAction:{ flexDirection:'row', alignItems:'center' },
  viewBtn:{ marginLeft:10, paddingHorizontal:10, paddingVertical:6, borderRadius:6, backgroundColor:'#e9f4f8', borderWidth:1, borderColor:'#dbeff6' },
  viewBtnText:{ color:'#0d5c75', fontWeight:'700', fontSize:12 },
  modalOverlay:{ flex:1, backgroundColor:'rgba(0,0,0,0.25)', alignItems:'center', justifyContent:'center', padding:20 },
  modalCard:{ width:'100%', backgroundColor:'#fff', borderRadius:12, padding:16, borderWidth:1, borderColor:'#e6eef1' },
  modalTitle:{ fontSize:16, fontWeight:'700', color:'#1b3a46' },
  modalBody:{ fontSize:14, color:'#213c46', lineHeight:20 },
  modalCloseBtn:{ marginTop:14, alignSelf:'flex-end', backgroundColor:'#0d5c75', paddingHorizontal:14, paddingVertical:10, borderRadius:8 },
  modalCloseText:{ color:'#fff', fontWeight:'700' },
});

export default UnifiedSoulsWonScreen;
