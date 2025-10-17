import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PRIMARY_BLUE } from '../../AuthScreens/SuperAdmin/styles';
import { heightPercentageToDP, widthPercentageToDP } from 'react-native-responsive-screen';
import { useNavigation } from '@react-navigation/native';
import { FlashList, ListRenderItem, FlashListProps } from '@shopify/flash-list';
import type { ReportLeaderNavigationProp } from './SoulType';

import {
    FontAwesome,
    MaterialIcons,
    Ionicons,
    FontAwesome5,
    Foundation,
    MaterialCommunityIcons,
    Fontisto,
    FontAwesome6
} from '@expo/vector-icons';

// Relax the IconLibrary typing to avoid literal widening issues in array literals
// and conditional spreads. If stricter typing is needed later, narrow this back
// to specific union literals and add explicit "as const" assertions at usage sites.
type IconLibrary = string;

export type IconSpec = {
    library: IconLibrary;
    name: string;
    size?: number;
    color?: string;
};
interface FlashListWithEstimate<T> extends FlashListProps<T> {
    estimatedItemSize?: number;
}
type UnitType = 'chabod' | 'follow up' | 'other' | 'emporium' | 'recovery' | 'academy' | 'care' | 'watchtower';

type ReportItem = {
    key: string;
    title: string;
    icon: React.ReactElement;
    iconSpec?: IconSpec;
    onPress?: () => void;
};

export default function ReportLeader() {
    const navigation = useNavigation<ReportLeaderNavigationProp>();
    const [unitType] = useState<UnitType>('other'); // Example unit type, can be dynamic
    const [attendanceAllowed, setAttendanceAllowed] = useState<boolean>(false);
    const [musicAllowed, setMusicAllowed] = useState<boolean>(false);
    const [enabledCards, setEnabledCards] = useState<string[] | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const rawUser = await AsyncStorage.getItem('user');
                const token = await AsyncStorage.getItem('token');
                if (!rawUser || !token) return;
                const u = JSON.parse(rawUser);
                const unitId = (u?.roles || []).find((r:any) => r.role === 'UnitLeader' && r.unit)?.unit;
                if (!unitId) return;
                const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'https://streamsofjoyumuahia-api.onrender.com';
                const res = await fetch(`${API_BASE}/api/units`, { headers: { Authorization: `Bearer ${token}` } });
                const json = await res.json();
                if (json?.ok && Array.isArray(json.units)) {
                    const myUnit = json.units.find((x:any) => String(x._id) === String(unitId));
                    if (myUnit) {
                        if (myUnit.attendanceTaking) setAttendanceAllowed(true);
                        if (myUnit.musicUnit) setMusicAllowed(true);
                        if (Array.isArray(myUnit.enabledReportCards)) setEnabledCards(myUnit.enabledReportCards);
                    }
                }
            } catch {}
        })();
    }, []);

    const allItems: ReportItem[] = [
        {
            key: 'achievements',
            title: 'Unit Achievements',
            icon: <FontAwesome name="handshake-o" size={30} color="#349DC5" />,
            iconSpec: { library: 'FontAwesome', name: 'handshake-o', size: 30, color: '#349DC5' },
            onPress: () => navigation.navigate("Achievements")
        },
        {
            key: 'souls',
            title: 'Souls You Won',
            icon: <FontAwesome5 name="fire-alt" size={30} color="#FF5722" />,
            iconSpec: { library: 'FontAwesome5', name: 'fire-alt', size: 30, color: '#FF5722' },
            onPress: () =>navigation.navigate("SoulsWon")
        },
        {
            key: 'members', title: 'Unit Members Assisted', icon: <MaterialIcons name="people" size={30} color="#9C27B0" />, iconSpec: { library: 'MaterialIcons', name: 'people', size: 30, color: '#9C27B0' },onPress: () => navigation.navigate('UnitMember')
        },
        { key: 'invited', title: 'People You Invited to Church', icon: <Ionicons name="person-add" size={30} color="#4CAF50" />, iconSpec: { library: 'Ionicons', name: 'person-add', size: 30, color: '#4CAF50' } ,onPress: () => navigation.navigate('PeopleInvited')},
        { key: 'married', title: 'Unit Members That Got Married', icon: <Ionicons name="people" size={30} color="#2196F3" />, iconSpec: { library: 'Ionicons', name: 'people', size: 30, color: '#2196F3' },onPress: () => navigation.navigate('MembersMarried') },
        { key: 'external', title: 'External Invitations & Partnerships', icon: <MaterialIcons name="handshake" size={30} color="#FF9800" />, iconSpec: { library: 'MaterialIcons', name: 'handshake', size: 30, color: '#FF9800' },onPress: () => navigation.navigate('InviteAndPart')  },
        { key: 'songs', title: 'Songs Released', icon: <Fontisto name="applemusic" size={30} color="#980545" />, iconSpec: { library: 'Ionicons', name: 'musical-notes', size: 30, color: '#9C27B0' },onPress: () => navigation.navigate('SongReleased')  },
        { key: 'car', title: 'Car Packed', icon: <Ionicons name="car" size={30} color="#08b9ff" />, iconSpec: { library: 'Ionicons', name: 'car', size: 30, color: '#08b9ff' } },
        { key: 'women', title: 'Testimonies from Women', icon: <Foundation name="torsos-all-female" size={30} color="#08b9ff" />, iconSpec: { library: 'Foundation', name: 'torsos-all-female', size: 30, color: '#08b9ff' },onPress: () =>navigation.navigate("Testimonies") },
    ...(attendanceAllowed ? [{ key: 'attendance', title: 'Church Attendance', icon: <Foundation name="list-thumbnails" size={30} color="#000" />, iconSpec: { library: 'Foundation', name: 'list-thumbnails', size: 30, color: '#000' }, onPress: () => navigation.navigate("AttendanceHome") }] : []),
        { key: 'graduates', title: 'Graduated Student', icon: <FontAwesome5 name="user-graduate" size={30} color="#8c48f9" />, iconSpec: { library: 'FontAwesome5', name: 'user-graduate', size: 30, color: '#8c48f9' },onPress: () =>navigation.navigate("GraduatedStudents") },
        { key: 'recovery', title: 'Recovered Addicts', icon: <MaterialCommunityIcons name="email-receive" size={30} color="#494922" />, iconSpec: { library: 'MaterialCommunityIcons', name: 'email-receive', size: 30, color: '#494922' } ,onPress: () =>navigation.navigate("RecoveredAddict") },
        { key: 'emporium', title: 'Emporium Sales', icon: <Fontisto name="money-symbol" size={30} color="#209948" />, iconSpec: { library: 'Fontisto', name: 'money-symbol', size: 30, color: '#209948' },onPress: () =>navigation.navigate("Sales")  },
        { key: 'firstTimers', title: 'First Timers', icon: <FontAwesome6 name="people-roof" size={30} color="#4d3a4d" />, iconSpec: { library: 'FontAwesome5', name: 'people-arrows', size: 30, color: '#4d3a4d' }},
        { key: 'assigned', title: 'First Timers assigned by you', icon: <FontAwesome6 name="people-robbery" size={30} color="skyblue" />, iconSpec: { library: 'FontAwesome6', name: 'people-robbery', size: 30, color: 'skyblue' } },
        { key: 'marriedMembers', title: 'Members That Got Married', icon: <FontAwesome5 name="hand-holding-heart" size={30} color="gold" />, iconSpec: { library: 'FontAwesome5', name: 'hand-holding-heart', size: 30, color: 'gold' } },
        { key: 'church', title: 'Church Attendance', icon: <FontAwesome5 name="church" size={30} color="red" />, iconSpec: { library: 'FontAwesome5', name: 'church', size: 30, color: 'red' } }
    ];

    const filteredItems = useMemo(() => {
        // Start from base items and apply feature gating
        let base = [...allItems];

        // Gate Songs by music unit flag
        if (!musicAllowed) base = base.filter(i => i.key !== 'songs');

        // Gate optional report cards by enabledReportCards if provided
        const gatedKeys = new Set(['songs','recovery','emporium','firstTimers','assigned','marriedMembers']);
        if (enabledCards && enabledCards.length > 0) {
            const allowed = new Set(enabledCards);
            base = base.filter(i => !gatedKeys.has(i.key) || allowed.has(i.key));
        }

        if (unitType === 'chabod') {
            return base.filter(item =>
                ['achievements', 'souls', 'members', 'invited', 'married', 'external', 'songs'].includes(item.key)
            );
        } else if (unitType === 'follow up') {
            return base.filter(item =>
                ['achievements', 'souls', 'members', 'invited', 'married', 'firstTimers', 'assigned'].includes(item.key)
            );
        } else if (unitType === 'emporium') {
            return base.filter(item =>
                ['achievements', 'souls', 'members', 'invited', 'married', 'emporium'].includes(item.key)
            );
        } else if (unitType === 'recovery') {
            return base.filter(item =>
                ['achievements', 'souls', 'members', 'invited', 'recovery'].includes(item.key)
            );
        } else if (unitType === 'academy') {
            return base.filter(item =>
                ['achievements', 'souls', 'members', 'invited', 'attendance', 'graduates'].includes(item.key)
            );
        } else if (unitType === 'care') {
            return base.filter(item =>
                ['achievements', 'souls', 'members', 'invited', 'women'].includes(item.key)
            );
        } else if (unitType === 'watchtower') {
            return base.filter(item =>
                ['achievements', 'souls', 'members', 'invited', 'married', 'car'].includes(item.key)
            );
        }
        return base;
    }, [unitType, musicAllowed, enabledCards]);

    const renderItem: ListRenderItem<ReportItem> = ({ item }) => (
        <TouchableOpacity style={styles.card} onPress={item.onPress}>
            {item.icon}
            <Text style={styles.cardText}>{item.title}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={{ flex: 1, paddingBottom: heightPercentageToDP(10) }}>
            <StatusBar barStyle={"light-content"} backgroundColor={PRIMARY_BLUE} />
            <View style={styles.header}>

                <Text style={styles.headerText}>Reports</Text>

            </View>

            <FlashList
                {...({
                    data: filteredItems,
                    keyExtractor: (item) => item.key,
                    renderItem,
                    numColumns: 3,
                    estimatedItemSize: 100,
                    contentContainerStyle: styles.grid
                } as FlashListWithEstimate<ReportItem>)}
            />

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 25,
        paddingBottom: 20,
        paddingHorizontal: 20,
        marginBottom: 10,
        backgroundColor: PRIMARY_BLUE,
        width: widthPercentageToDP(100),
        zIndex: 20
    },
    headerText: {
        fontSize: 25,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textTransform:"capitalize",
        paddingTop: 10
    },
    grid: {
        paddingHorizontal: 5,
        marginTop: heightPercentageToDP(2),
        paddingBottom: heightPercentageToDP(5)
    },
    card: {
        flex: 1,
        margin: 6,
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 15,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        minHeight: 130
    },
    cardText: {
        fontSize: 14,
        textAlign: 'center',
        color: '#333',
        marginTop: 8
    }
});
