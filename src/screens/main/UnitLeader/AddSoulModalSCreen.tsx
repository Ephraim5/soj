import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useSoulsStore } from '../../../context/SoulsStore';
import type { AddSoulInput } from '../../../api/souls';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Dropdown } from 'react-native-element-dropdown';

type AddSoulModalProps = {
  visible: boolean;
  onClose: () => void;
};

const AddSoulModal: React.FC<AddSoulModalProps> = ({ visible, onClose }) => {
  const [selectedGender, setSelectedGender] = useState<string>('');
  const [selectedAge, setSelectedAge] = useState<string>('');
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [inviteHow, setInviteHow] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { addSoul } = useSoulsStore();

  const onChangeDate = (event: any, selectedDate?: Date) => {
    setShowPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  // Dropdown options
  const genderOptions = [
    { label: 'Male', value: 'Male' },
    { label: 'Female', value: 'Female' },
  ];

  const ageOptions = Array.from({ length: 8 }, (_, i) => {
    const start = i * 10;
    const end = start + 10;
    if (end >= 70) {
      return {
        label: '70 - above',
        value: '70+',
      };
    }
    return {
      label: `${start}-${end - 1}`,
      value: `${start}-${end - 1}`,
    };
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="white" />

        <View style={styles.header}>
          <Text style={styles.headerTitle}>Add Soul</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Icon name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form}>
          {/* Name */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Name </Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter full name"
              placeholderTextColor="#999"
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Location */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Where You Won Him/Her</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter Location"
              placeholderTextColor="#999"
              value={location}
              onChangeText={setLocation}
            />
          </View>

          {/* Gender */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Gender</Text>
            <Dropdown
              style={styles.dropdown}
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
              data={genderOptions}
              labelField="label"
              valueField="value"
              placeholder="Select"
              value={selectedGender}
              onChange={item => setSelectedGender(item.value)}
            />
          </View>

          {/* Age */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Age Range</Text>
            <Dropdown
              style={styles.dropdown}
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
              data={ageOptions}
              labelField="label"
              valueField="value"
              placeholder="Select"
              value={selectedAge}
              onChange={item => setSelectedAge(item.value)}
            />
          </View>

          {/* Invite method */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>How Did You Invite Him/Her</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Type something..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={inviteHow}
              onChangeText={setInviteHow}
            />
          </View>

          {/* Phone */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Phone</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter phone number"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          {/* Date */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowPicker(true)}
            >
              <Icon name="calendar" size={20} color="#349DC5" />
              <Text style={styles.dateText}>
                {date.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </TouchableOpacity>

            {showPicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={onChangeDate}
              />
            )}
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitButton, submitting && { opacity: 0.6 }]}
            disabled={submitting}
            onPress={async () => {
              if (!name.trim()) { Toast.show({ type:'error', text1:'Name required' }); return; }
              setSubmitting(true);
              try {
                const payload: AddSoulInput = {
                  name: name.trim(),
                  phone: phone.trim() || undefined,
                  dateWon: date.toISOString(),
                  gender: selectedGender as any || undefined,
                  ageRange: selectedAge || undefined,
                  convertedThrough: inviteHow || undefined,
                  location: location || undefined,
                };
                const res = await addSoul(payload);
                if (res?.ok) {
                  Toast.show({ type:'success', text1:'Added', text2:'New soul has been recorded.' });
                  // reset
                  setName(''); setLocation(''); setInviteHow(''); setPhone(''); setSelectedGender(''); setSelectedAge('');
                  onClose();
                } else {
                  Toast.show({ type:'error', text1:'Failed', text2: res?.message || 'Could not add soul' });
                }
              } catch(e:any) {
                Toast.show({ type:'error', text1:'Error', text2: e?.response?.data?.message || e?.message || 'Network error' });
              } finally {
                setSubmitting(false);
              }
            }}
          >
            <Text style={styles.submitButtonText}>{submitting ? 'Submitting...' : 'Submit'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white', borderTopWidth:1, borderTopColor: '#e0e0e0',borderStyle: 'solid' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#333' },
  closeButton: { padding: 5 },
  form: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  fieldContainer: { marginBottom: 20 },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#f8f8f8',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#f8f8f8',
    minHeight: 100,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 15,
    backgroundColor: '#f8f8f8',
    height: 50,
  },
  placeholderStyle: {
    fontSize: 14,
    color: '#999',
  },
  selectedTextStyle: {
    fontSize: 14,
    color: '#333',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#f8f8f8',
  },
  dateText: { fontSize: 14, color: '#333', marginLeft: 10 },
  submitButton: {
    backgroundColor: '#349DC5',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  submitButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
});

export default AddSoulModal;
