import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, ScrollView, StatusBar, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { listEvents, type EventItem } from '../../api/events';
import { listConversations } from '../../api/messages';
import { eventBus } from '../../utils/eventBus';
import { getMinistrySummary } from '../../api/summary';
import { PRIMARY_BLUE } from '@screens/AuthScreens/SuperAdmin/styles';
import { BASE_URl } from 'api/users';
import axios from 'axios';

type MinimalUser = {
  church?: any;
  firstName?: string;
  surname?: string;
  title?: string;
  roles: { ministryName?: string }[];
  approved: boolean;
  profile?: { avatar?: string };
};

const currency = (n: number) => `₦${(n || 0).toLocaleString('en-NG')}`;

export default function MinistryDashboard() {
  const navigation = useNavigation<any>();
  const [user, setUser] = useState<MinimalUser | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [workersTotal, setWorkersTotal] = useState<number>(0);
  const [soulsWon, setSoulsWon] = useState<number>(0);
  const [income, setIncome] = useState<number>(0);
  const [expense, setExpense] = useState<number>(0);
  const [balance, setBalance] = useState<number>(0);
  const [unreadTotal, setUnreadTotal] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
         const raw = await AsyncStorage.getItem('user');
            const token = await AsyncStorage.getItem('token');
            if (token) {
                const res = await axios.get(`${BASE_URl}/api/users/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data?.ok) {
                    const u = res.data.user;
                    setUser(u)
                }
              }else{
                navigation.goBack();
              }
      } catch {}
      try {
        const ev = await listEvents();
        if (mounted) setEvents(ev);
      } catch {}
      try {
        const sum = await getMinistrySummary();
        if (mounted && sum?.ok) {
          setWorkersTotal(sum.totals.workersTotal || 0);
          setSoulsWon(sum.totals.soulsWon || 0);
          setIncome(sum.finance.income || 0);
          setExpense(sum.finance.expense || 0);
          setBalance(sum.finance.balance || 0);
        }
      } catch {}
      try {
        // initial unread count for notification badge
        const res: any = await listConversations();
        if (mounted) {
          const total = (res?.conversations || []).reduce((acc: number, c: any) => acc + (c.unread || 0), 0);
          setUnreadTotal(total);
        }
      } catch {}
      finally { if (mounted) setLoading(false); }
    })();
    // subscribe to message events to refresh unread
    const offMsg = eventBus.on('SOJ_MESSAGE', async () => {
      try {
        const res: any = await listConversations();
        const total = (res?.conversations || []).reduce((acc: number, c: any) => acc + (c.unread || 0), 0);
        setUnreadTotal(total);
      } catch {}
    });
    return () => { mounted = false; };
  }, []);

  // dynamic values from summary
  const totalWorkers = workersTotal;
  const financial = { income, expense, balance };
  const stats = { avgAttendance: 0, soulsWon };

  const leaderName = useMemo(() => {
    if (!user) return 'network bad';
    const full = `${user.title ? user.title + ' ' : ''}${user.firstName || ''} ${user.surname || ''}`.trim();
    return full || 'network bad';
  }, [user]);

  return (
    <SafeAreaView style={styles.safe}>
  <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={{ padding: 6 }} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.churchTitle} numberOfLines={1}>{user?.roles[0]?.ministryName || 'Church Admin'}</Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate('Notification' as never)} style={{ padding: 6, position: 'relative' }}>
            <Ionicons name="notifications-outline" size={24} color="#ffffff" />
            {unreadTotal > 0 && (
              <View style={{ position:'absolute', top:2, right:2, backgroundColor:'#ef4444', borderRadius:9, minWidth:16, height:16, alignItems:'center', justifyContent:'center', paddingHorizontal:3 }}>
                <Text style={{ color:'#fff', fontSize:9, fontWeight:'800' }}>{unreadTotal > 9 ? '9+' : unreadTotal}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Leader row */}
        <TouchableOpacity style={styles.leaderRow} activeOpacity={0.8} onPress={() => navigation.navigate('ProfileAdmin' as never)}>
          <View style={styles.leaderAvatar}>
            {user?.profile?.avatar ? (
              <Image source={{ uri: user.profile.avatar }} style={{ width: 40, height: 40, borderRadius: 20 }} />
            ) : (
              <Ionicons name="person" size={20} color="#00204a" />
            )}
          </View>
          <View>
            <Text style={styles.leaderTitle}>Leader</Text>
            <Text style={styles.leaderName}>{leaderName}</Text>
          </View>
        </TouchableOpacity>

        {/* Workers big card */}
        <View style={styles.bigCard}>
          <Text style={styles.bigNumber}>{totalWorkers.toLocaleString('en-NG')}</Text>
          <Text style={styles.bigSub}>Total Number of Workers</Text>
        </View>

        {/* Financial Summary */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={styles.cardTitle}>Financial Summary</Text>
              <Text style={styles.cardSub}>Jun. 23rd - Dec. 10th, 2025</Text>
            </View>
            <Ionicons name="stats-chart" size={20} color="#6b7280" />
          </View>
          <View style={{ marginTop: 14 }}>
            <View style={styles.rowBetween}><Text style={styles.muted}>Total Income</Text><Text style={styles.bold}>{currency(financial.income)}</Text></View>
            <View style={styles.rowBetween}><Text style={styles.muted}>Total Expenditure</Text><Text style={styles.bold}>{currency(financial.expense)}</Text></View>
            <View style={styles.rowBetween}><Text style={styles.muted}>Total Balance</Text><Text style={styles.bold}>{currency(financial.balance)}</Text></View>
          </View>
        </View>

        {/* Dark stat cards row */}
        <View style={styles.row}>
          <View style={[styles.darkCard, { marginRight: 12 }]}>
            <Text style={styles.darkNumber}>{stats.avgAttendance.toLocaleString('en-NG')}</Text>
            <Text style={styles.darkLabel}>Average Attendance{"\n"}Jan. 12th - Jul. 4th, 2025</Text>
          </View>
          <View style={styles.darkCard}>
            <Text style={styles.darkNumber}>{stats.soulsWon}</Text>
            <Text style={styles.darkLabel}>No. of Souls Won{"\n"}Jan. 12th - Jul. 4th, 2025</Text>
          </View>
        </View>

        {/* Upcoming events */}
        <Text style={styles.sectionTitle}>Upcoming Events</Text>
        <FlatList
          data={events.slice(0, 6)}
          keyExtractor={(it) => it._id}
          renderItem={({ item }) => (
            <View style={[styles.eventPill, (events[0]?._id === item._id) && styles.eventPillActive]}>
              <Text style={[styles.eventDate, (events[0]?._id === item._id) && styles.eventDateActive]}>{new Date(item.date || Date.now()).toLocaleDateString('en-NG', { day: '2-digit' })}</Text>
              <Text style={[styles.eventMon, (events[0]?._id === item._id) && styles.eventDateActive]}>{new Date(item.date || Date.now()).toLocaleDateString('en-NG', { month: 'short' })}</Text>
            </View>
          )}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginVertical: 6 }}
          contentContainerStyle={{ paddingRight: 8 }}
        />
        {/* First event link */}
        {events[0] && (
          <TouchableOpacity>
            <Text style={styles.link}>{events[0].title}</Text>
          </TouchableOpacity>
        )}

        {/* Quick access */}
        <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Quick Access</Text>
        <View style={{ gap: 10 }}>
          <QuickItem onPress={() => navigation.navigate('AllUnitDashboard' as never, { restrictToMinistry: true, ministry: user?.roles?.[0]?.ministryName })} icon={<Ionicons name="stats-chart" size={18} color="#00204a" />} title="Unit Dashboards" />
          <QuickItem icon={<Ionicons name="people" size={18} color="#00204a" />} title="Workers Demographics" />
          <QuickItem icon={<Ionicons name="person-add" size={18} color="#00204a" />} title="First-Timers & New Members" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickItem({ icon, title, onPress }: { icon: React.ReactNode; title: string; onPress?: () => void }) {
  return (
    <TouchableOpacity style={styles.quickItem} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.quickIcon}>{icon}</View>
      <Text style={styles.quickTitle}>{title}</Text>
      <Ionicons name="chevron-forward" size={18} color="#00204a" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  container: { padding: 16, paddingTop: 24, paddingBottom: 96, backgroundColor: '#ffffff' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, backgroundColor: '#00204a', paddingHorizontal: 8, paddingVertical: 10, borderRadius: 8 },
  churchTitle: { color: '#fff', fontWeight: '700', fontSize: 18, flex: 1, textAlign: 'center' },
  leaderRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 14 },
  leaderAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#e3f2ff', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  leaderTitle: { color: '#6b7280', fontSize: 12 },
  leaderName: { color: '#0b2847', fontSize: 14, fontWeight: '700' },
  bigCard: { backgroundColor: PRIMARY_BLUE, borderRadius: 14, paddingVertical: 20, paddingHorizontal: 16, marginTop: 8, alignItems: 'center' },
  bigNumber: { fontSize: 32, fontWeight: '800', color: '#ffffff' },
  bigSub: { color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  card: { backgroundColor: '#9CA3AF', borderRadius: 14, padding: 14, marginTop: 14 },
  cardTitle: { color: '#ffffff', fontWeight: '800' },
  cardSub: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 2 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  muted: { color: '#ffffff' },
  bold: { color: '#ffffff', fontWeight: '800' },
  row: { flexDirection: 'row', marginTop: 12 },
  darkCard: { flex: 1, backgroundColor: '#00204a', borderRadius: 14, padding: 16 },
  darkNumber: { color: '#fff', fontSize: 28, fontWeight: '800' },
  darkLabel: { color: '#cbd5e1', fontSize: 12, marginTop: 4 },
  sectionTitle: { color: '#0b2847', fontWeight: '700', marginTop: 12 },
  eventPill: { width: 64, height: 64, borderRadius: 14, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  eventPillActive: { backgroundColor: '#349DC5' },
  eventDate: { color: '#0b2847', fontWeight: '800', fontSize: 18, lineHeight: 20 },
  eventDateActive: { color: '#ffffff' },
  eventMon: { color: '#0b2847', fontWeight: '600', fontSize: 12 },
  link: { color: '#2CA6FF', fontWeight: '700', marginTop: 8 },
  quickItem: { backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' },
  quickIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  quickTitle: { color: '#0b2847', fontWeight: '700', flex: 1 }
});
