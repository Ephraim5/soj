import  { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Define your navigation stack types
type RootStackParamList = {
  AddAdmin: undefined;
  AdminMembers: undefined;
};

// Define the navigation prop type
type AddAdminScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'AddAdmin'
>;

// Form state type
interface FormState {
  phone: string;
  title: string;
  firstName: string;
  middleName: string;
  surname: string;
}

export default function AddAdmin() {
  const navigation = useNavigation<AddAdminScreenNavigationProp>();

  const [form, setForm] = useState<FormState>({
    phone: '',
    title: '',
    firstName: '',
    middleName: '',
    surname: '',
  });

  const handleChange = <K extends keyof FormState>(
    name: K,
    value: FormState[K]
  ) => {
    setForm({ ...form, [name]: value });
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={28} color="#005c80" />
      </TouchableOpacity>

      <Text>{'                '}</Text>

      <ScrollView contentContainerStyle={styles.contentContainer}>
        <Text style={styles.heading}>Set Up Other Super Admins</Text>
        <Text style={styles.subText}>
          Enter the details of additional Super Admins.
        </Text>

        <Text style={styles.subTitle}>Phone Number</Text>
        <TextInput
          placeholder="Enter an 11 digit valid number"
          style={styles.input}
          keyboardType="phone-pad"
          maxLength={11}
          value={form.phone}
          onChangeText={(text) => handleChange('phone', text)}
        />

        <Text style={styles.subTitle}>Title</Text>
        <RNPickerSelect
          onValueChange={(value) => handleChange('title', value)}
          placeholder={{ label: 'Title', value: '' }}
          style={pickerSelectStyles}
          items={[
            { label: 'Mr', value: 'Mr' },
            { label: 'Mrs', value: 'Mrs' },
            { label: 'Miss', value: 'Miss' },
            { label: 'Dr', value: 'Dr' },
            { label: 'Pst', value: 'Pst' },
            { label: 'Sir', value: 'Sir' },
            { label: 'Prof', value: 'Prof' },
          ]}
        />

        <Text style={styles.subTitle}>First Name</Text>
        <TextInput
          placeholder="First Name"
          style={styles.input}
          value={form.firstName}
          onChangeText={(text) => handleChange('firstName', text)}
        />

        <Text style={styles.subTitle}>Middle Name</Text>
        <TextInput
          placeholder="Middle Name"
          style={styles.input}
          value={form.middleName}
          onChangeText={(text) => handleChange('middleName', text)}
        />

        <Text style={styles.subTitle}>Surname</Text>
        <TextInput
          placeholder="Surname"
          style={styles.input}
          value={form.surname}
          onChangeText={(text) => handleChange('surname', text)}
        />

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('AdminMembers')}
        >
          <Text style={styles.buttonText}>Save</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// Main styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 20,
    marginBottom: 10,
  },
  contentContainer: {
    padding: 20,
    paddingTop: 40,
    marginTop: 10,
  },
  heading: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: '#1E1E1E',
    marginBottom: 10,
  },
  subTitle: {
    fontSize: 13,
    color: '#555',
    marginBottom: 8,
    fontWeight: '400',
  },
  subText: {
    fontSize: 13,
    textAlign: 'center',
    color: '#555',
    marginBottom: 40,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 14,
    marginBottom: 15,
    fontSize: 14,
    backgroundColor: '#F9F9F9',
  },
  button: {
    backgroundColor: '#2AA7FF',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});

// Picker style
const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 13,
    paddingVertical: 5,
    paddingHorizontal: 5,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    color: 'black',
    paddingRight: 30,
    marginBottom: 15,
    backgroundColor: '#ebebeb',
  },
  inputAndroid: {
    fontSize: 14,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    color: 'black',
    paddingRight: 30,
    marginBottom: 15,
    backgroundColor: '#ebebeb',
  },
});
