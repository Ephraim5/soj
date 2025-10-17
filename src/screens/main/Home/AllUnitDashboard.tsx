import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  RefreshControl,
  Keyboard,
  Platform,
  ActivityIndicator,
  StatusBar,
  Touchable,
  TouchableWithoutFeedback,
} from "react-native";
import { InteractionManager } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { heightPercentageToDP as responsiveHeight } from "react-native-responsive-screen";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { PRIMARY_BLUE } from "../../AuthScreens/SuperAdmin/styles";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { BASE_URl } from "../../../api/users";

type RootStackParamList = {
  AllUnitDashboard: undefined;
  Dashboard: undefined;
  UnitLeaderProfile: { userId?: string; leaderId?: string; unitId?: string } | undefined;
  MemberList: { unitId: string } | undefined;
};

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "AllUnitDashboard"
>;

interface UnitDashboardItem {
  _id: string;
  name: string;
  leaderId?: string | null;
  leaderName: string;
  membersCount: number;
  activeCount: number;
  lastReportAt: string | null;
  ministryName?: string | null;
  church?: string | null;
}

export default function AllUnitDashboardsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<{ AllUnitDashboard: { restrictToMinistry?: boolean; ministry?: string } | undefined }, 'AllUnitDashboard'>>();

  const [search, setSearch] = useState<string>("");
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [data, setData] = useState<UnitDashboardItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [days, setDays] = useState<number>(14);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [ministry, setMinistry] = useState<string>('');
  const [ministryList, setMinistryList] = useState<string[]>([]);
  const [showMinistryPicker, setShowMinistryPicker] = useState<boolean>(false);

  const searchInputRef = useRef<TextInput>(null);
  const isMounted = useRef<boolean>(true);

  const filteredData = useMemo(() => {
    if (!search.trim()) return data;
    const lower = search.trim().toLowerCase();
    return data.filter(
      (u) =>
        u.name.toLowerCase().includes(lower) ||
        (u.leaderName || '').toLowerCase().includes(lower) ||
        (formatDate(u.lastReportAt) || '').toLowerCase().includes(lower)
    );
  }, [search, data]);

  const suggestions = useMemo(() => {
    if (!search.trim()) return [];
    const lower = search.trim().toLowerCase();
    const names = [...new Set(data.map((u) => u.name))];
    return names.filter(
      (n) => n.toLowerCase().startsWith(lower) && n.toLowerCase() !== lower
    );
  }, [search, data]);

  useEffect(() => {
    isMounted.current = true;
    // Default ministry scope when coming from Ministry Admin or when explicitly requested
    (async () => {
      try {
        const restrict = route?.params?.restrictToMinistry;
        const fromParam = route?.params?.ministry;
        if (restrict) {
          if (fromParam) {
            setMinistry(fromParam);
          } else {
            const raw = await AsyncStorage.getItem('user');
            if (raw) {
              const u = JSON.parse(raw);
              const role = (u?.roles || []).find((r: any) => r.role === 'MinistryAdmin');
              if (role?.ministryName) setMinistry(role.ministryName);
            }
          }
        } else {
          // If user is acting as MinistryAdmin and no explicit override, scope to their ministry
          const raw = await AsyncStorage.getItem('user');
          if (raw) {
            const u = JSON.parse(raw);
            if (u?.activeRole === 'MinistryAdmin') {
              const role = (u?.roles || []).find((r: any) => r.role === 'MinistryAdmin');
              if (role?.ministryName) setMinistry(role.ministryName);
            }
          }
        }
      } catch {}
    })();
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchUnits = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('No token');
      const params = new URLSearchParams();
      params.append('days', String(days));
      if (ministry) params.append('ministry', ministry);
      const res = await axios.get(`${BASE_URl}/api/units/dashboard?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data?.ok) {
        const list: UnitDashboardItem[] = (res.data.units || []).map((u: any) => ({
          _id: u._id,
          name: u.name,
          leaderId: u.leaderId || null,
          leaderName: u.leaderName || '_',
          membersCount: u.membersCount || 0,
          activeCount: u.activeCount || 0,
          lastReportAt: u.lastReportAt || null,
          ministryName: u.ministryName || null,
          church: u.church || null,
        }));
        if (isMounted.current) setData(list);
        // derive ministry list
        const mins: string[] = Array.from(new Set((res.data.units||[]).map((u:any)=>u.ministryName).filter(Boolean))) as string[];
        if (isMounted.current) setMinistryList(mins);
      }
    } catch (e) {
      // silently ignore for now; could show a toast
    } finally {
      setLoading(false);
    }
  }, [days, ministry]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUnits().finally(() => setRefreshing(false));
  }, [fetchUnits]);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => { fetchUnits(); });
    return () => task.cancel();
  }, [fetchUnits]);

  function formatDate(dt?: string | null) {
    if (!dt) return '';
    try {
      const d = new Date(dt);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  }

  const applySuggestion = (s: string) => {
    setSearch(s);
    setShowSuggestions(false);
    searchInputRef.current?.blur();
  };

  const renderUnitCard = ({ item }: { item: UnitDashboardItem }) => {
    const disabled = !item.leaderId;
    return (
    <TouchableWithoutFeedback disabled={disabled} onPress={() => navigation.navigate('UnitLeaderProfile', { userId: item.leaderId || undefined, unitId: item._id } as any)}>
      <View style={[styles.card, disabled && styles.cardDisabled]}>
        <Text style={styles.unitName}>{item.name}</Text>
        <Text style={styles.unitMeta}>
          Unit Leader: <Text style={styles.linkText} onPress={() => navigation.navigate('UnitLeaderProfile', { userId: item.leaderId || undefined, unitId: item._id } as any)}>{item.leaderName}</Text>
        </Text>
        {!!item.ministryName && (
          <Text style={styles.unitMeta}>Ministry: <Text style={styles.metaBlue}>{item.ministryName}</Text></Text>
        )}
        <Text style={styles.unitMeta}>
          Total Members: <Text style={styles.linkText} onPress={() => navigation.navigate('MemberList', { unitId: item._id } as any)}>{item.membersCount}</Text>
        </Text>
        <Text style={styles.unitMeta}>
          Active Members: <Text style={styles.metaGreen}>{item.activeCount}</Text>
        </Text>
        <Text style={styles.unitMeta}>
          Last Report Submitted: <Text style={styles.metaBlue}>{formatDate(item.lastReportAt) || '—'}</Text>
        </Text>
      </View>
    </TouchableWithoutFeedback>
  ); };

  return (
    <View style={styles.root}>
  <StatusBar barStyle={"dark-content"} />

      {/* Fixed Header */}
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          >
            <Ionicons name="arrow-back" size={22} color="#222" />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>All Unit Dashboards</Text>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search for a Unit"
            placeholderTextColor="#a5a5a5"
            value={search}
            onChangeText={(text) => {
              setSearch(text);
              setShowSuggestions(!!text);
            }}
            onFocus={() => setShowSuggestions(!!search)}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
        </View>

        {showSuggestions && suggestions.length > 0 && (
          <View style={styles.suggestionBoxInline}>
            {suggestions.map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => applySuggestion(s)}
                style={styles.suggestionItem}
                activeOpacity={0.65}
              >
                <Ionicons name="search" size={16} color="#349DC5" style={{ marginRight: 7 }} />
                <Text style={styles.suggestionText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Filter row (ministry) – hidden when restricted to a ministry */}
      {!(route?.params?.restrictToMinistry) && (
      <View style={{ paddingHorizontal:16, paddingTop:6 }}>
        <View style={{ flexDirection:'row', alignItems:'center' }}>
          <TouchableOpacity onPress={()=> setShowMinistryPicker(v=>!v)} style={{ paddingVertical:10, paddingHorizontal:12, borderWidth:1, borderColor:'#d4e4ef', borderRadius:8, backgroundColor:'#fff' }}>
            <Text style={{ color:'#14234b', fontWeight:'700' }}>{ministry ? `Ministry: ${ministry}` : 'Filter Ministry'}</Text>
          </TouchableOpacity>
          {ministry ? (
            <TouchableOpacity onPress={()=> setMinistry('')} style={{ marginLeft:10, paddingVertical:10, paddingHorizontal:12, borderRadius:8, backgroundColor:'#eef2f7' }}>
              <Text style={{ color:'#14234b', fontWeight:'700' }}>Clear</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {showMinistryPicker && (
          <View style={{ marginTop:8, borderWidth:1, borderColor:'#e2e8f0', borderRadius:8, backgroundColor:'#fff' }}>
            {ministryList.length ? ministryList.map(m => (
              <TouchableOpacity key={m} onPress={()=> { setMinistry(m); setShowMinistryPicker(false); }} style={{ padding:12, borderBottomWidth:StyleSheet.hairlineWidth, borderBottomColor:'#eaeaea' }}>
                <Text style={{ color:'#14234b' }}>{m}</Text>
              </TouchableOpacity>
            )) : (
              <View style={{ padding:12 }}><Text style={{ color:'#8a8a8a' }}>No ministries found</Text></View>
            )}
          </View>
        )}
      </View>
      )}

      {/* Scrollable list below */}
      {loading && data.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#349DC5" size="large" />
          <Text style={{ marginTop: 8, color: '#349DC5' }}>Loading dashboards…</Text>
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item._id}
          renderItem={renderUnitCard}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 30 }}>
              <Text style={{ color: "#888" }}>No unit found.</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          style={styles.list}
          showsVerticalScrollIndicator
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#349DC5"]}
              tintColor="#349DC5"
              progressViewOffset={50}
            />
          }
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "on-drag" : "on-drag"}
          onScrollBeginDrag={() => {
            setShowSuggestions(false);
            Keyboard.dismiss();
          }}
        />)}

      {/* {refreshing && (
        <View style={styles.refreshOverlay}>
          <ActivityIndicator color="#349DC5" size="large" />
        </View>
      )} */}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },

  headerContainer: {
    paddingTop: responsiveHeight(5),
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    zIndex: 10,
  },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 7 },
  backButton: { padding: 2, marginRight: 8 },
  screenTitle: {
    flex: 1,
    textAlign: "center",
    fontWeight: "600",
    fontSize: 17,
    color: "#212121",
    marginRight: 28,
  },
  searchWrap: {
    marginTop: 10,
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1.3,
    borderColor: "#d4e4ef",
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 15, color: "#181818", paddingVertical: 0, paddingLeft: 4 },
  searchIcon: { marginRight: 5 },

  suggestionBoxInline: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e2e2",
    borderRadius: 8,
    marginBottom: 10,
    maxHeight: 180,
    overflow: "hidden",
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#f2f2f2",
  },
  suggestionText: { fontSize: 15, color: "#181818" },

  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 80, paddingTop: 10 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 15,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: PRIMARY_BLUE,
  },
  // style applied when a card is disabled (no leader) to indicate reduced emphasis
  cardDisabled: {
    opacity: 0.6,
    backgroundColor: "#f7fbfd",
    borderColor: "#dbeef6",
  },
  unitName: { fontWeight: "700", fontSize: 16, color: "#14234b", marginBottom: 2 },
  unitMeta: { fontSize: 14, color: "#333", lineHeight: 22 },
  unitMetaValue: { color: "#222", fontWeight: "500" },
  metaRed: { color: "#e53935", fontWeight: "700" },
  metaGreen: { color: "#1dcc79", fontWeight: "700" },
  metaBlue: { color: "#349DC5", fontWeight: "600", textDecorationLine: "underline" },
  linkText: { color: "#349DC5", fontWeight: "700", textDecorationLine: "underline" },

  refreshOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 200,
    elevation: 10,
  },
});
