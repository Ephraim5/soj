import React, { useMemo, useState, useEffect } from 'react';
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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useInvites } from '../../../hooks/useUnitMemberData';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ModernLoader from '../../../loader/load'; // corrected path

type RootStackParamList = {
  PeopleInvited: undefined;
  AddSoulModal: undefined;
};

type PeopleInvitedScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'PeopleInvited'
>;

type PeopleInvitedScreenRouteProp = RouteProp<
  RootStackParamList,
  'PeopleInvited'
>;

type Props = {
  navigation: PeopleInvitedScreenNavigationProp;
  route: PeopleInvitedScreenRouteProp;
};

const PeopleInvitedScreen: React.FC<Props> = ({ navigation }) => {
  const handleSoulModal = () => {
    navigation.navigate('AddSoulModal');
  };
  const [token, setToken] = useState<string | undefined>();
  const [query, setQuery] = useState('');
  useEffect(() => {
    (async () => {
      try {
        const t = await AsyncStorage.getItem('auth_token');
        setToken(t || undefined);
      } catch {}
    })();
  }, []);
  const { data, loading, error, refresh } = useInvites(token, 'unit');
  const invites = data?.invites || [];
  const filtered = useMemo(() => {
    if (!query) return invites;
    const q = query.toLowerCase();
    return invites.filter(
      (i) =>
        i.name?.toLowerCase().includes(q) || i.phone?.includes(q)
    );
  }, [invites, query]);

  return (
    <View style={styles.container}>
  <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reports</Text>
      </View>

      {/* Report Header */}
      <View style={styles.reportHeader}>
        <View style={styles.reportTypeContainer}>
          <Icon name="people" size={20} color="#666" />
          <Text style={styles.reportType}>People You Invited</Text>
        </View>
        <TouchableOpacity style={styles.yearSelector}>
          <Text style={styles.yearText}>2025</Text>
          <Icon name="chevron-down" size={16} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or phone number"
          placeholderTextColor="#999"
          value={query}
          onChangeText={setQuery}
        />
        <TouchableOpacity style={styles.searchButton} onPress={refresh}>
          <Icon name="refresh" size={20} color="#999" />
        </TouchableOpacity>
      </View>

      {/* Add Button */}
      <View style={styles.statsHeader}>
        <TouchableOpacity style={styles.addButton} onPress={handleSoulModal}>
          <Text style={styles.addButtonText}>Add New</Text>
        </TouchableOpacity>
      </View>

      {loading && <ModernLoader fullscreen={false} spinnerSize={60} ringWidth={6} logoSize={34} />}
      {!loading && (
        <>
          {/* Total */}
          <View style={{ paddingHorizontal: 20 }}>
            <Text style={styles.totalText}>Total Number</Text>
            <Text style={styles.totalNumber}>{invites.length}</Text>
          </View>

          {/* Filter */}
          <View style={styles.filterSection}>
            <TouchableOpacity style={styles.filterButton} onPress={refresh}>
              <Text style={styles.filterText}>Refresh</Text>
              <Icon name="refresh" size={16} color="#349DC5" />
            </TouchableOpacity>
          </View>

          {/* List */}
          <ScrollView style={styles.invitedList}>
            {filtered.map((invite) => (
              <View style={styles.invitedCard} key={invite._id}>
                <View style={styles.cardHeader}>
                  <View style={styles.nameSection}>
                    <Text style={styles.invitedName}>{invite.name}</Text>
                  </View>
                  <Text style={styles.invitedDate}>
                    {invite.invitedAt
                      ? new Date(invite.invitedAt).toLocaleDateString()
                      : ''}
                  </Text>
                </View>

                <View style={styles.invitedDetails}>
                  {invite.gender && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Gender</Text>
                      <Text style={styles.detailValue}>{invite.gender}</Text>
                    </View>
                  )}
                  {invite.phone && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Phone Number</Text>
                      <Text style={styles.detailValue}>{invite.phone}</Text>
                    </View>
                  )}
                  {invite.ageRange && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Age Range</Text>
                      <Text style={styles.detailValue}>{invite.ageRange}</Text>
                    </View>
                  )}
                  {invite.method && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Method</Text>
                      <Text style={styles.detailValue}>{invite.method}</Text>
                    </View>
                  )}
                  {invite.note && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Note</Text>
                      <Text style={styles.detailValue}>
                        {invite.note.length > 60
                          ? invite.note.slice(0, 57) + '...'
                          : invite.note}
                      </Text>
                    </View>
                  )}
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
                {invites.length
                  ? 'No matches'
                  : error
                  ? 'Failed to load invites'
                  : 'No invites yet'}
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
  reportType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
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
    marginBottom: 10,
  },
  totalText: { fontSize: 16, color: '#333', fontWeight: '500' },
  addButton: {
    backgroundColor: '#349DC5',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: { color: 'white', fontSize: 14, fontWeight: '500' },
  totalNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  filterSection: {
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
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
  invitedList: { flex: 1, paddingHorizontal: 20 },
  invitedCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  nameSection: { flex: 1 },
  invitedName: { fontSize: 16, fontWeight: '600', color: '#349DC5' },
  invitedDate: { fontSize: 14, color: '#666' },
  invitedDetails: { gap: 12 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailLabel: { fontSize: 14, color: '#666', flex: 1 },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  descriptionContainer: { flex: 1, alignItems: 'flex-end' },
  viewMoreText: { fontSize: 14, color: '#349DC5', marginTop: 2 },
});

export default PeopleInvitedScreen;
