import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { FontAwesome, MaterialIcons, Ionicons, FontAwesome5, Foundation, MaterialCommunityIcons, Fontisto, FontAwesome6 } from '@expo/vector-icons';
import { PRIMARY_BLUE } from '../../AuthScreens/SuperAdmin/styles';
import { heightPercentageToDP, widthPercentageToDP } from 'react-native-responsive-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ReportLeader() {
    const [musicAllowed, setMusicAllowed] = useState(false);
    const [enabledCards, setEnabledCards] = useState<string[] | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const rawUser = await AsyncStorage.getItem('user');
                const token = await AsyncStorage.getItem('token');
                if (!rawUser || !token) return;
                const u = JSON.parse(rawUser);
                const unitId = (u?.roles || []).find((r:any) => r.role === 'Member' && r.unit)?.unit
                  || (u?.roles || []).find((r:any) => r.role === 'UnitLeader' && r.unit)?.unit;
                if (!unitId) return;
                const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'https://streamsofjoyumuahia-api.onrender.com';
                const res = await fetch(`${API_BASE}/api/units`, { headers: { Authorization: `Bearer ${token}` } });
                const json = await res.json();
                if (json?.ok && Array.isArray(json.units)) {
                    const myUnit = json.units.find((x:any) => String(x._id) === String(unitId));
                    if (myUnit) {
                        if (myUnit.musicUnit) setMusicAllowed(true);
                        if (Array.isArray(myUnit.enabledReportCards)) setEnabledCards(myUnit.enabledReportCards);
                    }
                }
            } catch {}
        })();
    }, []);

    const isCardEnabled = (key: string) => {
        const gatedKeys = new Set(['songs','recovery','emporium','firstTimers','assigned','marriedMembers']);
        if (!gatedKeys.has(key)) return true;
        if (!enabledCards || enabledCards.length === 0) return true; // default visible if not explicitly gated
        return enabledCards.includes(key);
    };

    return (
        <SafeAreaView style={{ flexGrow: 1 }}>
            <View style={styles.header}>

                <Text style={styles.headerText}>Reports</Text>
            </View>
            <ScrollView style={styles.container} scrollEnabled>

                <View style={styles.grid}>
                    <TouchableOpacity style={styles.card}>
                        <FontAwesome name="handshake-o" size={30} color="#349DC5" />
                        <Text style={styles.cardText}>Unit Achievements</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.card}>
                        <FontAwesome5 name="fire-alt" size={30} color="#FF5722" />
                        <Text style={styles.cardText}>Souls You Won</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.card}>
                        <MaterialIcons name="people" size={30} color="#9C27B0" />
                        <Text style={styles.cardText}>Unit Members Assisted</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.card}>
                        <Ionicons name="person-add" size={30} color="#4CAF50" />
                        <Text style={styles.cardText}>People You Invited to Church</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.card}>
                        <Ionicons name="people" size={30} color="#2196F3" />
                        <Text style={styles.cardText}>Unit Members That Got Married</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.card}>
                        <MaterialIcons name="handshake" size={30} color="#FF9800" />
                        <Text style={styles.cardText}>External Invitations & Partnerships</Text>
                    </TouchableOpacity>
                    {musicAllowed && isCardEnabled('songs') && (
                        <TouchableOpacity style={styles.card}>
                            <Ionicons name="musical-notes" size={30} color="#9C27B0" />
                            <Text style={styles.cardText}>Songs Released</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.card}>
                        <Ionicons name="car" size={30} color="#08b9ffff" />
                        <Text style={styles.cardText}>Car Packed</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.card}>
                        <Foundation name="torsos-all-female" size={30} color="#08b9ffff" />
                        <Text style={styles.cardText}>Testimonies from Women</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.card}>
                        <Foundation name="list-thumbnails" size={30} color="#000000" />
                        <Text style={styles.cardText}>Church Attendance</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.card}>
                        <FontAwesome5 name="user-graduate" size={30} color="#8c48f9ff" />
                        <Text style={styles.cardText}>Graduated Student</Text>
                    </TouchableOpacity>
                    {isCardEnabled('recovery') && (
                        <TouchableOpacity style={styles.card}>
                            <MaterialCommunityIcons name="email-receive" size={30} color="#494922" />
                            <Text style={styles.cardText}>Recovered Addicts</Text>
                        </TouchableOpacity>
                    )}
                    {isCardEnabled('emporium') && (
                        <TouchableOpacity style={styles.card}>
                            <Fontisto name="money-symbol" size={30} color="#209948" />
                            <Text style={styles.cardText}>Emporium Sales</Text>
                        </TouchableOpacity>
                    )}
                    {isCardEnabled('firstTimers') && (
                        <TouchableOpacity style={styles.card}>
                            <FontAwesome5 name="people-arrows" size={30} color="#4d3a4dff" />
                            <Text style={styles.cardText}>First Timers</Text>
                        </TouchableOpacity>
                    )}
                    {isCardEnabled('assigned') && (
                        <TouchableOpacity style={styles.card}>
                            <FontAwesome6 name="people-robbery" size={30} color="skyblue" />
                            <Text style={styles.cardText}>First Timers assigned by you</Text>
                        </TouchableOpacity>
                    )}
                    {isCardEnabled('marriedMembers') && (
                        <TouchableOpacity style={styles.card}>
                            <FontAwesome5 name="hand-holding-heart" size={30} color="gold" />
                            <Text style={styles.cardText}>Members That Got Married</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.card}>
                        <FontAwesome5 name="church" size={30} color="red" />
                        <Text style={styles.cardText}>Church Attendance</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 15,
        paddingBottom: 20,
        paddingHorizontal: 20,
        marginBottom: 20,
        backgroundColor: PRIMARY_BLUE,
        position: "absolute",
        left: 0,
        top: 0,
        right: 0,
        width: widthPercentageToDP(100),
        zIndex: 20,
    },

    headerText: {
        fontSize: 25,
        fontWeight: 'bold',
        color: "#FFFFFF",
        paddingTop: 10

    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
        paddingHorizontal: 10,
        marginTop: heightPercentageToDP(15),
        marginBottom: heightPercentageToDP(10)
    },
    card: {
        width: '40%',
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 15,
        marginBottom: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    cardText: {
        fontSize: 14,
        textAlign: 'center',
        color: '#333',
    },
});