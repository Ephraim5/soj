import  { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MUTED_GRAY, PRIMARY_BLUE, styles } from "./styles";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import uuid from "react-native-uuid";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import moment from "moment";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
// Dropdown removed; using chip-based free text entry for event types (max 3)
import { createEvent } from '../../../api/events';
import { AppEventBus } from '../../../components/AppBootstrapGate';

interface Option {
  label: string;
  value: string[];
}


type RootStackParamList = {
  EventAndAnnouncement: undefined;
  AddEvent: undefined;
  AddAnnouncement: undefined;
};
type NavProp = NativeStackNavigationProp<RootStackParamList, "AddEvent">;


export default function AddEventScreen() {
  const navigation = useNavigation<NavProp>();
  const [title, setTitle] = useState("");
  // dateTime: human readable display, dateISO: canonical stored value
  const [dateTime, setDateTime] = useState("");
  const [dateISO, setDateISO] = useState("");
  const [venue, setVenue] = useState("");
  const [description, setDescription] = useState("");
  const [sendReminder, setSendReminder] = useState(true);
  const [eventTypeArray, setEventTypeArray] = useState<string[]>([]); // tags
  const [eventTypeInput, setEventTypeInput] = useState('');

  const [isPickerVisible, setPickerVisible] = useState(false);

  const showPicker = () => setPickerVisible(true);
  const hidePicker = () => setPickerVisible(false);

  const handleConfirm = (date: Date) => {
    // Display friendly format but retain canonical ISO for storage/filtering
    setDateTime(moment(date).format("YYYY-MM-DD HH:mm"));
    try { setDateISO(date.toISOString()); } catch { setDateISO(moment(date).toISOString()); }
    hidePicker();
  };
  async function onSave() {
    try {
      // Optimistic local cache update
      const stored = await AsyncStorage.getItem('unitOverview');
      let events: any[] = [];
      if (stored) { try { const parsed = JSON.parse(stored); events = parsed.events || []; } catch {} }
      const finalISO = dateISO || (dateTime ? moment(dateTime, 'YYYY-MM-DD HH:mm').toDate().toISOString() : '');
      const generatedId = uuid.v4().toString();
      const optimistic = {
        id: generatedId,
        _id: generatedId,
        title,
        date: finalISO,
        venue,
        description,
        tags: eventTypeArray ? [...eventTypeArray] : [],
        status: 'Upcoming',
      };
      await AsyncStorage.setItem('unitOverview', JSON.stringify({ events: [...events, optimistic] }));
      // Server create
      let created = null;
      try {
        // decide visibility based on current actor
        const rawUser = await AsyncStorage.getItem('user');
        let visibility: 'ministry' | 'church' = 'church';
        if (rawUser) {
          try {
            const u = JSON.parse(rawUser);
            if (u?.activeRole === 'MinistryAdmin' || (u?.roles||[]).some((r:any)=>r.role==='MinistryAdmin')) visibility = 'ministry';
          } catch {}
        }
        const resp = await createEvent({ title, venue, description, date: finalISO, eventType: eventTypeArray.join(', '), tags: eventTypeArray, reminder: sendReminder, status: 'Upcoming', visibility });
        // attempt to normalize created event shape
        created = resp?.event || resp?.item || resp?.data || resp;
        if (created) {
          if (!created.date) created.date = finalISO;
          if (!created._id && created.id) created._id = created.id;
          if (!created._id) created._id = generatedId;
        }
      } catch(e) {
        // swallow; optimistic already stored
      }
      AppEventBus.emit('eventsChanged', { action: 'created', event: created || optimistic });
      navigation.goBack();
    } catch (err) {
      console.log('Error saving event:', err);
      navigation.goBack();
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAwareScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        enableOnAndroid
        extraScrollHeight={80} // push content above keyboard
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backChevron}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Event</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={styles.inputLabel}>Event Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Enter title"
            style={styles.input}
          />

          <Text style={styles.inputLabel}>Date & Time</Text>
          <TouchableOpacity onPress={showPicker}>
            <View pointerEvents="none">
              <TextInput
                value={dateTime}
                placeholder="Select date & time"
                style={styles.input}
                editable={false}
              />
            </View>
          </TouchableOpacity>

          <Text style={styles.inputLabel}>Venue</Text>
          <TextInput
            value={venue}
            onChangeText={setVenue}
            placeholder="Enter venue"
            style={styles.input}
          />

          <Text style={styles.inputLabel}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Type Description"
            style={[styles.input, styles.textarea]}
            multiline
          />

          <Text style={styles.inputLabel}>Event Types (max 3)</Text>
          <View style={{ flexDirection:'row', flexWrap:'wrap', marginBottom:8 }}>
            {eventTypeArray.map(t => (
              <View key={t} style={{ flexDirection:'row', alignItems:'center', backgroundColor:'#e2f4fa', paddingHorizontal:12, paddingVertical:6, borderRadius:20, marginRight:8, marginBottom:8 }}>
                <Text style={{ fontSize:12, fontWeight:'600', color:'#0f172a' }}>{t}</Text>
                <TouchableOpacity onPress={()=> setEventTypeArray(arr=> arr.filter(x=>x!==t))} style={{ marginLeft:6, padding:2 }}>
                  <Ionicons name="close" size={14} color="#334155" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
          <TextInput
            value={eventTypeInput}
            onChangeText={setEventTypeInput}
            placeholder={eventTypeArray.length >= 3 ? 'Maximum 3 types reached' : 'Type an event type and press Enter'}
            style={[styles.input, eventTypeArray.length >=3 && { opacity:0.6 }]}
            editable={eventTypeArray.length < 3}
            onSubmitEditing={()=> {
              const val = eventTypeInput.trim();
              if(!val) return;
              setEventTypeArray(prev => prev.includes(val) ? prev : [...prev, val].slice(0,3));
              setEventTypeInput('');
            }}
            blurOnSubmit={false}
          />
          <View style={styles.rowBetween}>
            <Text style={styles.inputLabel}><Ionicons name="megaphone" size={18} color={PRIMARY_BLUE} />   Send Reminder Notification</Text>
            <Switch value={sendReminder} thumbColor={PRIMARY_BLUE} onValueChange={setSendReminder} />
          </View>

          <View style={{ height: 28 }} />
          <DateTimePickerModal
            isVisible={isPickerVisible}
            mode="datetime"
            onConfirm={handleConfirm}
            onCancel={hidePicker}
            accentColor={PRIMARY_BLUE}
          />
          <TouchableOpacity style={styles.saveButton} onPress={onSave}>
            <Text style={styles.saveButtonText}>Save & Publish</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}