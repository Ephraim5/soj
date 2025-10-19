import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity, ScrollView, TextInput, Modal, RefreshControl } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@theme/colors';
import { FinanceType, recordFinance } from '../../../api/finance';
import { listFinanceCategories, addFinanceCategory, renameFinanceCategory } from '../../../api/financeCategories';

type RouteParams = { unitId?: string; type: FinanceType };

export default function FinanceRecordScreen(){
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const type: FinanceType = route.params?.type || 'income';
  const [unitId, setUnitId] = useState<string | null>(route.params?.unitId || null);
  const [categories, setCategories] = useState<string[]>([]);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameOriginal, setRenameOriginal] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [form, setForm] = useState<{ source?: string; amount: string; date?: string; description?: string }>({ amount: '' });
  const title = type==='income' ? 'Record New Income' : 'Record New Expense';
  // Error modal state
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorTitle, setErrorTitle] = useState('Error');
  const [errorMessage, setErrorMessage] = useState('');
  const showError = (title: string, message: string) => { setErrorTitle(title); setErrorMessage(message); setErrorOpen(true); };
  const [refreshing, setRefreshing] = useState(false);

  useEffect(()=>{ (async()=>{
    const raw = await AsyncStorage.getItem('user');
    const activeUnitId = await AsyncStorage.getItem('activeUnitId');
    if(!unitId && raw){
      const u = JSON.parse(raw);
      if(activeUnitId){ setUnitId(activeUnitId); }
      else { const match = (u?.roles||[]).find((r:any)=> r.role === u.activeRole && r.unit); if(match) setUnitId(String(match.unit)); }
    }
  })(); }, []);

  // Load categories per unit and type from backend; migrate any legacy local categories to server once
  useEffect(()=>{ (async()=>{
    if(!unitId) return;
    setCategories([]);
    try{
      const token = await AsyncStorage.getItem('token');
      if(!token) return;
      // One-time migration from any legacy local storage to server
      const legacyKey = `financeCategories:${unitId}:${type}`; // previously per-type
      const veryLegacyKey = `financeCategories:${unitId}`; // very old shared
      const legacyRaw = await AsyncStorage.getItem(legacyKey);
      const veryLegacyRaw = await AsyncStorage.getItem(veryLegacyKey);
      const toMigrate: string[] = [];
      if(legacyRaw){ try{ const arr = JSON.parse(legacyRaw); if(Array.isArray(arr)) toMigrate.push(...arr); }catch{} }
      if(!legacyRaw && type==='income' && veryLegacyRaw){ try{ const arr = JSON.parse(veryLegacyRaw); if(Array.isArray(arr)) toMigrate.push(...arr); }catch{} }
      if(toMigrate.length){
        await Promise.all(toMigrate.map(async (name)=>{ try{ await addFinanceCategory({ unitId, type, name }, token); }catch{} }));
        await AsyncStorage.removeItem(legacyKey);
        if(type==='income') await AsyncStorage.removeItem(veryLegacyKey);
      }
      const res = await listFinanceCategories({ unitId, type }, token);
      if(res?.ok){ setCategories(res.categories.map(c=> c.name).sort((a,b)=> a.localeCompare(b))); }
      else setCategories([]);
    }catch{ setCategories([]); }
  })(); }, [unitId, type]);

  const saveCategories = async(cats: string[])=>{
    // No longer saved locally; this just updates in-memory after server operations
    setCategories(cats);
  };

  const onRefresh = React.useCallback(async()=>{
    try{
      setRefreshing(true);
      // Ensure unitId is derived
      let uid = unitId;
      if(!uid){
        try{
          const raw = await AsyncStorage.getItem('user');
          const activeUnitId = await AsyncStorage.getItem('activeUnitId');
          if(raw){ const u = JSON.parse(raw); if(activeUnitId) uid = activeUnitId; else { const match = (u?.roles||[]).find((r:any)=> r.role === u.activeRole && r.unit); if(match) uid = String(match.unit); } }
        }catch{}
      }
      if(!uid) return;
      const token = await AsyncStorage.getItem('token'); if(!token) return;
      // Reload categories from server
      const res = await listFinanceCategories({ unitId: uid, type }, token);
      if(res?.ok){ setCategories(res.categories.map(c=> c.name).sort((a,b)=> a.localeCompare(b))); }
    } finally {
      setRefreshing(false);
    }
  }, [unitId, type]);

  const addCategory = async()=>{
    const name = newCategoryName.trim();
    if(!name) return;
    if(categories.some(c=> c.toLowerCase() === name.toLowerCase())){ showError('Duplicate Category', 'A category with this name already exists for this unit and type.'); return; }
    try{
      const token = await AsyncStorage.getItem('token'); if(!token) throw new Error('Missing token');
      await addFinanceCategory({ unitId: unitId!, type, name }, token);
      const res = await listFinanceCategories({ unitId: unitId!, type }, token);
      if(res?.ok){
        const next = res.categories.map(c=> c.name).sort((a,b)=> a.localeCompare(b));
        await saveCategories(next);
      }
      setForm(s=> ({ ...s, source: name }));
      setNewCategoryName(''); setCatModalOpen(false);
    }catch(e:any){ showError('Add Category Failed', e?.response?.data?.message || e?.message || 'Failed to add category'); }
  };

  const openRename = (cat: string)=>{
    setRenameOriginal(cat);
    setRenameValue(cat);
    setRenameOpen(true);
  };

  const saveRename = async()=>{
    const val = renameValue.trim();
    if(!val || !renameOriginal){ setRenameOpen(false); return; }
    const duplicate = categories.some(c=> c.toLowerCase() === val.toLowerCase() && c !== renameOriginal);
    if(duplicate){ showError('Duplicate Category', 'Another category with this name already exists.'); return; }
    try{
      const token = await AsyncStorage.getItem('token'); if(!token) throw new Error('Missing token');
      await renameFinanceCategory({ unitId: unitId!, type, from: renameOriginal, to: val }, token);
      const res = await listFinanceCategories({ unitId: unitId!, type }, token);
      if(res?.ok){
        const next = res.categories.map(c=> c.name).sort((a,b)=> a.localeCompare(b));
        await saveCategories(next);
      }
      setForm(s=> ({ ...s, source: s.source === renameOriginal ? val : s.source }));
      setRenameOpen(false);
      setRenameOriginal(null);
    }catch(e:any){ showError('Rename Failed', e?.response?.data?.message || e?.message || 'Failed to rename'); }
  };

  const getCategoryIcon = (name: string): { icon: keyof typeof Ionicons.glyphMap; color?: string } => {
    const n = name.toLowerCase();
    if(type === 'income'){
      if(/tithe|tithes/.test(n)) return { icon: 'cash-outline', color: '#16a34a' } as any;
      if(/offering|seed|pledge/.test(n)) return { icon: 'wallet-outline', color: '#0ea5b7' } as any;
      if(/partnership|donation|gift/.test(n)) return { icon: 'gift-outline', color: '#f59e0b' } as any;
      if(/worship|church|kingdom/.test(n)) return { icon: 'home-sharp', color: '#ff6ff9' } as any;
      if(/sunday|service|praise/.test(n)) return { icon: 'trophy-outline', color: '#94aff9' } as any;
      if(/sales|book|merch|shop/.test(n)) return { icon: 'cart-outline', color: '#0f172a' } as any;
      if(/welfare|support|aid/.test(n)) return { icon: 'heart-outline', color: '#ef4444' } as any;
      if(/project|building|fund/.test(n)) return { icon: 'briefcase-outline', color: '#3b82f6' } as any;
      return { icon: 'pricetag-outline', color: '#64748b' } as any;
    } else {
      if(/rent|lease|facility/.test(n)) return { icon: 'home-outline', color: '#3b82f6' } as any;
      if(/equipment|repair|maintenance|fix/.test(n)) return { icon: 'hammer-outline', color: '#0f172a' } as any;
      if(/transport|travel|fuel/.test(n)) return { icon: 'car-outline', color: '#16a34a' } as any;
      if(/medical|health/.test(n)) return { icon: 'medkit-outline', color: '#ef4444' } as any;
      if(/food|refreshment|catering/.test(n)) return { icon: 'cafe-outline', color: '#f59e0b' } as any;
      if(/printing|media|publicity/.test(n)) return { icon: 'print-outline', color: '#0ea5b7' } as any;
      return { icon: 'pricetag-outline', color: '#64748b' } as any;
    }
  };

  const submit = async()=>{
    try{
      if(!unitId) throw new Error('Missing unit');
      const token = await AsyncStorage.getItem('token'); if(!token) throw new Error('Missing token');
      const amountNum = Number(form.amount||0);
      await recordFinance({ unitId, type, amount: amountNum, source: form.source, description: form.description, date: form.date }, token);
      nav.goBack();
    }catch(e:any){ showError('Save Failed', e?.response?.data?.message || e?.message || 'Failed to save finance record'); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.header}>
        <TouchableOpacity onPress={()=> nav.goBack()} style={{ padding: 6 }}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Category */}
        <Text style={styles.label}>{type==='income'?'Income Type':'Expense Category'}</Text>
        <TouchableOpacity style={styles.inputLike} onPress={()=> setCatModalOpen(true)}>
          {form.source ? (
            <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
              {(() => { const { icon, color } = getCategoryIcon(form.source!); return (
                <View style={[styles.catIcon, { borderColor: color||'#cbd5e1', backgroundColor:'#f8fafc' }]}>
                  <Ionicons name={icon} size={16} color={color||'#334155'} />
                </View>
              ); })()}
              <Text style={styles.catText}>{form.source}</Text>
            </View>
          ) : (
            <Text style={{ color:'#9ca3af' }}>{type==='income'?'Select Income Source':'Select Expense Category'}</Text>
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
        <Text style={styles.label}>{type==='income'?'Notes/Description (Optional)':'Description / Purpose'}</Text>
        <TextInput placeholder={type==='income'?'e.g. Offering from Youth Retreat':'e.g.  Get-together Party Expense'} value={form.description} onChangeText={(t)=> setForm(s=>({...s, description:t}))} style={[styles.input, { height: 100 }]} multiline />

        <TouchableOpacity onPress={submit} style={[styles.primaryBtn, { marginTop: 16 }]}>
          <Text style={styles.primaryText}>Save and Submit</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Category selector / add modal */}
      <Modal visible={catModalOpen} transparent animationType="fade" onRequestClose={()=> setCatModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: 8 }}>
              <Text style={styles.modalTitle}>Add A New Category</Text>
              <TouchableOpacity onPress={()=> setCatModalOpen(false)}><Ionicons name="close" size={20} color="#111827" /></TouchableOpacity>
            </View>
            <TextInput placeholder="Enter category name" value={newCategoryName} onChangeText={setNewCategoryName} style={styles.input} />
            <TouchableOpacity style={styles.primaryBtn} onPress={addCategory}>
              <Text style={styles.primaryText}>Save and Upload</Text>
            </TouchableOpacity>
            {categories.length>0 && (
              <View style={{ marginTop: 12 }}>
                <Text style={{ fontWeight:'800', marginBottom:6 }}>Select existing</Text>
                <View style={styles.catListWrap}>
                  {categories.map(c=> {
                    const { icon, color } = getCategoryIcon(c);
                    return (
                      <TouchableOpacity key={c} style={styles.catRow} onPress={()=>{ setForm(s=>({...s, source:c})); setCatModalOpen(false); }}>
                        <View style={styles.catLeft}>
                          <View style={[styles.catIcon, { borderColor: color||'#cbd5e1', backgroundColor: '#f8fafc' }]}>
                            <Ionicons name={icon} size={16} color={color||'#334155'} />
                          </View>
                          <Text style={styles.catText}>{c}</Text>
                        </View>
                        <TouchableOpacity onPress={()=> openRename(c)} style={styles.catEditBtn}>
                          <Ionicons name="create-outline" size={16} color="#0ea5b7" />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Error modal */}
      <Modal visible={errorOpen} transparent animationType="fade" onRequestClose={()=> setErrorOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { borderWidth:1, borderColor: Colors.primary }]}>
            <View style={{ height: 4, backgroundColor: Colors.primary, borderRadius: 2, marginBottom: 10 }} />
            <View style={{ alignItems:'center', marginBottom:8 }}>
              <View style={{ width:56, height:56, borderRadius:28, backgroundColor:'#fee2e2', alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:'#fecaca' }}>
                <Ionicons name="alert-circle" size={28} color="#ef4444" />
              </View>
            </View>
            <Text style={[styles.modalTitle, { color:'#ef4444', textAlign:'center' }]}>{errorTitle}</Text>
            <Text style={{ color:'#111827', marginBottom: 12, textAlign:'center' }}>{errorMessage}</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={()=> setErrorOpen(false)}>
              <Text style={styles.primaryText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Rename category modal */}
      <Modal visible={renameOpen} transparent animationType="fade" onRequestClose={()=> setRenameOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: 8 }}>
              <Text style={styles.modalTitle}>Rename Category</Text>
              <TouchableOpacity onPress={()=> setRenameOpen(false)}><Ionicons name="close" size={20} color="#111827" /></TouchableOpacity>
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
  safe: {flexGrow: 1,paddingTop:30, backgroundColor:'#ffffff' },
  header: { height: 52, backgroundColor:'#ffffff', flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal: 8, borderBottomWidth:1, borderColor:'#e5e7eb' },
  headerTitle: { color:'#111827', fontWeight:'800', fontSize:16 },
  label: { color:'#111827', fontWeight:'700', marginTop: 12, marginBottom: 6 },
  inputLike: { borderWidth:1, borderColor:'#e5e7eb', borderRadius:10, paddingHorizontal: 12, paddingVertical: 12, flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  input: { borderWidth:1, borderColor:'#e5e7eb', borderRadius:10, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 10 },
  primaryBtn: { backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: 12, alignItems:'center', justifyContent:'center' },
  primaryText: { color:'#fff', fontWeight:'800' },
  modalBackdrop: { flex:1, backgroundColor:'rgba(0,0,0,0.2)', justifyContent:'center', alignItems:'center', padding: 20 },
  modalCard: { backgroundColor:'#fff', borderRadius:12, padding: 16, width:'86%' },
  modalTitle: { fontSize: 16, fontWeight:'800', marginBottom: 8 },
  menuRow: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical:10 },
  menuText: { color:'#111827', fontWeight:'700' },
  // Category list styles
  catListWrap: { borderTopWidth:1, borderColor:'#e5e7eb' },
  catRow: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical:10, borderBottomWidth:1, borderColor:'#f1f5f9' },
  catLeft: { flexDirection:'row', alignItems:'center', gap:10 },
  catIcon: { width:28, height:28, borderRadius:14, borderWidth:1, alignItems:'center', justifyContent:'center' },
  catText: { color:'#111827', fontWeight:'700' },
  catEditBtn: { padding:6, borderWidth:1, borderColor:'#bae6fd', backgroundColor:'#e0f2fe', borderRadius:8 },
});
