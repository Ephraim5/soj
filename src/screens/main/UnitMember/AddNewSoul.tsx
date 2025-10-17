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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { useSoulsStore } from '../../../context/SoulsStore';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  AddNewSoul: undefined;
  PeopleInvited: undefined;
};

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'AddNewSoul'
>;

interface AddNewSoulProps {
  visible: boolean;
  onClose: () => void;
}

const AddNewSoul: React.FC<AddNewSoulProps> = ({ visible, onClose }) => {
  const navigation = useNavigation<NavigationProp>();
  const { addSoul } = useSoulsStore();

  const [selectedGender, setSelectedGender] = useState('');
  const [selectedAge, setSelectedAge] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handlePeopleInvited = () => {
    navigation.navigate('PeopleInvited');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="white" />

        <View style={styles.header}>
          <Text style={styles.headerTitle}>Add New Soul</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Icon name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form}>
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Name of Soul</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter name"
              placeholderTextColor="#999"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Where You Won Him/Her</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter Location"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Gender</Text>
            <TouchableOpacity style={styles.pickerButton}>
              <Text style={styles.pickerText}>Select</Text>
              <Icon name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Age Range</Text>
            <TouchableOpacity style={styles.pickerButton}>
              <Text style={styles.pickerText}>0-15</Text>
              <Icon name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>How Did You Invite Him/Her</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Type something..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

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

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Date</Text>
            <TouchableOpacity style={styles.dateButton}>
              <Icon name="calendar" size={20} color="#349DC5" />
              <Text style={styles.dateText}>June 30, 2025</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, submitting && { opacity: 0.6 }]}
            disabled={submitting}
            onPress={async () => {
              if (!name.trim()) { Toast.show({ type:'error', text1:'Name required'}); return; }
              try {
                setSubmitting(true);
                await addSoul({ name: name.trim(), phone: phone.trim()||undefined });
                Toast.show({ type:'success', text1:'Soul added'});
                onClose();
              } catch(e:any) {
                Toast.show({ type:'error', text1:'Failed', text2:e?.message||'Could not add' });
              } finally { setSubmitting(false); }
            }}
          >
            <Text style={styles.submitButtonText}>{submitting? 'Saving...':'Submit'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  form: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
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
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#f8f8f8',
  },
  pickerText: {
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
  dateText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 10,
  },
  submitButton: {
    backgroundColor: '#349DC5',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddNewSoul;
