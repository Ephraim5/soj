import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, TextInput, ScrollView, RefreshControl, ActivityIndicator, Modal, InteractionManager } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { heightPercentageToDP } from 'react-native-responsive-screen';
import AchievementModal, { AchievementFormValues } from './AchievementModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Achievement, createAchievement, deleteAchievement, listAchievements, updateAchievement } from '../../../api/achievements';

export default function AchievementsScreen({ navigation, route }: any) {
  const readOnlySuperAdmin = route?.params?.readOnlySuperAdmin;
  const [query, setQuery] = useState('');
  type YearOption = 'All' | number;
  const [year, setYear] = useState<YearOption>('All');
  const [showYearList, setShowYearList] = useState(false);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Achievement | null>(null);
  const [descTruncated, setDescTruncated] = useState<Record<string, boolean>>({});
  const [viewText, setViewText] = useState<string | null>(null);
  const [viewTitle, setViewTitle] = useState<string>('');
  const [deleteItem, setDeleteItem] = useState<Achievement | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const availableYears = useMemo(() => {
    const set = new Set<number>();
    for (const a of achievements) {
      const d = a?.date ? new Date(a.date) : undefined;
      if (d && !isNaN(d.getTime())) set.add(d.getFullYear());
    }
    const nowYear = new Date().getFullYear();
    for (let y = nowYear; y >= nowYear - 80; y--) set.add(y);
    return Array.from(set).sort((a,b)=>b-a);
  }, [achievements]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const byYear = year === 'All' ? achievements : achievements.filter(a => {
      const d = a?.date ? new Date(a.date) : undefined;
      return d && !isNaN(d.getTime()) && d.getFullYear() === year;
    });
    return byYear.filter(a => !q || a.title?.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q));
  }, [achievements, query, year]);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const token = (await AsyncStorage.getItem('token')) || (await AsyncStorage.getItem('auth_token')) || '';
      const res = await listAchievements(token, { year: year === 'All' ? undefined : year, scope: 'unit' });
      setAchievements(res.achievements || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load achievements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => { load(); });
    return () => task.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  const onPullRefresh = async () => {
    setRefreshing(true);
    try { await load(); } finally { setRefreshing(false); }
  };

  const openAdd = () => { if (readOnlySuperAdmin) return; setEditItem(null); setShowModal(true); };
  const openEdit = (item: Achievement) => { if (readOnlySuperAdmin) return; setEditItem(item); setShowModal(true); };

  const handleSubmit = async (values: AchievementFormValues) => {
    if (readOnlySuperAdmin) return;
    const token = (await AsyncStorage.getItem('token')) || (await AsyncStorage.getItem('auth_token')) || '';
    if (editItem) {
      // update
      const res = await updateAchievement(editItem._id, { title: values.title, description: values.description, date: values.date?.toISOString() }, token);
      setAchievements(prev => prev.map(a => a._id === editItem._id ? res.achievement : a));
    } else {
      // create
      const res = await createAchievement({ title: values.title, description: values.description, date: values.date?.toISOString() }, token);
      setAchievements(prev => [res.achievement, ...prev]);
    }
  };

  const requestDelete = (item: Achievement) => {
    if (readOnlySuperAdmin) return; 
    setDeleteError(null);
    setDeleteItem(item);
  };

  const confirmDelete = async () => {
    if (!deleteItem) return;
    try {
      setDeleting(true);
      const token = (await AsyncStorage.getItem('token')) || (await AsyncStorage.getItem('auth_token')) || '';
      await deleteAchievement(deleteItem._id, token);
      setAchievements(prev => prev.filter(a => a._id !== deleteItem._id));
      setDeleteItem(null);
    } catch (e: any) {
      setDeleteError(e?.message || 'Failed to delete. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={()=>navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        {/* Achievements icon */}
        <Ionicons name="trophy" size={25} color="#333" />
        <Text style={styles.headerTitle}>Unit Achievements</Text>
        <TouchableOpacity style={styles.yearBtn} onPress={()=>setShowYearList(s=>!s)}>
          <Text style={styles.yearBtnText}>{year === 'All' ? 'All' : String(year)}</Text>
          <Ionicons name={showYearList ? 'chevron-up' : 'chevron-down'} size={16} color="#0d5c75" />
        </TouchableOpacity>
      </View>
      {showYearList && (
        <View style={styles.yearMenu}>
          <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
            <TouchableOpacity style={styles.yearMenuItem} onPress={()=>{ setYear('All'); setShowYearList(false); }}>
              <Text style={styles.yearMenuItemText}>All</Text>
            </TouchableOpacity>
            {availableYears.map(y => (
              <TouchableOpacity key={y} style={styles.yearMenuItem} onPress={()=>{ setYear(y); setShowYearList(false); }}>
                <Text style={styles.yearMenuItemText}>{y}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      <View style={styles.searchContainer}>
        <TextInput style={styles.searchInput} placeholder="Search by title or description" placeholderTextColor="#999" value={query} onChangeText={setQuery} />
        <TouchableOpacity style={styles.refreshButton} onPress={load} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#0d5c75" />
          ) : (
            <Ionicons name="refresh" size={18} color="#0d5c75" />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.statsHeader}>
        <Text style={styles.countText}><Text style={styles.countNum}>{filtered.length}</Text> {filtered.length === 1 ? 'Achievement' : 'Achievements'}</Text>
        {!readOnlySuperAdmin && (
          <TouchableOpacity style={styles.addButton} onPress={openAdd}>
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.addButtonText}>Add Achievement</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={{ flex:1, paddingHorizontal:20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onPullRefresh} />}
      >
        {filtered.map(a => (
          <View key={a._id} style={styles.card}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
              <Text style={styles.cardTitle}>{a.title}</Text>
              <View style={{ flexDirection:'row', gap:8 }}>
                {!readOnlySuperAdmin && (
                  <>
                    <TouchableOpacity onPress={() => openEdit(a)} style={styles.iconBtn}><Ionicons name="pencil" size={16} color="#0d5c75" /></TouchableOpacity>
                    <TouchableOpacity onPress={() => requestDelete(a)} style={styles.iconBtn}><Ionicons name="trash" size={16} color="#b00020" /></TouchableOpacity>
                  </>
                )}
              </View>
            </View>
            <Text style={styles.cardDate}>{a.date ? new Date(a.date).toLocaleDateString(undefined,{ year:'numeric', month:'long', day:'numeric' }) : ''}</Text>
            {!!a.description && (
              <>
                <Text
                  style={styles.cardDesc}
                  numberOfLines={3}
                  ellipsizeMode="tail"
                  onTextLayout={(e) => {
                    const isTrunc = (e.nativeEvent?.lines?.length || 0) > 3;
                    if (descTruncated[a._id] !== isTrunc) {
                      setDescTruncated(prev => ({ ...prev, [a._id]: isTrunc }));
                    }
                  }}
                >
                  {a.description}
                </Text>
                {descTruncated[a._id] && (
                  <TouchableOpacity
                    style={styles.viewBtn}
                    onPress={() => { setViewTitle(a.title); setViewText(a.description!); }}
                  >
                    <Text style={styles.viewBtnText}>View</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        ))}
        {!filtered.length && !loading && (
          <Text style={{ textAlign:'center', padding:20, color:'#666' }}>{achievements.length? 'No matches':'No achievements yet'}</Text>
        )}
      </ScrollView>

      <AchievementModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        initialValues={editItem ? { title: editItem.title, description: editItem.description, date: editItem.date ? new Date(editItem.date) : new Date() } : undefined}
        onSubmit={handleSubmit}
      />

      {/* Full Description Modal */}
      <Modal
        transparent
        visible={!!viewText}
        onRequestClose={() => setViewText(null)}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <Text style={styles.modalTitle}>{viewTitle}</Text>
              <TouchableOpacity onPress={() => setViewText(null)}><Ionicons name="close" size={22} color="#1b3a46" /></TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 260 }}>
              <Text style={styles.modalBody}>{viewText}</Text>
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setViewText(null)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        transparent
        visible={!!deleteItem}
        onRequestClose={() => { if (!deleting) setDeleteItem(null); }}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <View style={{ flexDirection:'row', alignItems:'center' }}>
                <Ionicons name="trash" size={20} color="#b00020" />
                <Text style={[styles.modalTitle, { marginLeft: 8 }]}>Delete Achievement</Text>
              </View>
              <TouchableOpacity disabled={deleting} onPress={() => setDeleteItem(null)}>
                <Ionicons name="close" size={22} color="#1b3a46" />
              </TouchableOpacity>
            </View>
            <Text style={{ color:'#213c46', marginBottom:12 }}>
              Are you sure you want to delete
              {deleteItem ? ` "${deleteItem.title}"` : ''}? This action cannot be undone.
            </Text>
            {!!deleteError && <Text style={{ color:'#b00020', marginBottom:8 }}>{deleteError}</Text>}
            <View style={styles.confirmRow}>
              <TouchableOpacity disabled={deleting} onPress={() => setDeleteItem(null)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={deleting} onPress={confirmDelete} style={styles.deleteBtn}>
                {deleting ? <ActivityIndicator color="#fff" /> : <Ionicons name="trash" size={16} color="#fff" />}
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flexGrow:1, backgroundColor:'white', paddingTop:heightPercentageToDP(2) },
  header:{ flexDirection:'row', alignItems:'center', paddingHorizontal:20, paddingTop:20, paddingBottom:12 },
  backButton:{ marginRight:5 },
  headerTitle:{ fontSize:16,marginLeft:5, fontWeight:'800', color:'#333', flex:1 },
  yearBtn:{ flexDirection:'row', alignItems:'center', backgroundColor:'#eef6f9', paddingHorizontal:10, paddingVertical:6, borderRadius:8, borderWidth:1, borderColor:'#dbeff6' },
  yearBtnText:{ color:'#0d5c75', fontWeight:'700', marginRight:6 },
  yearMenu:{ position:'absolute', right:20, top:heightPercentageToDP(11), backgroundColor:'#fff', borderWidth:1, borderColor:'#e0e0e0', borderRadius:10, elevation:3, shadowColor:'#000', shadowOpacity:0.08, shadowRadius:8, shadowOffset:{ width:0, height:2 }, zIndex:50 },
  yearMenuItem:{ paddingHorizontal:14, paddingVertical:12, borderBottomWidth:1, borderBottomColor:'#f1f1f1' },
  yearMenuItemText:{ color:'#0d5c75', fontWeight:'600' },
  searchContainer:{ flexDirection:'row', alignItems:'center', paddingHorizontal:20, marginBottom:14, marginTop:6 },
  searchInput:{ flex:1, backgroundColor:'#f8f8f8', borderRadius:8, paddingHorizontal:15, paddingVertical:12, fontSize:14, color:'#333', borderWidth:1, borderColor:'#e0e0e0' },
  refreshButton:{ marginLeft:10, width:36, height:36, borderRadius:18, backgroundColor:'#e9f4f8', alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:'#dbeff6' },
  statsHeader:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:20, marginBottom:20 },
  countText:{ fontSize:16, color:'#333' },
  countNum:{ fontWeight:'bold', fontSize:18 },
  addButton:{ flexDirection:'row', alignItems:'center', backgroundColor:'#349DC5', paddingHorizontal:15, paddingVertical:8, borderRadius:8 },
  addButtonText:{ color:'white', fontSize:14, fontWeight:'500', marginLeft:5 },
  card:{ backgroundColor:'#f8f8f8', borderRadius:12, padding:15, marginBottom:15, borderWidth:1, borderColor:'#e0e0e0' },
  cardTitle:{ fontSize:16, fontWeight:'700', color:'#349DC5' },
  cardDate:{ fontSize:12, color:'#666', marginTop:2 },
  cardDesc:{ fontSize:14, color:'#333', marginTop:8 },
  iconBtn:{ padding:6, borderRadius:6, backgroundColor:'#e9f4f8', borderWidth:1, borderColor:'#dbeff6', marginLeft:8 },
  viewBtn:{ alignSelf:'flex-start', marginTop:6, paddingHorizontal:10, paddingVertical:6, borderRadius:6, backgroundColor:'#e9f4f8', borderWidth:1, borderColor:'#dbeff6' },
  viewBtnText:{ color:'#0d5c75', fontWeight:'700', fontSize:12 },
  modalOverlay:{ flex:1, backgroundColor:'rgba(0,0,0,0.25)', alignItems:'center', justifyContent:'center', padding:20 },
  modalCard:{ width:'100%', backgroundColor:'#fff', borderRadius:12, padding:16, borderWidth:1, borderColor:'#e6eef1' },
  modalTitle:{ fontSize:16, fontWeight:'700', color:'#1b3a46' },
  modalBody:{ fontSize:14, color:'#213c46', lineHeight:20 },
  modalCloseBtn:{ marginTop:14, alignSelf:'flex-end', backgroundColor:'#0d5c75', paddingHorizontal:14, paddingVertical:10, borderRadius:8 },
  modalCloseText:{ color:'#fff', fontWeight:'700' },
  confirmRow:{ flexDirection:'row', justifyContent:'flex-end', alignItems:'center', marginTop:10 },
  cancelBtn:{ paddingVertical:10, paddingHorizontal:14, borderRadius:8, borderWidth:1, borderColor:'#e0e0e0', marginRight:8 },
  cancelText:{ color:'#213c46', fontWeight:'600' },
  deleteBtn:{ flexDirection:'row', alignItems:'center', backgroundColor:'#b00020', paddingVertical:10, paddingHorizontal:14, borderRadius:8 },
  deleteText:{ color:'#fff', fontWeight:'700', marginLeft:8 }
});
