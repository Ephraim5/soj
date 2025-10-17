import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import uuid  from 'react-native-uuid';
import { CARD_BG, SCREEN_BG, PRIMARY_BLUE } from './colors';

export const AddStudentModal: React.FC<{ visible?: boolean; onClose?: () => void }> = ({ visible = true, onClose }) => {
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [surname, setSurname] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('Male');
  const [marital, setMarital] = useState('Single');

  const submit = () => {
    const newStudent = { id: uuid.v4(), firstName, middleName, surname, phone, gender, marital };
    console.log('new student', newStudent);
    onClose && onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.center}>
        <View style={styles.card}>
          <Text style={styles.title}>Add New Student</Text>
          <TextInput placeholder="First name" style={styles.input} value={firstName} onChangeText={setFirstName} />
          <TextInput placeholder="Middle name" style={styles.input} value={middleName} onChangeText={setMiddleName} />
          <TextInput placeholder="Surname" style={styles.input} value={surname} onChangeText={setSurname} />
          <TextInput placeholder="Phone number" style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <TextInput placeholder="Gender" style={styles.input} value={gender} onChangeText={setGender} />
          <TextInput placeholder="Marital status" style={styles.input} value={marital} onChangeText={setMarital} />
          <View style={{flexDirection:'row', justifyContent:'space-between'}}>
            <TouchableOpacity onPress={onClose}><Text>Cancel</Text></TouchableOpacity>
            <TouchableOpacity testID="add-student-submit" onPress={submit} style={styles.submit}><Text style={{color:'#fff'}}>Submit</Text></TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { width: '92%', backgroundColor: CARD_BG, padding: 16, borderRadius: 12 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#eef3f5', padding: 10, borderRadius: 8, marginBottom: 8 },
  submit: { backgroundColor: PRIMARY_BLUE, padding: 10, borderRadius: 8 }
});
