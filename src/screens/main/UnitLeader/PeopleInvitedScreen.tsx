import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import PeopleAdd from './AddPeople';
import { heightPercentageToDP } from 'react-native-responsive-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useInvites } from '../../../hooks/useUnitMemberData';
import type { CreateInviteInput } from '../../../api/invites';

type RootStackParamList = {
  PeopleInvited: undefined;
  AddSoulModal: undefined;
  AddPeop: undefined;
  Report: undefined;
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
  const [token, setToken] = useState<string | undefined>();
  React.useEffect(() => {
    (async () => {
      try {
        const t1 = await AsyncStorage.getItem('token');
        const t2 = t1 ? null : await AsyncStorage.getItem('auth_token');
        setToken((t1 || (t2 as any)) || undefined);
      } catch {}
    })();
  }, []);
  const invitesHook = useInvites(token, 'unit');
  const [visible, setVisible] = useState(false);
  const handleOpenAdd = () => setVisible(true);
  // state to toggle expanded/collapsed text for each card
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const total = invitesHook.data?.invites?.length || 0;
  const onSubmitInvite = async (payload: CreateInviteInput) => {
    try {
      await invitesHook.create(payload);
      setVisible(false);
    } catch (e) {}
  };

  return (
    <SafeAreaView style={styles.container}>
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
        />
        <TouchableOpacity style={styles.searchButton}>
          <Icon name="search" size={20} color="#999" />
        </TouchableOpacity>
      </View>

      {/* Add Button */}
      <View style={styles.statsHeader}>
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={styles.totalText}>Total Number</Text>
          <Text style={styles.totalNumber}>{total}</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleOpenAdd}>
          <Text style={styles.addButtonText}>Add New</Text>
        </TouchableOpacity>
      </View>

      {/* Total */}


      {/* Filter */}
      <View style={styles.filterSection}>
        <TouchableOpacity style={styles.filterButton}>
          <Text style={styles.filterText}>Filter by Date</Text>
          <Icon name="calendar" size={16} color="#349DC5" />
        </TouchableOpacity>
      </View>
  <PeopleAdd visible={visible} onClose={() => setVisible(false)} onSubmit={onSubmitInvite} submitting={invitesHook.loading} />

      {/* List */}
      <ScrollView style={styles.invitedList}>
        {(invitesHook.data?.invites || []).map((inv, index) => {
          const isExpanded = expandedIndex === index;
          const longText = inv.note || inv.method || '';
          const displayText = isExpanded
            ? longText
            : longText && longText.length > 40
              ? longText.substring(0, 40) + '...'
              : longText;
          const dateStr = inv.invitedAt ? new Date(inv.invitedAt).toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' }) : '';
          return (
            <View style={styles.invitedCard} key={inv._id || index}>
              <View style={styles.cardHeader}>
                <View style={styles.nameSection}>
                  <Text style={styles.invitedName}>{inv.name}</Text>
                </View>
                <Text style={styles.invitedDate}>{dateStr}</Text>
              </View>

              <View style={styles.invitedDetails}>
                {!!inv.gender && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Gender</Text>
                    <Text style={styles.detailValue}>{inv.gender}</Text>
                  </View>
                )}
                {!!inv.phone && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Phone Number</Text>
                    <Text style={styles.detailValue}>{inv.phone}</Text>
                  </View>
                )}
                {!!inv.ageRange && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Age Range</Text>
                    <Text style={styles.detailValue}>{inv.ageRange}</Text>
                  </View>
                )}
                {!!longText && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>How Invited</Text>
                    <View style={styles.descriptionContainer}>
                      <Text style={styles.detailValue}>{displayText}</Text>
                      {longText.length > 40 && (
                        <TouchableOpacity onPress={() => setExpandedIndex(isExpanded ? null : index)}>
                          <Text style={styles.viewMoreText}>
                            {isExpanded ? 'View Less' : 'View More'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: 'white', paddingTop: heightPercentageToDP(5), height: heightPercentageToDP(100) },
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
