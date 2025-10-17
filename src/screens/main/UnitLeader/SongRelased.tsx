import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Linking, TouchableOpacity, Modal, FlatList, StyleSheet, Platform, ScrollView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { MUTED_GRAY, PRIMARY_BLUE } from '../../AuthScreens/SuperAdmin/styles';
import { widthPercentageToDP } from 'react-native-responsive-screen';
import DatePicker from "react-native-modern-datepicker";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createSong as apiCreateSong, deleteSong as apiDeleteSong, listSongs as apiListSongs, SongDoc, updateSong as apiUpdateSong } from '../../../api/songs';


const mockSongs: any[] = [];
type urlType = string;
const years = Array.from({ length: 100 }, (_, i) => (1980 + i).toString());


const SongsScreen = ({ navigation, route }: any) => {
  const readOnlySuperAdmin = route?.params?.readOnlySuperAdmin;
  const [token, setToken] = useState<string|undefined>();
  const [profile, setProfile] = useState<any>(null);
  const [songs, setSongs] = useState(mockSongs);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [title, setTitle] = useState('');
  const [releaseDate, setReleaseDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [composer, setComposer] = useState('');
  const [vocalLeads, setVocalLeads] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const openLink = (url: urlType) => {
    Linking.openURL(url);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || releaseDate;
    setShowDatePicker(Platform.OS === 'ios');
    setReleaseDate(currentDate);
  };

  useEffect(()=>{ (async()=>{ try{ const t1 = await AsyncStorage.getItem('token'); const t2 = t1 ? null : await AsyncStorage.getItem('auth_token'); const tk = (t1 || (t2 as any)) || undefined; setToken(tk); const raw = await AsyncStorage.getItem('user'); setProfile(raw? JSON.parse(raw): null); if(tk){ const res = await apiListSongs(tk); const mapped = (res.songs||[]).map((s: SongDoc)=>({ id: s._id, title: s.title, releaseDate: s.releaseDate ? new Date(s.releaseDate).toLocaleString('default', { month: 'long', year: 'numeric' }) : '', composer: s.composer||'', vocalLeads: s.vocalLeads||'', link: s.link||'', description: s.description||'' })); setSongs(mapped); } } catch(e){} })(); },[]);
  const addSong = async () => {
    if (readOnlySuperAdmin) return; // block in read-only mode
    if (!token) return;
    if (!title || !composer) return;
    const iso = releaseDate.toISOString();
    try {
      setSubmitting(true);
      if (editingSongId) {
        const res = await apiUpdateSong(editingSongId, { title, composer, vocalLeads, link, description, releaseDate: iso }, token);
        if(res?.ok && res.song){
          const s = res.song;
          const formattedDate = s.releaseDate ? new Date(s.releaseDate).toLocaleString('default', { month: 'long', year: 'numeric' }) : '';
          const updated = { id: s._id, title: s.title, releaseDate: formattedDate, composer: s.composer||'', vocalLeads: s.vocalLeads||'', link: s.link||'', description: s.description||'' };
          setSongs(prev => prev.map(item => item.id === updated.id ? updated : item));
        }
      } else {
        const res = await apiCreateSong({ title, composer, vocalLeads, link, description, releaseDate: iso }, token);
        if(res?.ok && res.song){
          const s = res.song;
          const formattedDate = s.releaseDate ? new Date(s.releaseDate).toLocaleString('default', { month: 'long', year: 'numeric' }) : '';
          const newSong = { id: s._id, title: s.title, releaseDate: formattedDate, composer: s.composer||'', vocalLeads: s.vocalLeads||'', link: s.link||'', description: s.description||'' };
          setSongs([newSong, ...songs]);
        }
      }
      setAddModalVisible(false);
      setEditingSongId(null);
      setTitle(''); setReleaseDate(new Date()); setComposer(''); setVocalLeads(''); setDescription(''); setLink('');
    } catch(e){}
    finally { setSubmitting(false); }
  };

  const confirmDelete = (id: string) => {
    if (readOnlySuperAdmin) return;
    setSelectedSongId(id);
    setDeleteModalVisible(true);
  };

  const deleteSong = async () => {
    if (readOnlySuperAdmin) return;
    if (!token) return;
    if (selectedSongId) {
      try { await apiDeleteSong(String(selectedSongId), token); } catch(e){}
      setSongs(songs.filter((song) => song.id !== selectedSongId));
    }
    setDeleteModalVisible(false); setSelectedSongId(null);
  };

  const renderSongItem = ({ item }: { item: typeof mockSongs[0] }) => (
    <View style={styles.songItem}>
      <Text style={styles.songTitle}>{item.title}</Text>
      <Text style={styles.songDate}>{item.releaseDate}</Text>
      <Text style={styles.label}>Composer</Text>
      <Text style={styles.value}>{item.composer}</Text>
      <Text style={styles.label}>Vocal Lead(s)</Text>
      <Text style={styles.value}>{item.vocalLeads}</Text>
      {!!item.description && (<>
        <Text style={styles.label}>Description</Text>
        <Text style={styles.value}>{item.description}</Text>
      </>)}
      <TouchableOpacity onPress={() => openLink(item.link)}>
        <Text style={styles.link}>{item.link}</Text>
      </TouchableOpacity>
      <View style={styles.songActions}>
        <TouchableOpacity onPress={() => confirmDelete(item.id)} style={styles.actionIcon}>
          <MaterialIcons name="delete" size={20} color="red" />
        </TouchableOpacity>
  <TouchableOpacity style={styles.actionIcon} onPress={() => { setEditingSongId(String(item.id)); setTitle(item.title); setComposer(item.composer); setVocalLeads(item.vocalLeads); setLink(item.link); setDescription(item.description||''); setShowDatePicker(false); setAddModalVisible(true); }}>
          <FontAwesome name="pencil" size={20} color={PRIMARY_BLUE} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={{ width: widthPercentageToDP(106), height: 10, backgroundColor: PRIMARY_BLUE, position: 'relative', left: - widthPercentageToDP(5), right: 0, top: 0 }}></View>
      <View style={styles.titleContainer}>
        <View style={styles.titleWithIcon}>
          <Ionicons name="musical-notes" size={30} color="#c72b2bff" style={styles.titleIcon} />
          <Text style={styles.title}>Songs Released</Text>
        </View>
        <TouchableOpacity
          style={{
            borderWidth: 1.5,
            borderColor: PRIMARY_BLUE,
            borderRadius: 10,
            padding: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginLeft: 10,
          }}
          onPress={() => setShowYearPicker(true)}
        >
          <Text style={{ fontSize: 15, fontWeight: "600",marginRight:5, color: "#333" }}>
            {year || "Select Year"}
          </Text>
          <Ionicons name="calendar-outline" size={15} color={"#999"} />
        </TouchableOpacity>

        {showYearPicker && (

          <Modal transparent>
            <View style={{ flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)" }}>
              <View style={{ backgroundColor: "#fff", borderRadius: 10, padding: 20, margin: 20 }}>
                <FlatList
                  data={years}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => { setYear(item); setShowYearPicker(false); }}>
                      <Text style={{ fontSize: 18, padding: 10 }}>{item}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>
          </Modal>

        )}

      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
        <TextInput placeholder="Search by name" style={styles.searchInput} />
      </View>

      <Text style={styles.totalSongs}>{"1"} Total Songs Released in 2025</Text>

      {(!readOnlySuperAdmin && (profile?.activeRole==='UnitLeader' || profile?.activeRole==='SuperAdmin')) && (
        <TouchableOpacity style={styles.addButton} onPress={() => setAddModalVisible(true)}>
          <Text style={styles.addButtonText}>Add New</Text>
        </TouchableOpacity>
      )}

      <View style={styles.latestHeader}>
        <Text style={styles.latestTitle}>Latest Song</Text>
        <Text style={styles.seeAll}>See All</Text>
      </View>

      <FlatList
        data={songs.slice(0, 1)}
        renderItem={renderSongItem}
        keyExtractor={(item) => item.id}
        style={styles.songList}
      />

  {(!readOnlySuperAdmin && (profile?.activeRole==='UnitLeader' || profile?.activeRole==='SuperAdmin')) && (
  <Modal visible={addModalVisible} animationType="slide" transparent={false}>
        <ScrollView style={styles.modalContainer}>
          <TouchableOpacity style={styles.closeButton} onPress={() => setAddModalVisible(false)}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Song Title</Text>
          <TextInput style={styles.input} placeholder="Enter title" value={title} onChangeText={setTitle} />
          <Text style={styles.modalTitle}>Release Date</Text>
          <TouchableOpacity style={styles.dateInput} onPress={() => setShowDatePicker(true)}>
            <Text>{releaseDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</Text>
            <Ionicons name="calendar" size={20} color="#8E8E93" />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={releaseDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
            />
          )}
          <Text style={styles.modalTitle}>Composer</Text>
          <TextInput style={styles.input} placeholder="Enter name" value={composer} onChangeText={setComposer} />
          <Text style={styles.modalTitle}>Vocal Lead(s)</Text>
          <TextInput style={styles.input} placeholder="" value={vocalLeads} onChangeText={setVocalLeads} />
          <Text style={styles.modalTitle}>Brief Description</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="Type something..."
            multiline
            value={description}
            onChangeText={setDescription}
          />
          <Text style={styles.modalTitle}>Link to Song (YouTube, etc.)</Text>
          <TextInput style={styles.input} placeholder="Enter URL" value={link} onChangeText={setLink} />
          <TouchableOpacity style={[styles.submitButton, submitting && { opacity: 0.7 }]} disabled={submitting} onPress={addSong}>
            <Text style={styles.submitButtonText}>{submitting ? (editingSongId ? 'Updating...' : 'Submitting...') : (editingSongId ? 'Update' : 'Submit')}</Text>
          </TouchableOpacity>
        </ScrollView>
  </Modal>
  )}

  {(!readOnlySuperAdmin && (profile?.activeRole==='UnitLeader' || profile?.activeRole==='SuperAdmin')) && (
  <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <Text style={styles.deleteText}>Are you sure you want to delete this song?</Text>
            <View style={styles.deleteButtons}>
              <TouchableOpacity style={styles.confirmButton} onPress={deleteSong}>
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setDeleteModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
  </Modal>
  )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 40,
  },
  header: {
    paddingTop: 2,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: 18,
    fontWeight: '400',
    marginLeft: 4,
    color: '#000',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  titleIcon: {
    marginRight: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  yearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  yearText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginRight: 4,
  },
  yearIcon: {
    marginLeft: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    padding: 6,
    borderRadius: 10,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  totalSongs: {
    fontSize: 16,
    color: '#575757ff',
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: PRIMARY_BLUE,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginLeft: widthPercentageToDP(55),
    marginBottom: 20,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  latestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  latestTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  seeAll: {
    fontSize: 16,
    color: PRIMARY_BLUE,
  },
  songList: {
    flex: 1,
  },
  songItem: {
    backgroundColor: '#F9F9F9',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PRIMARY_BLUE,
    marginBottom: 20,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  songDate: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: PRIMARY_BLUE,
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    marginBottom: 12,
  },
  link: {
    fontSize: 14,
    color: '#ff00aaff',
    marginBottom: 12,
  },
  songActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 24,
  },
  actionIcon: {
    padding: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 24,
  },
  closeButton: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: PRIMARY_BLUE,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  deleteModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  deleteModalContent: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    width: '80%',
    alignItems: 'center',
  },
  deleteText: {
    fontSize: 16,
    color: '#000',
    marginBottom: 20,
    textAlign: 'center',
  },
  deleteButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  confirmButton: {
    backgroundColor: PRIMARY_BLUE,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  confirmButtonText: {
    color: '#000',
    fontSize: 16,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  cancelButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
});

export default SongsScreen;