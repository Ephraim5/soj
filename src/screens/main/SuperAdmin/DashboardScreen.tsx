import React, { FC, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Dimensions,
    SafeAreaView,
    Platform,
    Image,
    StatusBar,
    ActivityIndicator
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons, Feather, AntDesign } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { heightPercentageToDP, widthPercentageToDP } from 'react-native-responsive-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URl } from '../../../api/users';
import LoadingOverlay from '../../../components/LoadingOverlay';
import RoleSwitchModal from '../../../components/RoleSwitchModal';
import RoleSwitchCountdownModal from '../../../components/RoleSwitchCountdownModal';
import { AppEventBus } from '../../../components/AppBootstrapGate';
import Toast from 'react-native-toast-message';
import useMinimumLoader from '../../../hooks/useMinimumLoader';
import { listEvents, type EventItem } from '../../../api/events';
import { listConversations } from '../../../api/messages';
import { eventBus } from '../../../utils/eventBus';
import { getChurchSummary, type ChurchSummary } from '../../../api/summary';

const { width } = Dimensions.get('window');


type RootStackParamList = {
    Dashboard: { ProfileAdminImage?: string };
    More: undefined;
    Notification: undefined;
    AllUnitDashboardsScreen: undefined;
    ProfileAdmin: undefined;
    EventAndAnnouncement: undefined;
    AllUnitDashboard: undefined;
    ManageSuperAdminsUnitLeaders: undefined;
    MainTabs: undefined;
};
type DashboardScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;
type DashboardScreenRouteProp = RouteProp<RootStackParamList, 'Dashboard'>;

const DashboardScreen: FC = () => {
    const navigation = useNavigation<DashboardScreenNavigationProp>();
    const route = useRoute<DashboardScreenRouteProp>();

    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [switchModalVisible, setSwitchModalVisible] = useState(false);
    const [selectedRole, setSelectedRole] = useState<string | null>(null);
    const [selectedRoleKey, setSelectedRoleKey] = useState<string | null>(null);
    const [switching, setSwitching] = useState(false);
    const [countdownVisible, setCountdownVisible] = useState(false);
    const [pendingRole, setPendingRole] = useState<string | null>(null);
    const originalRoleRef = useRef<string | null>(null);
    // derived optimistic active role (used for header display while waiting)
    const effectiveActiveRole = pendingRole || profile?.activeRole;

    // Church-wide summary for SuperAdmin
    const [summary, setSummary] = useState<ChurchSummary | null>(null);
    const [summaryLoading, setSummaryLoading] = useState<boolean>(false);
    const [summaryError, setSummaryError] = useState<string | null>(null);

    // Upcoming events (next future events across months – unified strategy)
    const [eventsLoading, setEventsLoading] = useState<boolean>(false);
    const [eventsError, setEventsError] = useState<string | null>(null);
    const [upcomingEvents, setUpcomingEvents] = useState<EventItem[]>([]);
    const [unreadTotal, setUnreadTotal] = useState<number>(0);
    const [onlineIds, setOnlineIds] = useState<string[]>([]);

    // Normalize event object & extract valid date (preferring explicit date fields, fallback to createdAt)
    const normalizeEvent = useCallback((raw: any): (EventItem & { __date?: Date }) | null => {
        if (!raw || typeof raw !== 'object') return null;
        const candidateKeys = ['date', 'dateTime', 'startDate', 'eventDate'];
        let dateStr: string | undefined = undefined;
        for (const k of candidateKeys) {
            if (raw[k]) { dateStr = raw[k]; break; }
        }
        if (!dateStr && raw.createdAt) dateStr = raw.createdAt;
        if (!dateStr) return null;
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return null;
        return { ...(raw as any), date: raw.date || dateStr, __date: d };
    }, []);

    const showMetricsLoader = useMinimumLoader(loading || summaryLoading, { minVisibleMs: 900, showDelayMs: 150 });

    const readToken = useCallback(async () => {
        const raw = await AsyncStorage.getItem('token');
        if (!raw) return null;
        const trimmed = raw.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (typeof parsed === 'string') return parsed;
                if (parsed && typeof parsed === 'object') {
                    if (parsed.token && typeof parsed.token === 'string') return parsed.token;
                }
                return null;
            } catch { return null; }
        }
        return raw;
    }, []);

    const fetchProfile = useCallback(async () => {
        try {
            setError(null);
            const token = await readToken();
            if (!token) {
                setError('Missing token');
                setLoading(false);
                return;
            }
                        const res = await axios.get(`${BASE_URl}/api/users/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data?.ok) {
                setProfile(res.data.user);
            } else {
                setError('Failed to load profile');
            }
        } catch (e: any) {
            setError(e?.response?.data?.message || e.message);
        } finally {
            setLoading(false);
        }
    }, [readToken]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    // Fetch church summary once profile is available (SuperAdmin screen)
    useEffect(() => {
        let mounted = true;
        const run = async () => {
            setSummaryError(null);
            setSummaryLoading(true);
            try {
                const s = await getChurchSummary();
                if (!mounted) return;
                setSummary(s);
            } catch (e: any) {
                if (!mounted) return;
                setSummaryError(e?.response?.data?.message || e?.message || 'Failed to load summary');
            } finally {
                if (mounted) setSummaryLoading(false);
            }
        };
        // Only attempt after profile loaded (to ensure JWT and active church context are ready)
        if (!loading && profile) {
            run();
        }
        return () => { mounted = false; };
    }, [loading, profile]);

    // Unread badge + presence
    useEffect(()=>{
        let mounted = true;
        const refreshUnread = async()=>{
            try{ const res = await listConversations(); if(!mounted) return; const total = (res.conversations||[]).reduce((acc:number,c:any)=> acc + (c.unread||0), 0); setUnreadTotal(total); }
            catch{}
        };
        refreshUnread();
        const offMsg = eventBus.on('SOJ_MESSAGE', refreshUnread);
        const offPresence = eventBus.on('SOJ_PRESENCE', (ids:string[])=>{ setOnlineIds(ids||[]); });
        return ()=>{ mounted=false; offMsg && offMsg(); offPresence && offPresence(); };
    },[]);

    // Helpers for date display
    const shortWeekday = (d: Date) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];

    // Fetch upcoming events (no month restriction) – keep only future (>= today) and take first N
    const fetchUpcomingEvents = useCallback(async () => {
        setEventsLoading(true);
        setEventsError(null);
        try {
            const all = await listEvents();
            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const normalized = (all || [])
                .map(ev => normalizeEvent(ev))
                .filter(Boolean) as (EventItem & { __date: Date })[];
            const filtered = normalized
                .filter(e => e.__date.getTime() >= startOfToday.getTime())
                .sort((a, b) => a.__date.getTime() - b.__date.getTime())
                .slice(0, 8) // limit to first 8 upcoming events
                .map(({ __date, ...rest }) => rest as EventItem);
            setUpcomingEvents(filtered);
        } catch (e: any) {
            setEventsError(e?.message || 'Failed to load events');
            setUpcomingEvents([]);
        } finally {
            setEventsLoading(false);
        }
    }, [normalizeEvent]);

    useEffect(() => {
        // First attempt to hydrate from local cache to prevent empty flicker
        (async () => {
            try {
                const stored = await AsyncStorage.getItem('unitOverview');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed.events)) {
                        const now = new Date();
                        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        const prelim = parsed.events
                            .map((e: any) => normalizeEvent(e))
                            .filter(Boolean) as (EventItem & { __date: Date })[];
                        const hydrated = prelim
                            .filter(e => e.__date.getTime() >= startOfToday.getTime())
                            .sort((a, b) => a.__date.getTime() - b.__date.getTime())
                            .slice(0, 8)
                            .map(({ __date, ...rest }) => rest as EventItem);
                        if (hydrated.length) setUpcomingEvents(hydrated);
                    }
                }
            } catch { }
            fetchUpcomingEvents();
        })();
        // Refetch on global events change
        const off = AppEventBus.on((event, payload) => {
            if (event === 'eventsChanged') {
                // If a full event object is provided, optimistically merge
                if (payload && payload.event) {
                    try {
                        const norm = normalizeEvent(payload.event);
                        if (norm && norm.__date && norm.__date.getTime() >= new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime()) {
                            setUpcomingEvents(curr => {
                                const id = (norm as any)._id || (norm as any).id;
                                const exists = curr.some(c => ((c as any)._id || (c as any).id) === id);
                                const mergedBase = exists ? curr.map(c => (((c as any)._id || (c as any).id) === id ? (norm as any) : c)) : [...curr, (norm as any)];
                                const normalizedMerged = mergedBase
                                    .map(ev => normalizeEvent(ev))
                                    .filter((v): v is EventItem & { __date?: Date } => Boolean(v))
                                    .sort((a: any, b: any) => new Date((a as any).date).getTime() - new Date((b as any).date).getTime())
                                    .slice(0, 8)
                                    .map(({ __date, ...rest }: any) => rest as EventItem);
                                return normalizedMerged;
                            });
                            return; // Skip immediate server refetch; eventually will refresh
                        }
                    } catch { /* ignore and refetch */ }
                }
                fetchUpcomingEvents();
            }
        });
        // Refetch when screen gains focus
        const unsubscribeFocus = navigation.addListener('focus', () => {
            fetchUpcomingEvents();
        });
        return () => {
            off && off();
            unsubscribeFocus && unsubscribeFocus();
        };
    }, [fetchUpcomingEvents, navigation]);

    // Active event displayed in title below date row
    const activeEventTitle = useMemo(() => upcomingEvents[0]?.title ?? null, [upcomingEvents]);

    const openSwitchModal = () => {
        if (!profile?.roles) return;
        setSelectedRole(profile.activeRole || (profile.roles[0]?.role));
        setSelectedRoleKey(null);
        setSwitchModalVisible(true);
    };
    const handleConfirmFromPicker = async () => {
        if (!selectedRole) { setSwitchModalVisible(false); return; }
        // Persist selected unitId locally for context when multiple same-name roles exist
        try {
            if (selectedRoleKey) {
                const parts = selectedRoleKey.split('::');
                const unitPart = parts[1];
                // only store if it's an object id looking string (24 hex) or any non-'global' token
                if (unitPart && unitPart !== 'global') {
                    await AsyncStorage.setItem('activeUnitId', unitPart);
                } else {
                    await AsyncStorage.removeItem('activeUnitId');
                }
            }
        } catch { }
        // optimistic preview (optional) - do not mutate real profile yet
        setPendingRole(selectedRole);
        setSwitchModalVisible(false);
        setCountdownVisible(true);
    };

    const executeRoleSwitch = async (roleToApply?: string | null) => {
        const role = roleToApply || pendingRole;
        if (!role) { setCountdownVisible(false); return; }
        try {
            setSwitching(true);
            // capture original
            if (!originalRoleRef.current) originalRoleRef.current = profile?.activeRole || null;
            // optimistic apply to local state
            setProfile((prev: any) => prev ? { ...prev, activeRole: role } : prev);
            // optimistic cache patch
            try {
                const cached = await AsyncStorage.getItem('user');
                if (cached) {
                    const parsed = JSON.parse(cached); parsed.activeRole = role; await AsyncStorage.setItem('user', JSON.stringify(parsed));
                }
            } catch { }
            // include client-side activeUnitId for consumers
            const activeUnitId = await AsyncStorage.getItem('activeUnitId');
            AppEventBus.emit('roleSwitchOptimistic', { activeRole: role, activeUnitId });
            navigation.navigate('MainTabs');

            const token = await readToken();
            if (!token) throw new Error('Missing token');
            await axios.post(`${BASE_URl}/api/auth/switch-role`, { role }, { headers: { Authorization: `Bearer ${token}` } });
            const res = await axios.get(`${BASE_URl}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data?.ok) {
                setProfile(res.data.user);
                const cachedRaw = await AsyncStorage.getItem('user');
                if (cachedRaw) {
                    const merged = { ...JSON.parse(cachedRaw), ...res.data.user };
                    await AsyncStorage.setItem('user', JSON.stringify(merged));
                } else {
                    await AsyncStorage.setItem('user', JSON.stringify(res.data.user));
                }
                Toast.show({ type: 'success', text1: 'Role switched', text2: `Now acting as ${res.data.user.activeRole}` });
                const activeUnitId2 = await AsyncStorage.getItem('activeUnitId');
                AppEventBus.emit('roleSwitched', { activeRole: res.data.user.activeRole, activeUnitId: activeUnitId2 });
                originalRoleRef.current = null; // confirmed
            }
        } catch (e: any) {
            // revert if failed
            if (originalRoleRef.current) {
                setProfile((prev: any) => prev ? { ...prev, activeRole: originalRoleRef.current } : prev);
                try {
                    const cached = await AsyncStorage.getItem('user');
                    if (cached) { const parsed = JSON.parse(cached); parsed.activeRole = originalRoleRef.current; await AsyncStorage.setItem('user', JSON.stringify(parsed)); }
                } catch { }
                const activeUnitId3 = await AsyncStorage.getItem('activeUnitId');
                AppEventBus.emit('roleSwitchRevert', { activeRole: originalRoleRef.current, activeUnitId: activeUnitId3 });
            }
            Toast.show({ type: 'error', text1: 'Switch failed', text2: e?.response?.data?.message || e.message });
        } finally {
            setSwitching(false);
            setCountdownVisible(false);
            setPendingRole(null);
        }
    };

    const cancelCountdown = () => {
        setCountdownVisible(false);
        setPendingRole(null);
        Toast.show({ type: 'info', text1: 'Cancelled', text2: 'Role switch aborted' });
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" />
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
                            <Image
                                style={{ width: 35, height: 35, borderRadius: 25 }}
                                source={require('../../../assets/images-removebg-preview.png')}
                                resizeMode='cover'
                            />
                            <Text style={styles.churchName}>Streams of Joy Umuahia</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
                            <TouchableOpacity onPress={() => navigation.navigate('ProfileAdmin')}>
                                <Image
                                    source={profile?.profile?.avatar
                                        ? { uri: profile.profile.avatar }
                                        : { uri: 'https://ui-avatars.com/api/?background=349DC5&color=fff&name=' + encodeURIComponent(profile?.firstName || 'User') }}
                                    style={styles.avatar}
                                    resizeMode='cover'
                                />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => navigation.navigate('Notification')} style={{ position:'relative' }}>
                                <Ionicons name="notifications-outline" size={30} color="black" />
                                {unreadTotal>0 && (
                                  <View style={{ position:'absolute', top:-4, right:-4, backgroundColor:'#ef4444', borderRadius:10, minWidth:16, height:16, alignItems:'center', justifyContent:'center', paddingHorizontal:3 }}>
                                    <Text style={{ color:'#fff', fontSize:9, fontWeight:'800' }}>{unreadTotal>9?'9+':unreadTotal}</Text>
                                  </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.headerBottom}>
                        <Text style={styles.welcome}>Welcome{profile?.title ? `, ${profile.title}` : ''} {profile?.firstName ? `${profile.firstName}` : ''}</Text>
                        {Array.isArray(profile?.roles) && profile.roles.length > 1 && (
                            <TouchableOpacity style={styles.switchRoleBtn} onPress={openSwitchModal}>
                                <Text style={styles.switchRoleText}>Switch Role {/* ({effectiveActiveRole}) */}</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <TextInput
                        style={styles.searchBar}
                        placeholder="Search for anything in the app"
                        placeholderTextColor="#aaa"
                        editable={false}
                    />
                </View>

                {showMetricsLoader && (
                    <View style={{ marginBottom: 20 }}>
                        <LoadingOverlay visible={false} fullscreen={false} message="Loading metrics" />
                    </View>
                )}
                {error && !loading && (
                    <Text style={{ color: 'red', marginBottom: 12 }}>Error: {error}</Text>
                )}
                {summaryError && !summaryLoading && (
                    <Text style={{ color: 'red', marginBottom: 12 }}>Summary: {summaryError}</Text>
                )}
                <View style={styles.overview}>
                    <Text style={styles.overviewTitle}>Today's Overview</Text>
                    <View style={styles.rowSpaceBetween}>
                        <View style={styles.statBoxDark}>
                            <Text style={styles.statValue}>{profile?.metrics?.avgAttendance ?? '—'}</Text>
                            <Text style={styles.statLabel}>Average Attendance</Text>
                            <Text style={styles.statDate}>{profile?.metrics?.attendanceRange || '—'}</Text>
                        </View>
                        <View style={styles.statBoxDark}>
                            <Text style={styles.statValue}>{summary?.totals?.soulsWon ?? profile?.metrics?.soulsWon ?? '—'}</Text>
                            <Text style={styles.statLabel}>No. of Souls Won</Text>
                            <Text style={styles.statDate}>{profile?.metrics?.soulsRange || '—'}</Text>
                        </View>
                    </View>
                    <View style={styles.statBoxLightBlue}>
                        <Text style={styles.statValueLight}>{summary?.totals?.workersTotal ?? profile?.metrics?.workersTotal ?? '—'}</Text>
                        <Text style={styles.statLabelLight}>Total Number of Workers</Text>
                    </View>
                </View>

                <View style={styles.financeSection}>
                    <View style={styles.rowSpaceBetween}>
                        <View>
                            <Text style={styles.financeTitle}>Financial Summary</Text>
                            <Text style={styles.financeDate}>{profile?.metrics?.financeRange || '—'}</Text>
                        </View>
                        <Image
                            style={{ width: 15, height: 15, marginTop: 5 }}
                            source={require('../../../assets/Vector.png')}
                        />
                    </View>
                    <View style={styles.financeItem}><Text style={[styles.whiteText, { fontWeight: '700' }]}>Total</Text><Text style={[styles.whiteText, { fontWeight: '700' }]}>Amount</Text></View>
                    <View style={styles.financeItem}><Text style={styles.whiteText}>Total Income</Text><Text style={styles.whiteText}>{summary?.finance?.income ?? profile?.metrics?.income ?? '—'}</Text></View>
                    <View style={styles.financeItem}><Text style={styles.whiteText}>Total Expenditure</Text><Text style={styles.whiteText}>{summary?.finance?.expense ?? profile?.metrics?.expenditure ?? '—'}</Text></View>
                    <View style={styles.financeItem}><Text style={styles.whiteText}>Total Balance</Text><Text style={styles.whiteText}>{summary?.finance?.balance ?? profile?.metrics?.balance ?? '—'}</Text></View>
                </View>

                <View style={styles.eventsSection}>
                    <Text style={styles.eventsTitle}>Upcoming Events</Text>
                    {upcomingEvents.length > 0 || eventsLoading ? (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }}
                            style={styles.dateRow}
                        >
                            {eventsLoading && (
                                <View style={[styles.dateBox, { alignItems: 'center', justifyContent: 'center' }]}>
                                    <ActivityIndicator size="small" color="#ccc" />
                                </View>
                            )}
                            {!eventsLoading && upcomingEvents.map((ev, idx) => {
                                const d = new Date(ev.date as string);
                                const isActive = idx === 0; // closest one
                                const dayNum = d.getDate().toString();
                                const weekday = shortWeekday(d);
                                return (
                                    <View key={(ev as any)._id || (ev as any).id} style={[styles.dateBox, { marginRight: 10 }, isActive && styles.dateBoxActive]}>
                                        <Text style={isActive ? styles.activeDateText : styles.dateText}>{dayNum}</Text>
                                        <Text style={isActive ? styles.activeDateText : styles.dateText}>{weekday}</Text>
                                    </View>
                                );
                            })}
                        </ScrollView>
                    ) : (
                        <View style={styles.emptyEventsCard}>
                            <View style={styles.emptyEventsIconWrap}>
                                <Feather name="calendar" size={26} color="#ffffff" />
                            </View>
                            <Text style={styles.emptyEventsTitle}>No Upcoming Events</Text>
                            <Text style={styles.emptyEventsDesc}>There are currently no future-dated events. Plan ahead by scheduling outreaches or special programs.</Text>
                            <TouchableOpacity style={styles.emptyEventsBtn} onPress={() => navigation.navigate('EventAndAnnouncement' as never)}>
                                <Text style={styles.emptyEventsBtnText}>Create / Manage Events</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    {upcomingEvents.length > 0 && (
                        <Text style={styles.eventName}>{activeEventTitle || '—'}</Text>
                    )}
                </View>

                <View style={styles.quickAccess}>
                    <TouchableOpacity onPress={() => navigation.navigate("AllUnitDashboard")} style={styles.accessItem}>
                        <View style={styles.accessRow}>
                            <MaterialCommunityIcons name="view-dashboard-outline" size={22} color="orange" />
                            <Text style={styles.accessText}>Unit Dashboards</Text>
                        </View>
                        <AntDesign name="right" size={18} color="black" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.accessItem}>
                        <View style={styles.accessRow}>
                            <Ionicons name="people-outline" size={22} color="#3b82f6" />
                            <Text style={styles.accessText}>Workers Demographics</Text>
                        </View>
                        <AntDesign name="right" size={18} color="black" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.accessItem}>
                        <View style={styles.accessRow}>
                            <Ionicons name="person-add-outline" size={22} color="green" />
                            <Text style={styles.accessText}>First-Timers & New Members</Text>
                        </View>
                        <AntDesign name="right" size={18} color="black" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.accessItem} onPress={() => navigation.navigate("EventAndAnnouncement")}>
                        <View style={styles.accessRow}>
                            <Feather name="calendar" size={22} color="gray" />
                            <Text style={styles.accessText}>Events and Announcements</Text>
                        </View>
                        <AntDesign name="right" size={18} color="black" />
                    </TouchableOpacity>
                </View>
            </ScrollView>
            <RoleSwitchModal
                visible={switchModalVisible}
                roles={profile?.roles || []}
                activeRole={profile?.activeRole}
                selectedRole={selectedRole}
                selectedKey={selectedRoleKey}
                onSelect={setSelectedRole}
                onSelectKey={setSelectedRoleKey}
                onCancel={() => setSwitchModalVisible(false)}
                onConfirm={handleConfirmFromPicker}
                loading={switching}
            />
            <RoleSwitchCountdownModal
                visible={countdownVisible}
                targetRole={pendingRole}
                seconds={8}
                onCancel={cancelCountdown}
                onConfirmNow={() => executeRoleSwitch(pendingRole)}
                onAutoExecute={() => executeRoleSwitch(pendingRole)}
                loading={switching}
            />
        </SafeAreaView>
    );
};

export default DashboardScreen;

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fff' },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 15, paddingBottom: heightPercentageToDP(12), paddingTop: heightPercentageToDP(5) },
    overviewTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#00204a',
        marginBottom: 10
    },
    rowSpaceBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
        columnGap: 10,
    },
    // removed container style causing flexGrow conflicts with ScrollView
    eventsTitle: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10
    },
    accessRow: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    header: {
        marginBottom: 10,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    avatar: {
        width: 35,
        height: 35,
        borderRadius: 17.5,
    },
    churchName: {
        fontSize: 16,
        fontWeight: 500,
        marginTop: '5%',
    },
    headerBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
        marginBottom: 10,
    },
    welcome: {
        fontSize: 15,
        fontWeight: '600',
    },
    switchRoleBtn: {
        backgroundColor: '#349DC5',
        paddingVertical: 9,
        paddingHorizontal: 10,
        borderRadius: 6,
    },
    switchRoleText: {
        fontSize: 13,
        color: '#ffffff',

    },
    searchBar: {
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 10,
        paddingHorizontal: 15,
        paddingVertical: 10,
        fontSize: 14,
    },
    overview: {
        marginBottom: 20,
    },
    statBoxDark: {
        backgroundColor: '#00204a',
        padding: 12,
        borderRadius: 10,
        marginBottom: 10,
        flex: 1,
    },
    statBoxLightBlue: {
        backgroundColor: '#349DC5',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        alignItems: 'center',
    },
    statValue: {
        color: 'white',
        fontSize: 26,
        fontWeight: 'bold',
        textAlign: "center"
    },
    statLabel: {
        color: 'white',
        fontSize: 14,
        marginTop: 5,
    },
    statDate: {
        color: 'white',
        fontSize: 12,
        marginTop: 5,
    },
    statValueLight: {
        color: 'white',
        fontSize: 26,
        fontWeight: 'bold',
    },
    statLabelLight: {
        color: 'white',
        fontSize: 14,
        marginTop: 5,
    },
    financeSection: {
        backgroundColor: '#ff9800',
        padding: 15,
        borderRadius: 10,
        marginBottom: 20,
    },
    financeTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
    },
    financeDate: {
        fontSize: 13,
        color: 'white',
        marginBottom: 10,
    },
    financeItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 3,
    },
    whiteText: {
        color: 'white',
        fontSize: 14,
    },
    eventsSection: {
        marginBottom: 20,
    },
    dateRow: {
        // container style for ScrollView itself; child layout handled by contentContainerStyle
        flexGrow: 0,
    },
    dateBox: {
        backgroundColor: '#f2f2f2',
        padding: 10,
        borderRadius: 10,
        width: width / 6.2,
        height: 80,
        alignItems: 'center',
        justifyContent: 'center',
        borderColor: "#e2e3e3",
        borderWidth: 2,
    },
    dateBoxActive: {
        backgroundColor: '#349DC5',
        borderColor: "#2286ae",
        borderWidth: 2,
        borderRadius: 10,
    },
    dateText: {
        color: '#7a7b7b',
        fontSize: 14,
        fontWeight: '700',
    },
    activeDateText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '700',


    },
    eventName: {
        marginTop: 12,
        fontSize: 16,
        fontWeight: '600',
        color: '#349DC5',
    },
    emptyEventsCard: {
        backgroundColor: '#349DC5',
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 26,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 3,
        marginTop: 4,
    },
    emptyEventsIconWrap: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.18)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.35)'
    },
    emptyEventsTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 8,
        textAlign: 'center',
        letterSpacing: 0.3
    },
    emptyEventsDesc: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.9)',
        lineHeight: 19,
        textAlign: 'center',
        marginBottom: 18,
        paddingHorizontal: 6
    },
    emptyEventsBtn: {
        backgroundColor: '#ffffff',
        paddingHorizontal: 20,
        paddingVertical: 11,
        borderRadius: 24,
        flexDirection: 'row',
        alignItems: 'center'
    },
    emptyEventsBtnText: {
        color: '#349DC5',
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.4
    },
    quickAccess: {
        marginTop: 10,
    },
    accessItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        borderColor: "#e5e9e9",
        borderWidth: 1,
        borderRadius: 10,
        padding: 10,
        display: 'flex',
        justifyContent: 'space-between',

    },
    accessText: {
        marginLeft: 10,
        fontSize: 15,
        fontWeight: '500',
    },
});
