import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  SafeAreaView,
  ScrollView,
  Animated,
  Dimensions,
  StyleSheet
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { listEvents, deleteEvent as apiDeleteEvent } from '../../../api/events';
import { listAnnouncements, updateAnnouncement as apiUpdateAnnouncement, deleteAnnouncement as apiDeleteAnnouncement } from '../../../api/announcements';
import { PRIMARY_BLUE, styles } from "./styles";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Icon } from "react-native-elements";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { BlurView } from "expo-blur";

const { width, height } = Dimensions.get("window");

type RootStackParamList = {
  Home: undefined;
  AddEvent: undefined;
  AddAnnouncement: undefined;
  Dashboard: undefined;
};
type NavProp = NativeStackNavigationProp<RootStackParamList, "Home">;

type EventItem = {
  id: string;
  title: string;
  date: string;
  venue?: string;
  description?: string;
  tags?: string[];
  status?: "Upcoming" | "Past";
};

type AnnouncementItem = {
  id: string;
  title: string;
  message: string;
  targetAudience?: string;
  date: string;
};

const defaultEvents: EventItem[] = [
  {
    id: "1",
    title: "Holy Ghost Service",
    date: "June 15, 2025, 5:00 PM",
    venue: "Main Auditorium, Streams of Joy Umuahia",
    description: "A special night of worship and miracles.",
    tags: ["Church-wide", "Special Program", "NSPPD"],
    status: "Upcoming",
  },
  {
    id: "2",
    title: "Blessings Service",
    date: "June 16, 2025, 5:00 PM",
    venue: "Main Auditorium, Streams of Joy Umuahia",
    description: "A special evening for God to release more to men.",
    tags: ["Church-wide", "Special Program", "NSPPD"],
    status: "Upcoming",
  },
];

const defaultAnnouncements: AnnouncementItem[] = [
  {
    id: "a1",
    title: "Welcome Service",
    message: "Join us for our special welcome service this Sunday.",
    targetAudience: "All Members",
    date: "June 10, 2025, 5:00 PM",
  },
];

const tagColors = ["#a05eacff", "#349DC5", "#3f2691ff"];

export default function EventsAnnouncementsScreen() {
  const navigation = useNavigation<NavProp>();

  const [activeTab, setActiveTab] = useState<"Events" | "Announcements">("Events");
  const [query, setQuery] = useState("");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);

  // Modal states
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [editItem, setEditItem] = useState<AnnouncementItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [editAudience, setEditAudience] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [eventDeleteId, setEventDeleteId] = useState<string | null>(null);
  const scaleAnim = useState(new Animated.Value(0.8))[0];
  const fadeAnim = useState(new Animated.Value(0))[0];

  // Load from API then cache locally (keep UI the same)
  useEffect(() => {
    (async () => {
      try {
        // Load local first for fast paint
        const stored = await AsyncStorage.getItem('unitOverview');
        if (stored) {
          const parsed = JSON.parse(stored);
          setEvents(parsed.events || []);
          setAnnouncements(parsed.announcements || []);
        } else {
          await AsyncStorage.setItem('unitOverview', JSON.stringify({ events: defaultEvents, announcements: defaultAnnouncements }));
          setEvents(defaultEvents);
          setAnnouncements(defaultAnnouncements);
        }
        // Then fetch server
        const [ev, an] = await Promise.allSettled([listEvents(), listAnnouncements()]);
        const mappedEvents = ev.status === 'fulfilled' ? (ev.value || []).map((e:any)=>({
          id: e._id,
          title: e.title,
          date: e.date ? new Date(e.date).toLocaleString() : '',
          venue: e.venue,
          description: e.description,
          tags: e.tags || [],
          status: e.status || 'Upcoming',
        })) : [];
        const mappedAnnouncements = an.status === 'fulfilled' ? (an.value || []).map((a:any)=>({
          id: a._id,
          title: a.title,
          message: a.body,
          targetAudience: a.targetAudience,
          date: a.createdAt ? new Date(a.createdAt).toLocaleString() : '',
        })) : [];
        if (mappedEvents.length || mappedAnnouncements.length) {
          setEvents(mappedEvents);
          setAnnouncements(mappedAnnouncements);
          await AsyncStorage.setItem('unitOverview', JSON.stringify({ events: mappedEvents, announcements: mappedAnnouncements }));
        }
      } catch (err) {
        console.log('Error loading events/announcements:', err);
      }
    })();
  }, []);

  // Refresh on focus
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", async () => {
      try {
        const [ev, an] = await Promise.allSettled([listEvents(), listAnnouncements()]);
        const mappedEvents = ev.status === 'fulfilled' ? (ev.value || []).map((e:any)=>({
          id: e._id,
          title: e.title,
          date: e.date ? new Date(e.date).toLocaleString() : '',
          venue: e.venue,
          description: e.description,
          tags: e.tags || [],
          status: e.status || 'Upcoming',
        })) : [];
        const mappedAnnouncements = an.status === 'fulfilled' ? (an.value || []).map((a:any)=>({
          id: a._id,
          title: a.title,
          message: a.body,
          targetAudience: a.targetAudience,
          date: a.createdAt ? new Date(a.createdAt).toLocaleString() : '',
        })) : [];
        if (mappedEvents.length || mappedAnnouncements.length) {
          setEvents(mappedEvents);
          setAnnouncements(mappedAnnouncements);
          await AsyncStorage.setItem('unitOverview', JSON.stringify({ events: mappedEvents, announcements: mappedAnnouncements }));
        }
      } catch {}
    });
    return unsubscribe;
  }, [navigation]);

  async function saveAnnouncements(updated: AnnouncementItem[]) {
    try {
      const stored = await AsyncStorage.getItem("unitOverview");
      const parsed = stored ? JSON.parse(stored) : { events: [], announcements: [] };
      parsed.announcements = updated;
      await AsyncStorage.setItem("unitOverview", JSON.stringify(parsed));
      setAnnouncements(updated);
    } catch (err) {
      console.log("Error saving announcements:", err);
    }
  }

  // Modal animations
  function animateIn() {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
  }
  function animateOut(callback: () => void) {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 0.8, friction: 5, useNativeDriver: true }),
    ]).start(() => callback());
  }

  function openEditModal(item: AnnouncementItem) {
    setEditItem(item);
    setEditTitle(item.title);
    setEditMessage(item.message);
    setEditAudience(item.targetAudience || "");
    setIsEditModalVisible(true);
    animateIn();
  }
  function closeEditModal() {
    animateOut(() => setIsEditModalVisible(false));
  }
  function saveEdit() {
    if (editItem) {
      const updated = announcements.map((a) =>
        a.id === editItem.id
          ? { ...a, title: editTitle, message: editMessage, targetAudience: editAudience }
          : a
      );
      saveAnnouncements(updated);
      // push to server (best-effort)
      apiUpdateAnnouncement(editItem.id, { title: editTitle, message: editMessage, targetAudience: editAudience }).catch(()=>{});
      closeEditModal();
    }
  }

  function openDeleteModal(id: string) {
    setDeleteId(id);
    setIsDeleteModalVisible(true);
    animateIn();
  }
  function openEventDelete(id: string){
    setEventDeleteId(id);
    setIsDeleteModalVisible(true);
    animateIn();
  }
  function closeDeleteModal() {
    animateOut(() => { setIsDeleteModalVisible(false); setDeleteId(null); setEventDeleteId(null); });
  }
  async function confirmDelete() {
    if (deleteId) {
      const updated = announcements.filter((a) => a.id !== deleteId);
      saveAnnouncements(updated);
      apiDeleteAnnouncement(deleteId).catch(()=>{});
      closeDeleteModal();
      return;
    }
    if (eventDeleteId) {
      // optimistic remove event
      const updatedEvents = events.filter(e => e.id !== eventDeleteId);
      setEvents(updatedEvents);
      try {
        const stored = await AsyncStorage.getItem('unitOverview');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.events = updatedEvents;
          await AsyncStorage.setItem('unitOverview', JSON.stringify(parsed));
        }
      } catch {}
      apiDeleteEvent(eventDeleteId).catch(()=>{});
      closeDeleteModal();
    }
  }

  const filteredEvents = events.filter((e) =>
    `${e.title} ${e.venue ?? ""} ${e.description ?? ""}`.toLowerCase().includes(query.toLowerCase())
  );
  const filteredAnnouncements = announcements.filter((a) =>
    `${a.title} ${a.message} ${a.targetAudience ?? ""}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  function renderEventCard({ item }: { item: EventItem }) {
    return (
      <TouchableOpacity onLongPress={()=> openEventDelete(item.id)} delayLongPress={400} style={styles.card}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.subText}>📅 {item.date}</Text>
        <Text style={styles.subText}>
          <Icon name="location-on" size={15} color="#FF3B30" /> {item.venue}
        </Text>
        <Text style={styles.cardDescription}>{item.description}</Text>
        <View style={styles.tagRow}>
          {(item.tags ?? []).map((t, index) => (
            <View key={t} style={[styles.tag, { backgroundColor: tagColors[index] }]}>
              <Text style={styles.tagText}>{t}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.statusText}>
          Status: <Text style={styles.statusLabel}>{item.status}</Text>
        </Text>
        <Text style={{ marginTop:6, fontSize:11, color:'#6b7280' }}>Long press to delete</Text>
      </TouchableOpacity>
    );
  }

  function renderAnnouncementCard({ item }: { item: AnnouncementItem }) {
    return (
      <View style={styles.announcementCard}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardDescription}>{item.message}</Text>
        <Text style={styles.subText}>📅 {item.date}</Text>
        {item.targetAudience && (
          <Text style={styles.subText}>
            <Icon name="group" size={15} color="#FF3B30" /> {item.targetAudience}
          </Text>
        )}
        <View style={styles.announcementActions}>
          <TouchableOpacity
            style={styles.announcementEdit}
            onPress={() => openEditModal(item)}
          >
            <Text style={{ color: "#fff" }}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.announcementDelete}
            onPress={() => openDeleteModal(item.id)}
          >
            <Text style={{ color: "#fff" }}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAwareScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        enableOnAndroid
        extraScrollHeight={80}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backChevron}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Events & Announcements</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity onPress={() => setActiveTab("Events")}>
            <Text
              style={[
                styles.tabText,
                activeTab === "Events" ? styles.tabActiveText : styles.tabInactiveText,
              ]}
            >
              Events
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab("Announcements")}>
            <Text
              style={[
                styles.tabText,
                activeTab === "Announcements"
                  ? styles.tabActiveText
                  : styles.tabInactiveText,
              ]}
            >
              Announcements
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <TextInput
            placeholder={
              activeTab === "Events"
                ? "Find events by name, date, or category"
                : "Find announcements by date, sender, or type"
            }
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
          />
        </View>

        {/* List */}
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {activeTab === "Events" ? (
            <FlatList
              data={filteredEvents}
              keyExtractor={(i) => i.id}
              renderItem={renderEventCard}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            />
          ) : (
            <FlatList
              data={filteredAnnouncements}
              keyExtractor={(i) => i.id}
              renderItem={renderAnnouncementCard}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            />
          )}
        </ScrollView>

        {/* Add button */}
        <View style={styles.footer}>
          {activeTab === "Events" ? (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate("AddEvent")}
            >
              <Text style={styles.actionButtonText}>+ Add New Event</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate("AddAnnouncement")}
            >
              <Text style={styles.actionButtonText}>+ Add New Announcement</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAwareScrollView>

      {/* Edit Modal */}
      {isEditModalVisible && (
        <Animated.View style={[stylesModel.overlay, { opacity: fadeAnim }]}>
          <BlurView intensity={50} tint="dark" style={{ ...StyleSheet.absoluteFillObject }} />
          <Animated.View style={[stylesModel.modalCard, { transform: [{ scale: scaleAnim }] }]}>
            <Text style={stylesModel.modalTitle}>Edit Announcement</Text>
            <TextInput
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Title"
              style={[styles.input,{marginVertical:5}]}
            />
            <TextInput
              value={editMessage}
              onChangeText={setEditMessage}
              placeholder="Message"
              style={[[styles.input,{marginVertical:5}], { height: 80 }]}
              multiline
            />
            <TextInput
              value={editAudience}
              onChangeText={setEditAudience}
              placeholder="Target Audience"
              style={[styles.input,{marginVertical:5}]}
            />
            <View style={stylesModel.modalButtons}>
              <TouchableOpacity style={stylesModel.cancelBtn} onPress={closeEditModal}>
                <Text style={stylesModel.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={stylesModel.saveBtn} onPress={saveEdit}>
                <Text style={stylesModel.saveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      )}

      {/* Delete Modal */}
      {isDeleteModalVisible && (
        <Animated.View style={[stylesModel.overlay, { opacity: fadeAnim }]}>
          <BlurView intensity={50} tint="dark" style={{ ...StyleSheet.absoluteFillObject }} />
          <Animated.View style={[stylesModel.modalCard, { transform: [{ scale: scaleAnim }] }]}>
            <Text style={stylesModel.modalTitle}>{deleteId ? 'Delete Announcement?' : 'Delete Event?'}</Text>
            <Text style={{ color: "#666", marginBottom: 20 }}>
              {deleteId ? 'Are you sure you want to delete this announcement?' : 'Are you sure you want to delete this event?'}
            </Text>
            <View style={stylesModel.modalButtons}>
              <TouchableOpacity style={stylesModel.cancelBtn} onPress={closeDeleteModal}>
                <Text style={stylesModel.cancelText}>No</Text>
              </TouchableOpacity>
              <TouchableOpacity style={stylesModel.deleteBtn} onPress={confirmDelete}>
                <Text style={stylesModel.deleteText}>Yes</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const stylesModel = StyleSheet.create({
  overlay: {
    position: "absolute",
    width,
    height,
    top: 0,
    left: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 99,
  },
  modalCard: {
    width: width * 0.85,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    elevation: 6,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 16, color: "#111" },
  modalButtons: { flexDirection: "row", justifyContent: "flex-end", marginTop: 8 },
  cancelBtn: { paddingVertical: 8, paddingHorizontal: 16, marginRight: 10 },
  saveBtn: {
    backgroundColor:PRIMARY_BLUE,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  deleteBtn: {
    backgroundColor: "#FF3B30",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelText: { color: "#555", fontSize: 14 },
  saveText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  deleteText: { color: "#fff", fontWeight: "600", fontSize: 14 },
});
