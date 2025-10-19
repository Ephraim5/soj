import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useSouls } from '../../../hooks/useUnitMemberData';
import ModernLoader from '../../../loader/load'; 

type RootStackParamList = {
  SoulsWon: undefined;
  AddNewSoul: undefined;
};

type SoulsWonScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'SoulsWon'
>;

type Props = {
  navigation: SoulsWonScreenNavigationProp;
};

const SoulsWonScreen: React.FC<Props> = ({ navigation }) => {
  const [token, setToken] = React.useState<string | undefined>();
  const [query, setQuery] = useState('');
  React.useEffect(() => {
    (async () => {
      try {
        const t = await AsyncStorage.getItem('auth_token');
        setToken(t || undefined);
      } catch {}
    })();
  }, []);
  const { data, loading, error, refresh } = useSouls(token);
  const souls = data?.souls || [];
  const filtered = useMemo(() => {
    if (!query) return souls;
    const q = query.toLowerCase();
    return souls.filter(
      s =>
        s.name?.toLowerCase().includes(q) || s.phone?.includes(q),
    );
  }, [souls, query]);
  const handleAddNewSoul = () => {
    navigation.navigate('AddNewSoul');
  };

  return (
    <View style={styles.container}>
  <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reports</Text>
      </View>

      <View style={styles.reportHeader}>
        <View style={styles.reportTypeContainer}>
          <Icon name="flame" size={20} color="#FF6B35" />
          <Text style={styles.reportType}>Souls You Won (2025)</Text>
        </View>
        <TouchableOpacity style={styles.yearSelector}>
          <Text style={styles.yearText}>2025</Text>
          <Icon name="chevron-down" size={16} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name"
          placeholderTextColor="#999"
          value={query}
          onChangeText={setQuery}
        />
        <TouchableOpacity style={styles.searchButton} onPress={refresh}>
          <Icon name="refresh" size={20} color="#999" />
        </TouchableOpacity>
      </View>

      {loading && <ModernLoader fullscreen={false} spinnerSize={60} ringWidth={6} logoSize={34} />}
      {!loading && (
        <>
          <View style={styles.statsHeader}>
            <Text style={styles.soulsWonText}>
              Souls Won: <Text style={styles.soulsCount}>{souls.length}</Text>
            </Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAddNewSoul}>
              <Icon name="add" size={20} color="white" />
              <Text style={styles.addButtonText}>Add New Soul</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.convertsTitle}>Your Converts</Text>
            <TouchableOpacity style={styles.filterButton} onPress={refresh}>
              <Text style={styles.filterText}>Refresh</Text>
              <Icon name="refresh" size={16} color="#349DC5" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.convertsList}>
            {filtered.map(soul => (
              <View key={soul._id} style={styles.convertCard}>
                <View style={styles.convertHeader}>
                  <Text style={styles.convertName}>{soul.name || 'Unnamed'}</Text>
                </View>
                <View style={styles.convertDetails}>
                  {soul.phone && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Phone Number</Text>
                      <Text style={styles.detailValue}>{soul.phone}</Text>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Date</Text>
                    <Text style={styles.detailValue}>
                      {soul.dateWon
                        ? new Date(soul.dateWon).toLocaleDateString()
                        : '-'}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
            {!filtered.length && (
              <Text
                style={{
                  textAlign: 'center',
                  padding: 20,
                  color: '#666',
                }}
              >
                {souls.length
                  ? 'No matches'
                  : error
                  ? 'Failed to load souls'
                  : 'No souls yet'}
              </Text>
            )}
          </ScrollView>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: 'white',
  },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#333' },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  reportTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  reportType: { fontSize: 16, fontWeight: '600', color: '#333', marginLeft: 8 },
  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  yearText: { fontSize: 14, color: '#333', marginRight: 5 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchButton: { marginLeft: 10, padding: 10 },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  soulsWonText: { fontSize: 16, color: '#333' },
  soulsCount: { fontWeight: 'bold', fontSize: 18 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#349DC5',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 5,
  },
  filterSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  convertsTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#349DC5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterText: { color: '#349DC5', fontSize: 14, marginRight: 5 },
  convertsList: { flex: 1, paddingHorizontal: 20 },
  convertCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  convertHeader: { marginBottom: 10 },
  convertName: { fontSize: 16, fontWeight: '600', color: '#349DC5' },
  convertDetails: { gap: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { fontSize: 14, color: '#666' },
  detailValue: { fontSize: 14, color: '#333', fontWeight: '500' },
});

export default SoulsWonScreen;
