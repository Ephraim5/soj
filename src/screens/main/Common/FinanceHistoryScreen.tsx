import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity, ScrollView, Modal, TextInput, Linking, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import axios from 'axios';
import { BASE_URl } from '@api/users';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@theme/colors';
import { FinanceDoc, FinanceType, deleteFinance, listFinance, recordFinance, updateFinance } from '@api/finance';
import * as Print from 'expo-print';
import { listFinanceCategories, addFinanceCategory, renameFinanceCategory } from '@api/financeCategories';


type RouteParams = { unitId?: string; type: FinanceType };

const currency = (n: number) => `₦${(n || 0).toLocaleString()}`;
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const formatDateLong = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const day = d.getDate();
  const suffix = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? 'st' : (n % 10 === 2 && n % 100 !== 12 ? 'nd' : (n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th')));
  return `${day}${suffix(day)} ${monthNames[d.getMonth()]}, ${d.getFullYear()}`;
};

export default function FinanceHistoryScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const isFocused = useIsFocused();
  const type: FinanceType = route.params?.type || 'income';
  const [unitId, setUnitId] = useState<string | null>(route.params?.unitId || null);
  const [items, setItems] = useState<FinanceDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<FinanceDoc | null>(null);
  const [form, setForm] = useState<{ amount: string; source?: string; description?: string; date?: string }>({ amount: '' });
  const [search, setSearch] = useState('');
  const [range, setRange] = useState<'7' | '30' | 'year' | 'all'>('all');
  const [rangePickerOpen, setRangePickerOpen] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  // Cache for resolving user IDs to names/phones
  const [userMap, setUserMap] = useState<Record<string, { name: string; phone?: string }>>({});
  // Categories per unit and type (separate lists for income vs expense)
  const [categories, setCategories] = useState<string[]>([]);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  // Rename category flow
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameOriginal, setRenameOriginal] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [role, setRole] = useState<string | undefined>();
  const [hasFinSecDuty, setHasFinSecDuty] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) return;
        const res = await axios.get(`${BASE_URl}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.data?.ok) return;
        const u = res.data.user || {};
        setRole(u?.activeRole);
        const roles = Array.isArray(u?.roles) ? u.roles : [];
        const storedActiveUnitId = await AsyncStorage.getItem('activeUnitId');
        let derivedUnitId: string | null = unitId;
        if (!derivedUnitId) {
          if (storedActiveUnitId) derivedUnitId = storedActiveUnitId;
          else {
            const match = roles.find((r: any) => r.role === (u.activeRole || '') && (r.unit || r.unitId));
            if (match) derivedUnitId = String(match.unit || match.unitId);
          }
        }
        if (derivedUnitId) setUnitId(derivedUnitId);
        // Duty check within the active unit context
        let has = false;
        if (derivedUnitId) {
          has = roles.some((r: any) => String(r.unit || r.unitId || '') === String(derivedUnitId) && Array.isArray(r.duties) && (r.duties.includes('FinancialSecretary') || r.duties.includes('Financial Secretary')));
        } else {
          has = roles.some((r: any) => Array.isArray(r.duties) && (r.duties.includes('FinancialSecretary') || r.duties.includes('Financial Secretary')));
        }
        setHasFinSecDuty(has);
      } catch { }
    })();
  }, []);

  const load = useMemo(() => async () => {
    if (!unitId) { setLoading(false); return; }
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token'); if (!token) throw new Error('Missing token');
      // Apply server-side range when possible
      let from: string | undefined; let to: string | undefined;
      const now = new Date();
      if (range === '7') {
        const d = new Date(); d.setDate(d.getDate() - 7); from = d.toISOString(); to = now.toISOString();
      } else if (range === '30') {
        const d = new Date(); d.setDate(d.getDate() - 30); from = d.toISOString(); to = now.toISOString();
      } else if (range === 'year') {
        const y0 = new Date(now.getFullYear(), 0, 1); const y1 = new Date(now.getFullYear(), 11, 31, 23, 59, 59); from = y0.toISOString(); to = y1.toISOString();
      }
      const res = await listFinance({ unitId, type, from, to }, token);
      if (res.ok) setItems(res.finances);
    } finally { setLoading(false); }
  }, [unitId, type, range]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (isFocused) load(); }, [isFocused]);

  const onRefresh = React.useCallback(async () => {
    try {
      setRefreshing(true);
      await load();
      if (unitId) {
        try {
          const token = await AsyncStorage.getItem('token');
          if (token) {
            const res = await listFinanceCategories({ unitId, type }, token);
            if (res?.ok) setCategories(res.categories.map(c => c.name).sort((a, b) => a.localeCompare(b)));
          }
        } catch { }
      }
    } finally {
      setRefreshing(false);
    }
  }, [load, unitId, type]);

  // Helper to format a user's full name from profile fields
  const formatUserName = (u: any): string => {
    const parts = [u?.firstName || u?.givenName, u?.middleName, u?.surname || u?.lastName || u?.familyName].filter(Boolean);
    return parts.length ? parts.join(' ') : (u?.email || u?.phone || 'User');
  };

  // After items load/update, resolve any addedBy/recordedBy IDs to names via API
  useEffect(() => {
    (async () => {
      try {
        if (!items || items.length === 0) return;
        const objectIdRe = /^[a-f\d]{24}$/i;
        // Collect candidate IDs that need lookup
        const ids = new Set<string>();
        for (const i of items) {
          const addedById = (i as any).addedBy;
          const recordedById = (i as any).recordedBy;
          const addedByName = (i as any).addedByName || (i as any).recordedByName;
          // If a name is already provided, skip; else if value looks like ObjectId and not cached, schedule fetch
          if (typeof addedById === 'string' && objectIdRe.test(addedById) && !userMap[addedById] && !addedByName) ids.add(addedById);
          if (typeof recordedById === 'string' && objectIdRe.test(recordedById) && !userMap[recordedById] && !addedByName) ids.add(recordedById);
        }
        if (ids.size === 0) return;
        const token = await AsyncStorage.getItem('token');
        if (!token) return;
        const headers = { Authorization: `Bearer ${token}` } as const;
        const fetched: Record<string, { name: string; phone?: string }> = { ...userMap };
        await Promise.all(Array.from(ids).map(async (id) => {
          try {
            const res = await axios.get(`${BASE_URl}/api/users/${id}`, { headers, timeout: 12000 });
            const user = res.data?.user || res.data;
            if (user) {
              fetched[id] = { name: formatUserName(user), phone: user?.phone };
            }
          } catch { /* ignore individual failures */ }
        }));
        setUserMap(fetched);
      } catch { /* ignore */ }
    })();
  }, [items]);

  const canMutate = role === 'Member' ? hasFinSecDuty : false; // only member with FinancialSecretary duty can add/edit/delete
  const isLeader = role === 'UnitLeader';
  const canRecord = (role === 'UnitLeader' || role === 'SuperAdmin' || role === 'MinistryAdmin' || (role === 'Member' && hasFinSecDuty));

  const openNew = () => { setEditing({ _id: 'new', type, amount: 0, date: new Date().toISOString() } as any); setForm({ amount: '' }); };
  const openEdit = (doc: FinanceDoc) => { setEditing(doc); setForm({ amount: String(doc.amount || 0), source: doc.source, description: doc.description, date: (doc.date || '').slice(0, 10) }); };
  const closeEdit = () => { setEditing(null); setForm({ amount: '' }); };

  const submit = async () => {
    try {
      const token = await AsyncStorage.getItem('token'); if (!token) throw new Error('Missing token');
      if (editing?._id === 'new') {
        await recordFinance({ unitId: unitId!, type, amount: Number(form.amount || 0), source: form.source, description: form.description, date: form.date }, token);
      } else if (editing) {
        await updateFinance(editing._id, { amount: Number(form.amount || 0), source: form.source, description: form.description, date: form.date }, token);
      }
      closeEdit(); await load();
    } catch (e: any) { alert(e.message || 'Failed'); }
  };

  const remove = async (id: string) => {
    try { const token = await AsyncStorage.getItem('token'); if (!token) throw new Error('Missing token'); await deleteFinance(id, token); await load(); }
    catch (e: any) { alert(e.message || 'Failed'); }
  };

  const exportPdf = async () => {
    try {
      const html = `<!doctype html><html><head><meta charset="utf-8"><style>
        body{ font-family: -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; }
        h1{ color:#0ea5b7; }
        table{ width:100%; border-collapse: collapse; }
        th,td{ border:1px solid #e5e7eb; padding:8px; font-size:12px; }
        th{ background:#f1f5f9; text-align:left }
      </style></head><body>
        <h1>${type === 'income' ? 'Income' : 'Expenses'} History</h1>
        <table><thead><tr><th>Date</th><th>Source</th><th>Description</th><th>Amount</th></tr></thead><tbody>
          ${items.map(i => `<tr><td>${new Date(i.date).toLocaleDateString()}</td><td>${i.source || ''}</td><td>${i.description || ''}</td><td>${currency(i.amount)}</td></tr>`).join('')}
        </tbody></table>
      </body></html>`;
      await Print.printAsync({ html });
    } catch (e: any) { alert(e.message || 'Export failed'); }
  };

  // Derived filtered items by search (client-side additional filter)
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i => {
      const dateStr = new Date(i.date).toLocaleDateString();
      return String(i.amount).toLowerCase().includes(q)
        || (i.source || '').toLowerCase().includes(q)
        || (i.description || '').toLowerCase().includes(q)
        || dateStr.toLowerCase().includes(q);
    });
  }, [items, search]);

  // Load categories for this unit and type from backend; migrate any legacy local categories to server once
  useEffect(() => {
    (async () => {
      if (!unitId) return;
      setCategories([]);
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) return;
        // One-time migration from any legacy local storage to server
        const legacyKey = `financeCategories:${unitId}:${type}`; // previously per-type
        const veryLegacyKey = `financeCategories:${unitId}`; // very old shared
        const legacyRaw = await AsyncStorage.getItem(legacyKey);
        const veryLegacyRaw = await AsyncStorage.getItem(veryLegacyKey);
        const toMigrate: string[] = [];
        if (legacyRaw) { try { const arr = JSON.parse(legacyRaw); if (Array.isArray(arr)) toMigrate.push(...arr); } catch { } }
        if (!legacyRaw && type === 'income' && veryLegacyRaw) { try { const arr = JSON.parse(veryLegacyRaw); if (Array.isArray(arr)) toMigrate.push(...arr); } catch { } }
        if (toMigrate.length) {
          // push each to server (ignore duplicates handled by 409)
          await Promise.all(toMigrate.map(async (name) => {
            try { await addFinanceCategory({ unitId, type, name }, token); } catch { }
          }));
          // cleanup legacy keys
          await AsyncStorage.removeItem(legacyKey);
          if (type === 'income') await AsyncStorage.removeItem(veryLegacyKey);
        }
        // Now load from server
        const res = await listFinanceCategories({ unitId, type }, token);
        if (res?.ok) { setCategories(res.categories.map(c => c.name).sort((a, b) => a.localeCompare(b))); }
        else setCategories([]);
      } catch { setCategories([]); }
    })();
  }, [unitId, type]);

  const saveCategories = async (cats: string[]) => {
    // Keep in-memory list in sync with server-created/renamed items
    setCategories(cats);
  };

  const addCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    if (categories.some(c => c.toLowerCase() === name.toLowerCase())) { alert('Category already exists'); return; }
    try {
      const token = await AsyncStorage.getItem('token'); if (!token) throw new Error('Missing token');
      await addFinanceCategory({ unitId: unitId!, type, name }, token);
      // reload from server to reflect canonical ordering
      const res = await listFinanceCategories({ unitId: unitId!, type }, token);
      if (res?.ok) setCategories(res.categories.map(c => c.name).sort((a, b) => a.localeCompare(b)));
      setNewCategoryName(''); setCatModalOpen(false);
    } catch (e: any) { alert(e?.response?.data?.message || e?.message || 'Failed to add category'); }
  };

  const openRename = (cat: string) => {
    setRenameOriginal(cat);
    setRenameValue(cat);
    setRenameOpen(true);
  };

  const saveRename = async () => {
    const val = renameValue.trim();
    if (!val || !renameOriginal) { setRenameOpen(false); return; }
    const duplicate = categories.some(c => c.toLowerCase() === val.toLowerCase() && c !== renameOriginal);
    if (duplicate) { alert('Another category with this name already exists'); return; }
    try {
      const token = await AsyncStorage.getItem('token'); if (!token) throw new Error('Missing token');
      await renameFinanceCategory({ unitId: unitId!, type, from: renameOriginal, to: val }, token);
      // refresh from server to maintain canonical ordering
      const res = await listFinanceCategories({ unitId: unitId!, type }, token);
      if (res?.ok) setCategories(res.categories.map(c => c.name).sort((a, b) => a.localeCompare(b)));
      setForm(s => ({ ...s, source: s.source === renameOriginal ? val : s.source }));
      setRenameOpen(false);
      setRenameOriginal(null);
    } catch (e: any) { alert(e?.response?.data?.message || e?.message || 'Failed to rename'); }
  };

  // Simple icon mapping per (income/expense) category name
  const getCategoryIcon = (name: string): { icon: keyof typeof Ionicons.glyphMap; color?: string } => {
    const n = name.toLowerCase();
    if (type === 'income') {
      if (/tithe|tithes/.test(n)) return { icon: 'cash-outline', color: '#16a34a' } as any;
      if (/offering|seed|pledge/.test(n)) return { icon: 'wallet-outline', color: '#0ea5b7' } as any;
      if (/partnership|donation|gift/.test(n)) return { icon: 'gift-outline', color: '#f59e0b' } as any;
      if (/sales|book|merch|shop/.test(n)) return { icon: 'cart-outline', color: '#0f172a' } as any;
      if (/welfare|support|aid/.test(n)) return { icon: 'heart-outline', color: '#ef4444' } as any;
      if (/project|building|fund/.test(n)) return { icon: 'briefcase-outline', color: '#3b82f6' } as any;
      return { icon: 'pricetag-outline', color: '#64748b' } as any;
    } else {
      if (/rent|lease|facility/.test(n)) return { icon: 'home-outline', color: '#3b82f6' } as any;
      if (/equipment|repair|maintenance|fix/.test(n)) return { icon: 'hammer-outline', color: '#0f172a' } as any;
      if (/transport|travel|fuel/.test(n)) return { icon: 'car-outline', color: '#16a34a' } as any;
      if (/medical|health/.test(n)) return { icon: 'medkit-outline', color: '#ef4444' } as any;
      if (/food|refreshment|catering/.test(n)) return { icon: 'cafe-outline', color: '#f59e0b' } as any;
      if (/printing|media|publicity/.test(n)) return { icon: 'print-outline', color: '#0ea5b7' } as any;
      return { icon: 'pricetag-outline', color: '#64748b' } as any;
    }
  };

  const openCall = (phone?: string) => { if (!phone) return; Linking.openURL(`tel:${phone}`); };
  const openSms = (phone?: string) => { if (!phone) return; Linking.openURL(`sms:${phone}`); };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={{ padding: 6 }}>
          <Ionicons name="chevron-back" size={22} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{type === 'income' ? 'Income' : 'Expense'} History</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Add Category icon (right side of header) */}
          {canRecord && (
            <TouchableOpacity onPress={() => setCatModalOpen(true)} style={{ paddingHorizontal: 8, paddingVertical: 6 }}>
              <Ionicons name="pricetags-outline" size={20} color="#000" />
            </TouchableOpacity>
          )}
          {isLeader && (
            <TouchableOpacity onPress={exportPdf} style={{ paddingHorizontal: 8, paddingVertical: 6 }}>
              <Ionicons name="download" size={20} color="#000" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Search and Range */}
        <View style={{ marginTop: 8 }} />
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color="#6b7280" />
          <TextInput
            placeholder={type === 'income' ? 'Search by date, type, amount, service type' : 'Search by date, Category, amount, ...'}
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
            style={{ flex: 1, paddingHorizontal: 8, paddingVertical: 0 }}
          />
        </View>
        {/* Filter + Record button row */}
        <View style={styles.controlsRow}>
          <TouchableOpacity style={styles.filterPill} onPress={() => setRangePickerOpen(true)}>
            <Ionicons name="calendar-outline" size={16} color="#111827" />
            <Text style={styles.filterPillText}>
              {range === '7' ? 'Last 7 days' : range === '30' ? 'Last 30 days' : range === 'year' ? 'This Year' : 'All Time'}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#111827" />
          </TouchableOpacity>
          {canRecord && (
            <TouchableOpacity style={styles.primaryBtnSm} onPress={() => nav.navigate('FinanceRecord' as never, { unitId, type } as never)}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.primaryTextSm}>{type === 'income' ? 'Record New Income' : 'Record New Expense'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* List */}
        {filteredItems.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="file-tray-outline" size={56} color={Colors.primary} />
            <Text style={{ color: '#111827', marginTop: 8, fontWeight: '700' }}>No records yet</Text>
          </View>
        ) : (
          filteredItems.map(i => {
            const amountColor = type === 'expense' ? '#ef4444' : '#0f172a';
            const providedName = (i as any).recordedByName || (i as any).addedByName;
            const idCandidate = (typeof (i as any).addedBy === 'string' && (i as any).addedBy)
              || (typeof (i as any).recordedBy === 'string' && (i as any).recordedBy)
              || undefined;
            const displayName = providedName
              || (idCandidate && userMap[idCandidate]?.name)
              || (i as any).addedBy
              || (i as any).recordedBy
              || '—';
            const phone = (i as any).recordedByPhone || (i as any).addedByPhone || (idCandidate ? userMap[idCandidate]?.phone : undefined);
            return (
              <View key={i._id} style={styles.card}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.cardDate}>{formatDateLong(i.date)}</Text>
                  {/* Right group: amount + ellipsis aligned to the right */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 5 }}>
                    <Text style={[styles.cardAmount, { color: amountColor, marginRight: canMutate ? 20 : 0 }]}>{currency(i.amount)}</Text>
                    {canMutate && (
                      <TouchableOpacity
                        onPress={() => setMenuFor(i._id)}
                        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 } as any}
                        style={{ padding: 0 }}
                      >
                        <Ionicons name="ellipsis-vertical" size={18} color="#111827" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                <Text style={styles.cardTitle}>{i.description || (i.source || '—')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {/* <View style={styles.avatar}>
                      <Ionicons name="person" size={14} color="#64748b" />
                    </View> */}
                    <View>
                      <Text style={{ color: '#0ea5b7', fontWeight: '700' }}>Added by: <Text style={{ color: '#0ea5b7' }}>{displayName}</Text></Text>
                      {/* <View style={{ flexDirection:'row', gap: 10, marginTop: 2 }}>
                        {!!phone && (
                          <TouchableOpacity onPress={()=> openCall(phone)} style={styles.iconBtn}><Ionicons name="call-outline" size={16} color="#111827" /></TouchableOpacity>
                        )}
                        {!!phone && (
                          <TouchableOpacity onPress={()=> openSms(phone)} style={styles.iconBtn}><Ionicons name="chatbubble-ellipses-outline" size={16} color="#111827" /></TouchableOpacity>
                        )}
                      </View> */}
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    {!!i.source && (
                      <View style={styles.chip}><Text style={styles.chipText}>{i.source}</Text></View>
                    )}

                  </View>
                </View>
                {/* Action menu */}
                <Modal visible={menuFor === i._id} transparent animationType="fade" onRequestClose={() => setMenuFor(null)}>
                  <View style={styles.menuBackdrop}>
                    <View style={styles.menuCard}>
                      <TouchableOpacity style={styles.menuRow} onPress={() => { setMenuFor(null); openEdit(i); }}>
                        <Ionicons name="create-outline" size={18} color="#111827" />
                        <Text style={styles.menuText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.menuRow} onPress={() => { setMenuFor(null); remove(i._id); }}>
                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                        <Text style={[styles.menuText, { color: '#ef4444' }]}>Delete</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.primaryBtn, { marginTop: 8 }]} onPress={() => setMenuFor(null)}>
                        <Text style={styles.primaryText}>Close</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Modal>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Full-screen form modal */}
      <Modal visible={!!editing} animationType="slide" transparent>
        <View style={styles.formBackdrop}>
          <View style={styles.formScreen}>
            <View style={styles.formHeader}>
              <TouchableOpacity onPress={closeEdit} style={{ padding: 6 }}>
                <Ionicons name="chevron-back" size={22} color="#111827" />
              </TouchableOpacity>
              <Text style={styles.formTitle}>{editing?._id === 'new' ? (type === 'income' ? 'Record New Income' : 'Record New Expense') : `Edit ${type === 'income' ? 'Income' : 'Expense'}`}</Text>
              <View style={{ width: 22 }} />
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
              {/* Category Picker */}
              <Text style={styles.label}>{type === 'income' ? 'Income Type' : 'Expense Category'}</Text>
              <TouchableOpacity style={styles.inputLike} onPress={() => {
                // open simple category selector modal
                setCatModalOpen(true);
              }}>
                {form.source ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {(() => {
                      const { icon, color } = getCategoryIcon(form.source!); return (
                        <View style={[styles.catIcon, { borderColor: color || '#cbd5e1', backgroundColor: '#f8fafc' }]}>
                          <Ionicons name={icon} size={16} color={color || '#334155'} />
                        </View>
                      );
                    })()}
                    <Text style={styles.catText}>{form.source}</Text>
                  </View>
                ) : (
                  <Text style={{ color: '#9ca3af' }}>{type === 'income' ? 'Select Income Source' : 'Select Expense Category'}</Text>
                )}
                <Ionicons name="chevron-down" size={16} color="#111827" />
              </TouchableOpacity>

              {/* Amount */}
              <Text style={styles.label}>Amount (₦)</Text>
              <TextInput
                placeholder={`Enter amount ${type === 'income' ? 'received' : 'spent'} (₦)`}
                value={(() => {
                  const v = form.amount || '';
                  if (!v) return v;
                  const [intPart, decPart] = v.split('.');
                  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                  return decPart !== undefined ? `${intFormatted}.${decPart}` : intFormatted;
                })()}
                onChangeText={(t) => {
                  // Keep an internal unformatted numeric string (no commas) so Number(...) works on submit
                  let cleaned = t.replace(/[^0-9.]/g, ''); // allow digits and dot
                  // Ensure only a single dot
                  const parts = cleaned.split('.');
                  if (parts.length > 1) {
                    cleaned = parts[0] + '.' + parts.slice(1).join('');
                  }
                  // Trim leading zeros (but keep single zero)
                  cleaned = cleaned.replace(/^0+([1-9])/, '$1');
                  setForm((s) => ({ ...s, amount: cleaned }));
                }}
                style={styles.input}
                keyboardType="number-pad"

              />

              {/* Date */}
              <Text style={styles.label}>Date {form.date ? '(YYYY-MM-DD)' : '(Optional, defaults to today)'}</Text>
              <TextInput
                placeholder="YYYY-MM-DD"
                value={form.date}
                onChangeText={(t) => {
                  // keep only digits, limit to 8 (YYYYMMDD)
                  const digits = t.replace(/\D/g, '').slice(0, 8);
                  const y = digits.slice(0, 4);
                  const m = digits.slice(4, 6);
                  const d = digits.slice(6, 8);
                  const formatted = y + (m ? '-' + m : '') + (d ? '-' + d : '');
                  setForm(s => ({ ...s, date: formatted }));
                }}
                style={styles.input}
                keyboardType="number-pad"
              />


              {/* Description */}
              <Text style={styles.label}>{type === 'income' ? ' Notes/Description (Optional)' : 'Description / Purpose'}</Text>
              <TextInput placeholder={type === 'income' ? 'e.g. Offering from Youth Retreat' : 'e.g. Get together Party Expense'} value={form.description} onChangeText={(t) => setForm(s => ({ ...s, description: t }))} style={[styles.input, { height: 100 }]} multiline />

              <TouchableOpacity onPress={submit} style={[styles.primaryBtn, { marginTop: 16 }]}>
                <Text style={styles.primaryText}>Save and Submit</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Date range modal */}
      <Modal visible={rangePickerOpen} transparent animationType="fade" onRequestClose={() => setRangePickerOpen(false)}>
        <View style={styles.menuBackdrop}>
          <View style={styles.menuCard}>
            {(['7', '30', 'year', 'all'] as const).map(r => (
              <TouchableOpacity key={r} style={styles.menuRow} onPress={() => { setRange(r); setRangePickerOpen(false); }}>
                <Text style={styles.menuText}>{r === '7' ? 'Last 7 days' : r === '30' ? 'Last 30 days' : r === 'year' ? 'This Year' : 'All Time'}</Text>
                {range === r && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.primaryBtn, { marginTop: 8 }]} onPress={() => setRangePickerOpen(false)}>
              <Text style={styles.primaryText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Category modal */}
      {/* Includes: create new category, list existing with icons and inline rename shortcut */}
      <Modal visible={catModalOpen} transparent animationType="fade" onRequestClose={() => setCatModalOpen(false)}>
        <View style={styles.modalWrap}>
          <View style={[styles.modalCard, { width: '86%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={styles.modalTitle}>Add A New Category</Text>
              <TouchableOpacity onPress={() => setCatModalOpen(false)}><Ionicons name="close" size={20} color="#111827" /></TouchableOpacity>
            </View>
            <TextInput placeholder="Enter category name" value={newCategoryName} onChangeText={setNewCategoryName} style={styles.input} />
            <TouchableOpacity style={styles.primaryBtn} onPress={addCategory}>
              <Text style={styles.primaryText}>Save and Upload</Text>
            </TouchableOpacity>
            {/* Existing list to select into form */}
            {categories.length > 0 && (
              <View style={{ marginTop: 12 }}>
                <Text style={{ fontWeight: '800', marginBottom: 6 }}>Categories</Text>
                <View style={styles.catListWrap}>
                  {categories.map(c => {
                    const { icon, color } = getCategoryIcon(c);
                    return (
                      <TouchableOpacity key={c} style={styles.catRow} onPress={() => { setForm(s => ({ ...s, source: c })); setCatModalOpen(false); }}>
                        <View style={styles.catLeft}>
                          <View style={[styles.catIcon, { borderColor: color || '#cbd5e1', backgroundColor: '#f8fafc' }]}>
                            <Ionicons name={icon} size={16} color={color || '#334155'} />
                          </View>
                          <Text style={styles.catText}>{c}</Text>
                        </View>
                        {canRecord && (
                          <TouchableOpacity onPress={() => openRename(c)} style={styles.catEditBtn}>
                            <Ionicons name="create-outline" size={16} color="#0ea5b7" />
                          </TouchableOpacity>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Rename category modal */}
      <Modal visible={renameOpen} transparent animationType="fade" onRequestClose={() => setRenameOpen(false)}>
        <View style={styles.modalWrap}>
          <View style={[styles.modalCard, { width: '86%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={styles.modalTitle}>Rename Category</Text>
              <TouchableOpacity onPress={() => setRenameOpen(false)}><Ionicons name="close" size={20} color="#111827" /></TouchableOpacity>
            </View>
            <TextInput placeholder="Enter new name" value={renameValue} onChangeText={setRenameValue} style={styles.input} />
            <TouchableOpacity style={styles.primaryBtn} onPress={saveRename}>
              <Text style={styles.primaryText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flexGrow: 1, paddingTop: 20, backgroundColor: '#ffffff' },
  header: { height: 52, backgroundColor: "#ffffff", flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
  headerTitle: { color: '#000', fontWeight: '800', fontSize: 16 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  muted: { color: '#334155' },
  bold: { fontWeight: '700', color: '#0f172a', fontSize: 16 },
  primaryBtn: { marginTop: 14, backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontWeight: '800' },
  primaryBtnSm: { backgroundColor: Colors.primary, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  primaryTextSm: { color: '#fff', fontWeight: '800', fontSize: 12 },
  smallBtn: { backgroundColor: Colors.primary, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, marginLeft: 8 },
  smallBtnText: { color: '#fff', fontWeight: '800' },
  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  modalTitle: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  // New styles for revamped UI
  secondaryBtn: { borderWidth: 1, borderColor: '#93c5fd', backgroundColor: '#e0f2fe', paddingVertical: 10, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: '#0c4a6e', fontWeight: '800' },
  searchWrap: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center' },
  controlsRow: { marginTop: 10, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  filterPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f3f4f6', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 },
  filterPillText: { color: '#111827', fontWeight: '600', marginRight: 6 },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 30 },
  card: { borderWidth: 1, borderColor: '#bae6fd', backgroundColor: '#ffffff', borderRadius: 12, padding: 14, marginBottom: 12 },
  cardDate: { color: '#6b7280', fontSize: 12 },
  cardAmount: { fontWeight: '800' },
  cardTitle: { color: '#111827', fontWeight: '700', marginTop: 6 },
  avatar: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  iconBtn: { padding: 6, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, backgroundColor: '#ffffff' },
  chip: { backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  chipText: { color: '#111827', fontSize: 12 },
  menuBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center' },
  menuCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, width: '80%' },
  menuRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  menuText: { color: '#111827', fontWeight: '700' },
  formBackdrop: { flex: 1, backgroundColor: '#f8fafc' },
  formScreen: { flex: 1, backgroundColor: '#ffffff' },
  formHeader: { height: 52, backgroundColor: '#ffffff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, borderBottomWidth: 1, borderColor: '#e5e7eb' },
  formTitle: { color: '#111827', fontWeight: '800', fontSize: 16 },
  label: { color: '#111827', fontWeight: '700', marginTop: 12, marginBottom: 6 },
  inputLike: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  // Category list styles
  catListWrap: { borderTopWidth: 1, borderColor: '#e5e7eb' },
  catRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  catLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catIcon: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  catText: { color: '#111827', fontWeight: '700' },
  catEditBtn: { padding: 6, borderWidth: 1, borderColor: '#bae6fd', backgroundColor: '#e0f2fe', borderRadius: 8 },
});
