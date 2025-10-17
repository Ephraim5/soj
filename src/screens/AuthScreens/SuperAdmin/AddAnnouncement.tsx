import { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import uuid from "react-native-uuid";
import { styles } from "./styles";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { createAnnouncement } from '../../../api/announcements';

type RootStackParamList = {
  EventAndAnnouncement: undefined;
  AddEvent: undefined;
  AddAnnouncement: undefined;
};
type NavProp = NativeStackNavigationProp<RootStackParamList, "AddAnnouncement">;

export default function AddAnnouncementScreen() {
  const navigation = useNavigation<NavProp>();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetAudience, setTargetAudience] = useState("");

  async function onSend() {
    try {
      // Optimistic local cache update
      const stored = await AsyncStorage.getItem('unitOverview');
      let data = stored ? JSON.parse(stored) : { events: [], announcements: [] };
      const optimistic = {
        id: uuid.v4().toString(),
        title,
        message,
        targetAudience,
        date: new Date().toLocaleString(),
      };
      data.announcements = [optimistic, ...(data.announcements || [])];
      await AsyncStorage.setItem('unitOverview', JSON.stringify(data));
      // Server create
      await createAnnouncement({ title, message, targetAudience });
      navigation.goBack();
    } catch (err) {
      console.log('Error saving announcement:', err);
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
        <Text style={styles.headerTitle}>Add Announcement</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.inputLabel}>Title</Text>
        <TextInput
          placeholder="E.g., Important Church Update"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
        />

        <Text style={styles.inputLabel}>Message</Text>
        <TextInput
          placeholder="Enter the full announcement"
          value={message}
          onChangeText={setMessage}
          style={[styles.input, styles.textarea]}
          multiline
        />

        <Text style={styles.inputLabel}>Target Audience</Text>
        <TextInput
          placeholder="E.g., Youth Department, All Members"
          value={targetAudience}
          onChangeText={setTargetAudience}
          style={styles.input}
        />

        <View style={{ height: 28 }} />
        <TouchableOpacity style={styles.saveButton} onPress={onSend}>
          <Text style={styles.saveButtonText}>Send Now</Text>
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
