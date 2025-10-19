import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUnitMembers } from '../../../hooks/useUnitMemberData';
import ModernLoader from '../../../loader/load';

type RootStackParamList = {
  MemberList: undefined;
  SoulsWon: undefined;
};

type MemberListScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'MemberList'
>;

type Props = {
  navigation: MemberListScreenNavigationProp;
  route: RouteProp<RootStackParamList, 'MemberList'>;
};

const MemberListScreen: React.FC<Props> = ({ navigation }) => {
  const [token, setToken] = React.useState<string | undefined>();
  const [unitId, setUnitId] = React.useState<string | undefined>();
  const [query, setQuery] = React.useState('');
  const [profileLoaded, setProfileLoaded] = React.useState(false);

  React.useEffect(()=>{ (async()=> {
    try {
      const t = await AsyncStorage.getItem('auth_token');
      if (t) setToken(t);
      const rawUser = await AsyncStorage.getItem('user');
      if (rawUser) {
        try { const parsed = JSON.parse(rawUser); const activeName = parsed.activeRole; const active = (parsed.roles||[]).find((r:any)=> r.role===activeName) || (parsed.roles||[]).find((r:any)=> r.role==='UnitLeader'); if (active?.unit) setUnitId(active.unit); } catch {}
      }
    } finally { setProfileLoaded(true); }
  })(); },[]);

  const { data, loading, error, refresh } = useUnitMembers(token, unitId);
  const members = data?.members || [];
  const filtered = React.useMemo(()=> {
    if (!query) return members;
    const q = query.toLowerCase();
    return members.filter(m => (m.name||'').toLowerCase().includes(q) || (m.phone||'').includes(q));
  }, [members, query]);

  const total = members.length;
  const male = members.filter(m=> m.gender === 'Male').length;
  const female = members.filter(m=> m.gender === 'Female').length;

  return (
    <View style={styles.container}>
  <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={()=>navigation.goBack()}>
          <Icon name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Unit Member List</Text>
      </View>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or phone"
          placeholderTextColor="#999"
          value={query}
          onChangeText={setQuery}
        />
      </View>
      {(loading || !profileLoaded) && <ModernLoader fullscreen={false} spinnerSize={50} ringWidth={5} logoSize={30} />}
      {error && !loading && (
        <Text style={{ color:'red', textAlign:'center', marginBottom:10 }}>Failed to load members</Text>
      )}
      {!loading && profileLoaded && (
        <>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}><Text style={styles.statLabel}>Total Members</Text><Text style={styles.statNumber}>{total}</Text></View>
            <View style={styles.statItem}><Text style={styles.statLabel}>Female</Text><Text style={styles.statNumber}>{female}</Text></View>
            <View style={styles.statItem}><Text style={styles.statLabel}>Male</Text><Text style={styles.statNumber}>{male}</Text></View>
          </View>
          <View style={styles.membersSection}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
              <Text style={styles.sectionTitle}>All Members</Text>
              <TouchableOpacity onPress={refresh} style={{ padding:6 }}><Icon name="refresh" size={22} color="#349DC5" /></TouchableOpacity>
            </View>
            <ScrollView style={styles.membersList}>
              {filtered.map(m => (
                <View key={m._id} style={styles.memberItem}>
                  <View style={styles.avatarContainer}><Icon name="person" size={24} color="#999" /></View>
                  <Text style={styles.memberName}>{m.name || 'Unnamed'} {m.phone? `| ${m.phone}`:''}</Text>
                </View>
              ))}
              {!filtered.length && (
                <Text style={{ textAlign:'center', padding:20, color:'#666' }}>{members.length? 'No matches':'No members yet'}</Text>
              )}
            </ScrollView>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'white',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#349DC5',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchInput: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 12,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#349DC5',
    marginBottom: 5,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  membersSection: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  membersList: {
    flex: 1,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  memberName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
});

export default MemberListScreen;
