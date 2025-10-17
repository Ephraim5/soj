import  { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

// ---- Define your navigation stack param list ----
type RootStackParamList = {
  AdminUnitLead: undefined;
  GenerateAccessCodeScreen: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AdminUnitLead'>;

interface Admin {
  id: string;
  name: string;
  phone: string;
}

export default function AdminUnitLead() {
  const navigation = useNavigation<NavigationProp>();

  const [admins, setAdmins] = useState<Admin[]>([
    { id: '1', name: 'Pastor John Philip Emeka', phone: '0803 324 2345' },
    { id: '2', name: 'Pastor John Philip Emeka', phone: '0803 565 1455' },
  ]);

  const handleEdit = (id: string): void => {
    Alert.alert('Edit', `Edit admin with id: ${id}`);
  };

  const handleRemove = (id: string): void => {
    Alert.alert(
      'Remove',
      'Are you sure you want to remove this admin?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes', onPress: () => setAdmins(prev => prev.filter(admin => admin.id !== id)) },
      ]
    );
  };

  const handleAdd = (): void => {
    const newId = (admins.length + 1).toString();
    setAdmins(prev => [...prev, { id: newId, name: 'New Admin', phone: '080x xxx xxxx' }]);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* BACK BUTTON */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={26} color="#000000" />
      </TouchableOpacity>

      {/* HEADER */}
      <View style={{ alignItems: 'center', marginBottom: 50 }}>
        <Text style={styles.header}>Set Up Unit Leaders</Text>
        <Text style={styles.subtext}>
          You can add multiple unit leaders by clicking {'\n'}
          <Text style={{ fontStyle: 'italic' }}>“Add Unit Leader”</Text>
        </Text>
      </View>

      {/* ADMIN LIST */}
      <ScrollView contentContainerStyle={{ paddingBottom: 150 }}>
        {admins.map((admin) => (
          <View key={admin.id} style={styles.adminItem}>
            <View style={styles.adminRow}>
              <Ionicons name="location-sharp" size={14} color="#E53935" style={{ marginRight: 4 }} />
              <Text style={styles.adminName}>{admin.name}</Text>
              <Feather name="phone-call" size={12} color="#4CAF50" style={{ marginLeft: 6 }} />
              <Text style={styles.adminPhone}> {admin.phone}</Text>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.buttonBox} onPress={() => handleEdit(admin.id)}>
                <Feather name="edit" size={14} color="green" />
                <Text style={styles.buttonLabel}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.buttonBox} onPress={() => handleRemove(admin.id)}>
                <MaterialIcons name="cancel" size={14} color="red" />
                <Text style={styles.buttonLabel}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* ADD BUTTON */}
      <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
        <View style={styles.addCircle}>
          <Ionicons name="add" size={26} color="white" />
        </View>
      </TouchableOpacity>

      {/* CONTINUE BUTTON */}
      <TouchableOpacity
        style={styles.continueButton}
        onPress={() => navigation.navigate('GenerateAccessCodeScreen')}
      >
        <Text style={styles.continueText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  header: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 10,
    textAlign: 'center',
    color: '#1a1a1a',
  },
  subtext: {
    fontSize: 13,
    color: '#555',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16,
  },
  adminItem: {
    marginBottom: 18,
  },
  adminRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  backButton: {
    position: 'absolute',
    top: '8%',
    left: 20,
    zIndex: 10,
  },
  adminName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  adminPhone: {
    fontSize: 12,
    color: '#333',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    padding: 2,
  },
  buttonBox: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.09,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  buttonLabel: {
    marginLeft: 6,
    fontSize: 13,
    color: '#333',
  },
  addButton: {
    position: 'absolute',
    bottom: 100,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  addCircle: {
    backgroundColor: '#349DC5',
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButton: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: '#349DC5',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  continueText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});
