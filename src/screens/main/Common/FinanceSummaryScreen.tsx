import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity, ScrollView, TextInput, Modal, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@theme/colors';
import { FinanceDoc, FinanceSummary, getFinanceSummary, listFinance } from '@api/finance';
import Svg, { G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { heightPercentageToDP, widthPercentageToDP } from 'react-native-responsive-screen';
import { PRIMARY_BLUE } from '@screens/AuthScreens/SuperAdmin/styles';

type RouteParams = { unitId?: string };

const currency = (n: number) => `₦${(n || 0).toLocaleString()}`;
// Compact currency: ₦3.9K / ₦3.9M / ₦2.1B / ₦1.2T ...
function formatCompactCurrency(n: number): string {
  const isNeg = n < 0;
  const abs = Math.abs(n || 0);
  const units = [
    { value: 1e12, symbol: 'T' }, // Trillion
    { value: 1e9, symbol: 'B' },  // Billion
    { value: 1e6, symbol: 'M' },  // Million
    { value: 1e3, symbol: 'K' },  // Thousand
  ];
  for (const u of units) {
    if (abs >= u.value) {
      const v = abs / u.value;
      const str = v.toFixed(1).replace(/\.0$/, '');
      return `${isNeg ? '-' : ''}₦${str}${u.symbol}`;
    }
  }
  return `${isNeg ? '-' : ''}₦${abs.toLocaleString()}`;
}
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function formatMonthLabel(d: Date) {
  return `${monthNames[d.getMonth()]}, ${d.getFullYear()}`;
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} L ${cx} ${cy} Z`;
}
function polarToCartesian(cx: number, cy: number, r: number, angleInDeg: number) {
  const angleInRad = (angleInDeg - 90) * Math.PI / 180.0;
  return { x: cx + (r * Math.cos(angleInRad)), y: cy + (r * Math.sin(angleInRad)) };
}

// Helper: parse a byMonth key into numeric year/month
function parseMonthKey(key: string): { y: number; m: number } | null {
  // Format: YYYY-MM or YYYY/M
  let m = key.match(/(\d{4})[-/](\d{1,2})/);
  if (m) {
    const y = Number(m[1]);
    const mo = Math.min(Math.max(Number(m[2]), 1), 12);
    return { y, m: mo };
  }
  // Format: MonthName, YYYY
  let m2 = key.match(/([A-Za-z]+),?\s+(\d{4})/);
  if (m2) {
    const name = m2[1].toLowerCase();
    const idx = monthNames.findIndex(n => n.toLowerCase() === name);
    const y = Number(m2[2]);
    if (idx >= 0) return { y, m: idx + 1 };
  }
  // Format: YYYY MonthName
  let m3 = key.match(/(\d{4})\s+([A-Za-z]+)/);
  if (m3) {
    const y = Number(m3[1]);
    const name = m3[2].toLowerCase();
    const idx = monthNames.findIndex(n => n.toLowerCase() === name);
    if (idx >= 0) return { y, m: idx + 1 };
  }
  // Fallback: try just year
  let m4 = key.match(/(\d{4})/);
  if (m4) return { y: Number(m4[1]), m: 1 };
  return null;
}

function labelForMonth(y: number, m: number) {
  const mm = Math.min(Math.max(m, 1), 12);
  return `${monthNames[mm - 1]}, ${y}`;
}

// Map category names to Ionicons icon names; fallback to 'list-outline'
function iconForCategory(name: string): keyof typeof Ionicons.glyphMap {
  const n = (name || '').toLowerCase();
  const has = (s: string) => n.includes(s);
  if (has('tithe') || has('offering') || has('seed') || has('donation')) return 'cash-outline';
  if (has('sale') || has('shop') || has('book') || has('merch')) return 'cart-outline';
  if (has('rent') || has('lease') || has('building') || has('accommodation')) return 'home-outline';
  if (has('project') || has('construct') || has('build')) return 'construct-outline';
  if (has('utilit') || has('power') || has('electric') || has('generator') || has('diesel') || has('fuel')) return 'flash-outline';
  if (has('transport') || has('logistic') || has('bus') || has('car') || has('travel')) return 'car-outline';
  if (has('salary') || has('wage') || has('stipend') || has('allowance') || has('payroll')) return 'wallet-outline';
  if (has('mainten') || has('repair') || has('service')) return 'build-outline';
  if (has('equip') || has('asset')) return 'cube-outline';
  if (has('print') || has('stationer')) return 'print-outline';
  if (has('internet') || has('data') || has('telecom') || has('network')) return 'globe-outline';
  if (has('phone') || has('airtime') || has('call')) return 'call-outline';
  if (has('medical') || has('health') || has('clinic') || has('hospital') || has('medic') || has('insurance')) return 'medkit-outline';
  if (has('food') || has('refresh') || has('meal') || has('cater')) return 'fast-food-outline';
  if (has('event') || has('conference') || has('workshop')) return 'calendar-outline';
  if (has('outreach') || has('evangel')) return 'megaphone-outline';
  if (has('gift')) return 'gift-outline';
  return 'list-outline';
}

export default function FinanceSummaryScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const [unitId, setUnitId] = useState<string | null>(route.params?.unitId || null);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [unitLabel, setUnitLabel] = useState<string>('');
  const [search, setSearch] = useState('');
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  const [incomeDocs, setIncomeDocs] = useState<FinanceDoc[]>([]);
  const [expenseDocs, setExpenseDocs] = useState<FinanceDoc[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>(Array.from({ length: currentYear - 2016 + 1 }, (_, i) => currentYear - i));
  // Full-amount modal state
  const [amountModalOpen, setAmountModalOpen] = useState(false);
  const [amountModalTitle, setAmountModalTitle] = useState('');
  const [amountModalValue, setAmountModalValue] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  // Direct month comparison caches (exact from backend)
  const [compareCur, setCompareCur] = useState<{ y: number; m: number; income: number; expense: number } | null>(null);
  const [comparePrev, setComparePrev] = useState<{ y: number; m: number; income: number; expense: number } | null>(null);
  // Expand/collapse for monthly sections
  const [showAllIncomeMonths, setShowAllIncomeMonths] = useState(false);
  const [showAllExpenseMonths, setShowAllExpenseMonths] = useState(false);
  // Category filters per section
  const [incomeCategory, setIncomeCategory] = useState<string | null>(null);
  const [expenseCategory, setExpenseCategory] = useState<string | null>(null);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState<null | 'income' | 'expense'>(null);

  // Helper: fetch precise current vs previous month totals for a given unit/year
  const fetchCompareFor = useCallback(async (uid: string, y: number) => {
    try {
      const token = await AsyncStorage.getItem('token'); if (!token) return;
      const now = new Date();
      const isCurrentYear = y === now.getFullYear();
      const curY = y;
      const curM = isCurrentYear ? (now.getMonth() + 1) : 12;
      const prevY = curM === 1 ? (curY - 1) : curY;
      const prevM = curM === 1 ? 12 : (curM - 1);

      const monthRange = (yy: number, mm: number) => {
        const from = new Date(Date.UTC(yy, mm - 1, 1, 0, 0, 0, 0)).toISOString();
        const to = new Date(Date.UTC(yy, mm, 0, 23, 59, 59, 999)).toISOString();
        return { from, to };
      };

      const { from: fromCur, to: toCur } = monthRange(curY, curM);
      const { from: fromPrev, to: toPrev } = monthRange(prevY, prevM);

      const [curIncRes, curExpRes, prevIncRes, prevExpRes] = await Promise.all([
        listFinance({ unitId: uid, type: 'income', from: fromCur, to: toCur }, token),
        listFinance({ unitId: uid, type: 'expense', from: fromCur, to: toCur }, token),
        listFinance({ unitId: uid, type: 'income', from: fromPrev, to: toPrev }, token),
        listFinance({ unitId: uid, type: 'expense', from: fromPrev, to: toPrev }, token),
      ]);

      const sumAmount = (docs: any) => ((docs?.finances || []) as Array<{ amount?: number }>)
        .reduce((a, d) => a + (d.amount || 0), 0);
      const curV = { y: curY, m: curM, income: sumAmount(curIncRes), expense: sumAmount(curExpRes) };
      const prevV = { y: prevY, m: prevM, income: sumAmount(prevIncRes), expense: sumAmount(prevExpRes) };
      setCompareCur(curV);
      setComparePrev(prevV);
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      try {
        // Derive unitId from active role if not provided
        if (!unitId) {
          const raw = await AsyncStorage.getItem('user');
          if (raw) {
            const u = JSON.parse(raw);
            const match = (u?.roles || []).find((r: any) => r.role === u.activeRole && r.unit);
            if (match) { setUnitId(String(match.unit)); setUnitLabel(match.unitName || match.unitLabel || match.ministryName || ''); }
          }
        }
      } finally { }
    })();
  }, []);

  // Load summary (availableYears now spans 2016..current)
  useEffect(() => {
    (async () => {
      if (!unitId) { setLoading(false); return; }
      try {
        setLoading(true);
        const token = await AsyncStorage.getItem('token'); if (!token) throw new Error('Missing token');
        const res = await getFinanceSummary(unitId, token);
        if (res.ok) {
          setSummary(res.summary);
          // keep current selected year if within range; otherwise clamp to currentYear
          setYear(prev => (prev >= 2016 && prev <= currentYear) ? prev : currentYear);
        }
      } catch (e) { } finally { setLoading(false); }
    })();
  }, [unitId]);

  // Load incomes/expenses for selected year and unit; apply search filter later in memo
  useEffect(() => {
    (async () => {
      if (!unitId) return;
      try {
        const token = await AsyncStorage.getItem('token'); if (!token) return;
        const from = new Date(Date.UTC(year, 0, 1, 0, 0, 0)).toISOString();
        const to = new Date(Date.UTC(year, 11, 31, 23, 59, 59)).toISOString();
        const [inc, exp] = await Promise.all([
          listFinance({ unitId, type: 'income', from, to }, token),
          listFinance({ unitId, type: 'expense', from, to }, token)
        ]);
        setIncomeDocs((inc as any)?.finances || []);
        setExpenseDocs((exp as any)?.finances || []);
      } catch (e) { }
    })();
  }, [unitId, year]);

  // Fetch exact current vs previous month totals from backend to ensure precision
  useEffect(() => {
    (async () => {
      if (!unitId) return;
      await fetchCompareFor(unitId, year);
    })();
  }, [unitId, year, fetchCompareFor]);

  // Pull-to-refresh handler
  const onRefresh = React.useCallback(async () => {
    try {
      setRefreshing(true);
      // Ensure we have a unitId; if missing, try to derive from cached user
      let uid = unitId;
      if (!uid) {
        try {
          const raw = await AsyncStorage.getItem('user');
          if (raw) {
            const u = JSON.parse(raw);
            const match = (u?.roles || []).find((r: any) => r.role === u.activeRole && r.unit);
            if (match) uid = String(match.unit);
          }
        } catch {}
      }
      if (!uid) return;
      const token = await AsyncStorage.getItem('token'); if (!token) return;
      // Refresh summary
      try {
        const res = await getFinanceSummary(uid, token);
        if (res?.ok) setSummary(res.summary);
      } catch {}
      // Refresh docs for current year
      const from = new Date(Date.UTC(year, 0, 1, 0, 0, 0)).toISOString();
      const to = new Date(Date.UTC(year, 11, 31, 23, 59, 59)).toISOString();
      try {
        const [inc, exp] = await Promise.all([
          listFinance({ unitId: uid, type: 'income', from, to }, token),
          listFinance({ unitId: uid, type: 'expense', from, to }, token)
        ]);
        setIncomeDocs((inc as any)?.finances || []);
        setExpenseDocs((exp as any)?.finances || []);
      } catch {}
      // Refresh precise month comparison
      try { await fetchCompareFor(uid, year); } catch {}
    } finally {
      setRefreshing(false);
    }
  }, [unitId, year]);

  // Keep data fresh when screen regains focus (e.g., after adding/editing records)
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          let uid = unitId;
          if (!uid) {
            try {
              const raw = await AsyncStorage.getItem('user');
              if (raw) {
                const u = JSON.parse(raw);
                const match = (u?.roles || []).find((r: any) => r.role === u.activeRole && r.unit);
                if (match) uid = String(match.unit);
              }
            } catch {}
          }
          if (!uid || cancelled) return;
          const token = await AsyncStorage.getItem('token'); if (!token) return;
          try {
            const res = await getFinanceSummary(uid, token);
            if (!cancelled && res?.ok) setSummary(res.summary);
          } catch {}
          const from = new Date(Date.UTC(year, 0, 1, 0, 0, 0)).toISOString();
          const to = new Date(Date.UTC(year, 11, 31, 23, 59, 59)).toISOString();
          try {
            const [inc, exp] = await Promise.all([
              listFinance({ unitId: uid, type: 'income', from, to }, token),
              listFinance({ unitId: uid, type: 'expense', from, to }, token)
            ]);
            if (!cancelled) {
              setIncomeDocs((inc as any)?.finances || []);
              setExpenseDocs((exp as any)?.finances || []);
            }
          } catch {}
          await fetchCompareFor(uid, year);
        } catch {}
      })();
      return () => { cancelled = true; };
    }, [unitId, year, fetchCompareFor])
  );

  // Search filter predicate
  const matches = (d: FinanceDoc) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const dateStr = new Date(d.date).toLocaleDateString();
    return (d.source || '').toLowerCase().includes(q) || (d.description || '').toLowerCase().includes(q) || dateStr.toLowerCase().includes(q);
  };

  // Group and aggregate by month and category (source)
  type GroupRow = { monthLabel: string; total: number; items: Array<{ label: string; amount: number }> };
  const incomeBreakdown = useMemo<GroupRow[]>(() => {
    const map = new Map<string, { total: number; cats: Map<string, number> }>();
    for (const d of incomeDocs.filter(matches)) {
      // Filter by selected category (income)
      const catName = (d.source || '—');
      if (incomeCategory && catName !== incomeCategory) continue;
      const dt = new Date(d.date);
      const key = `${dt.getFullYear()}-${dt.getMonth() + 1}`;
      const label = `${monthNames[dt.getMonth()]}, ${dt.getFullYear()}`;
      if (!map.has(key)) map.set(key, { total: 0, cats: new Map() });
      const entry = map.get(key)!;
      entry.total += d.amount || 0;
      const cat = catName;
      entry.cats.set(cat, (entry.cats.get(cat) || 0) + (d.amount || 0));
      (entry as any).label = label;
    }
    const monthEntries = Array.from(map.entries()) as Array<[string, { total: number; cats: Map<string, number>; label: string }]>;
    const rows: GroupRow[] = monthEntries
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([_, v]) => {
        const catEntries = Array.from(v.cats.entries()) as Array<[string, number]>;
        return {
          monthLabel: v.label,
          total: v.total,
          items: catEntries.sort(([, a], [, b]) => (b || 0) - (a || 0)).map(([label, amount]) => ({ label, amount }))
        };
      });
    return rows;
  }, [incomeDocs, search, incomeCategory, year]);

  const expenseBreakdown = useMemo<GroupRow[]>(() => {
    const map = new Map<string, { total: number; cats: Map<string, number> }>();
    for (const d of expenseDocs.filter(matches)) {
      // Filter by selected category (expense)
      const catName = (d.source || '—');
      if (expenseCategory && catName !== expenseCategory) continue;
      const dt = new Date(d.date);
      const key = `${dt.getFullYear()}-${dt.getMonth() + 1}`;
      const label = `${monthNames[dt.getMonth()]}, ${dt.getFullYear()}`;
      if (!map.has(key)) map.set(key, { total: 0, cats: new Map() });
      const entry = map.get(key)!;
      entry.total += d.amount || 0;
      const cat = catName;
      entry.cats.set(cat, (entry.cats.get(cat) || 0) + (d.amount || 0));
      (entry as any).label = label;
    }
    const monthEntries = Array.from(map.entries()) as Array<[string, { total: number; cats: Map<string, number>; label: string }]>;
    const rows: GroupRow[] = monthEntries
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([_, v]) => {
        const catEntries = Array.from(v.cats.entries()) as Array<[string, number]>;
        return {
          monthLabel: v.label,
          total: v.total,
          items: catEntries.sort(([, a], [, b]) => (b || 0) - (a || 0)).map(([label, amount]) => ({ label, amount }))
        };
      });
    return rows;
  }, [expenseDocs, search, expenseCategory, year]);

  // Category options per section (unique sources for selected year)
  const incomeCategories = useMemo(() => {
    const set = new Set<string>();
    for (const d of incomeDocs) {
      const dt = new Date(d.date); if (dt.getFullYear() !== year) continue;
      const name = d.source || '—';
      set.add(name);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [incomeDocs, year]);

  const expenseCategories = useMemo(() => {
    const set = new Set<string>();
    for (const d of expenseDocs) {
      const dt = new Date(d.date); if (dt.getFullYear() !== year) continue;
      const name = d.source || '—';
      set.add(name);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [expenseDocs, year]);


  const comparisonInfo = useMemo(() => {
    const byMonth = (summary?.byMonth || {}) as Record<string, { income?: number; expense?: number }>;
    const parsedSummary = Object.entries(byMonth)
      .map(([k, v]) => ({ key: k, y: parseMonthKey(k)?.y, m: parseMonthKey(k)?.m, income: v.income || 0, expense: v.expense || 0 }))
      .filter(e => e.y && e.m) as Array<{ key: string; y: number; m: number; income: number; expense: number }>;

    // Build month totals from loaded docs for the selected year
    const monthTotals: Record<number, { income: number; expense: number }> = {};
    for (const d of incomeDocs) {
      const dt = new Date(d.date); if (dt.getFullYear() !== year) continue;
      const m = dt.getMonth() + 1; if (!monthTotals[m]) monthTotals[m] = { income: 0, expense: 0 };
      monthTotals[m].income += d.amount || 0;
    }
    for (const d of expenseDocs) {
      const dt = new Date(d.date); if (dt.getFullYear() !== year) continue;
      const m = dt.getMonth() + 1; if (!monthTotals[m]) monthTotals[m] = { income: 0, expense: 0 };
      monthTotals[m].expense += d.amount || 0;
    }

    // Choose comparison months:
    // - If viewing the current year, use the actual current calendar month.
    // - Otherwise, use December for the selected year.
    const now = new Date();
    const isCurrentYear = year === now.getFullYear();
    const curY = year;
    const curM = isCurrentYear ? (now.getMonth() + 1) : 12;
    const prevY = curM === 1 ? (curY - 1) : curY;
    const prevM = curM === 1 ? 12 : (curM - 1);

    // Prefer exact backend-fetched month totals when available
    let curIncome = 0, curExpense = 0, prevIncome = 0, prevExpense = 0;
    if (compareCur && compareCur.y === curY && compareCur.m === curM) {
      curIncome = compareCur.income || 0; curExpense = compareCur.expense || 0;
    } else {
      const curFromDocs = monthTotals[curM];
      curIncome = curFromDocs?.income || 0; curExpense = curFromDocs?.expense || 0;
      if (!curFromDocs) {
        const s = parsedSummary.find(e => e.y === curY && e.m === curM);
        if (s) { curIncome = s.income || 0; curExpense = s.expense || 0; }
      }
    }
    // If fetched month returned zero but our docs/summary indicate activity, prefer the fallback
    if ((curIncome + curExpense) === 0) {
      const curFromDocs2 = monthTotals[curM];
      if (curFromDocs2 && ((curFromDocs2.income || 0) + (curFromDocs2.expense || 0) > 0)) {
        curIncome = curFromDocs2.income || 0;
        curExpense = curFromDocs2.expense || 0;
      } else {
        const s2 = parsedSummary.find(e => e.y === curY && e.m === curM);
        if (s2 && ((s2.income || 0) + (s2.expense || 0) > 0)) {
          curIncome = s2.income || 0;
          curExpense = s2.expense || 0;
        }
      }
    }
    if (comparePrev && comparePrev.y === prevY && comparePrev.m === prevM) {
      prevIncome = comparePrev.income || 0; prevExpense = comparePrev.expense || 0;
    } else {
      if (prevY === year && monthTotals[prevM]) {
        prevIncome = monthTotals[prevM].income || 0;
        prevExpense = monthTotals[prevM].expense || 0;
      } else {
        const sPrev = parsedSummary.find(e => e.y === prevY && e.m === prevM);
        if (sPrev) { prevIncome = sPrev.income || 0; prevExpense = sPrev.expense || 0; }
      }
    }
    // If fetched prev month returned zero but docs/summary indicate activity, prefer fallback
    if ((prevIncome + prevExpense) === 0) {
      if (prevY === year && monthTotals[prevM] && ((monthTotals[prevM].income || 0) + (monthTotals[prevM].expense || 0) > 0)) {
        prevIncome = monthTotals[prevM].income || 0;
        prevExpense = monthTotals[prevM].expense || 0;
      } else {
        const sPrev2 = parsedSummary.find(e => e.y === prevY && e.m === prevM);
        if (sPrev2 && ((sPrev2.income || 0) + (sPrev2.expense || 0) > 0)) {
          prevIncome = sPrev2.income || 0;
          prevExpense = sPrev2.expense || 0;
        }
      }
    }
    const curNet = (curIncome || 0) - (curExpense || 0);
    const prevNet = (prevIncome || 0) - (prevExpense || 0);
    const prevLabel = labelForMonth(prevY, prevM);
    // Compute magnitude-of-net percent change using absolute nets
    const curMag = Math.abs(curNet);
    const prevMag = Math.abs(prevNet);
    let rawPct: number;
    if (prevMag === 0) {
      rawPct = curMag === 0 ? 0 : 100; // from 0 to non-zero magnitude => +100% (clamped later)
    } else {
      rawPct = ((curMag - prevMag) / prevMag) * 100;
    }
    const clamped = Math.max(-100, Math.min(100, rawPct));
    const rounded = Math.round(clamped * 10) / 10; // one-decimal rounding
    const formatPct = (val: number) => {
      // Avoid "-0%"; use explicit sign for positives, none for 0
      if (Object.is(val, -0) || val === 0) return '0%';
      const abs = Math.abs(val);
      const str = (abs % 1 === 0) ? abs.toFixed(0) : abs.toFixed(1);
      const sign = val > 0 ? '+' : '-';
      return `${sign}${str}%`;
    };
    const metric = curNet >= 0 ? 'Surplus' as const : 'Deficit' as const;
    const pctText = formatPct(rounded);
    return { text: `${pctText} Compared to ${prevLabel}`, metric, pct: rounded };
  }, [summary, year, incomeDocs, expenseDocs, compareCur, comparePrev]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={{ padding: 6 }}>
          <Ionicons name="chevron-back" size={22} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{unitLabel ? `${unitLabel} Financial Summary – ${year}` : `Financial Summary – ${year}`}</Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Search & Quick Actions */}
        <TextInput
          placeholder="Search by date, desc., income or expense cat."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
          style={styles.search}
        />
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
          <TouchableOpacity style={[styles.primaryBtn, { flex: 1 }]} onPress={() => nav.navigate('FinanceIncomeHistory' as never, { unitId })}>
            <Text style={styles.primaryText}>Income History</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.primaryBtn, { flex: 1 }]} onPress={() => nav.navigate('FinanceExpenseHistory' as never, { unitId })}>
            <Text style={styles.primaryText}>Expense History</Text>
          </TouchableOpacity>
        </View>

        {/* Year selector pill */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <TouchableOpacity style={styles.datePill} onPress={() => setYearPickerOpen(true)}>
            <Ionicons name="calendar-outline" size={16} color="#111827" />
            <Text style={styles.datePillText}>{`Year ${year}`}</Text>
            <Ionicons name="chevron-down" size={16} color="#111827" />
          </TouchableOpacity>
        </View>

        {/* Totals cards */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.metricCard, { flex: 1 }]}
            onPress={() => {
              setAmountModalTitle('Total Income');
              setAmountModalValue(summary?.totals.income || 0);
              setAmountModalOpen(true);
            }}
          >
            <Text style={styles.metricLabel}>Total Income</Text>
            <Text style={[styles.metricValue, { color: '#111827' }]}>{formatCompactCurrency(summary?.totals.income || 0)}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.metricCard, { flex: 1 }]}
            onPress={() => {
              setAmountModalTitle('Total Expenses');
              setAmountModalValue(summary?.totals.expense || 0);
              setAmountModalOpen(true);
            }}
          >
            <Text style={styles.metricLabel}>Total Expenses</Text>
            <Text style={[styles.metricValue, { color: '#111827' }]}>{formatCompactCurrency(summary?.totals.expense || 0)}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.metricCard, { marginTop: 12, backgroundColor: '#ffffff', borderColor: Colors.primary }]}
          onPress={() => {
            setAmountModalTitle('Net Surplus / Deficit');
            setAmountModalValue(summary?.totals.net || 0);
            setAmountModalOpen(true);
          }}
        >
          <Text style={[styles.metricLabel, { color: Colors.primary, textAlign: 'center' }]}>Net Surplus/Deficit</Text>
          {(() => {
            const net = summary?.totals.net || 0;
            const color = net < 0 ? '#dc2626' : net > 0 ? '#059669' : '#111827';
            return (
              <Text style={[styles.metricValue, { color, textAlign: 'center' }]}>{formatCompactCurrency(net)}</Text>
            );
          })()}
        </TouchableOpacity>

        {comparisonInfo && (
          <View style={[styles.metricCard, { marginTop: 12 }]}>
            <Text style={[styles.metricLabel, { textAlign: 'center' }]}>Compared to Last Month</Text>
            <Text style={[styles.metricValue, { color: '#111827', textAlign: 'center', fontSize: 14 }]}>{comparisonInfo.text}</Text>
          </View>
        )}

        {/* Income Breakdown (Month-by-Month) */}
        <View style={{ marginTop: 16 }}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Income Breakdown (Month-by-Month)</Text>
            <TouchableOpacity style={styles.filterPill} onPress={() => setCategoryPickerOpen('income')}>
              {incomeCategory ? (
                <Ionicons name={iconForCategory(incomeCategory)} size={14} color="#7c3aed" />
              ) : (
                <Ionicons name="funnel-outline" size={14} color="#111827" />
              )}
              <Text style={styles.filterPillText} numberOfLines={1}>{incomeCategory ? incomeCategory : 'All categories'}</Text>
              <Ionicons name="chevron-down" size={14} color="#111827" />
            </TouchableOpacity>
          </View>
          {incomeBreakdown.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="file-tray-outline" size={36} color="#94a3b8" />
              <Text style={{ color: '#64748b' }}>No income records</Text>
            </View>
          ) : (
            (showAllIncomeMonths ? incomeBreakdown : incomeBreakdown.slice(0, 3)).map(row => (
              <View key={row.monthLabel} style={styles.boxCard}>
                <View style={styles.boxHeader}>
                  <Text style={styles.boxTitle}>{row.monthLabel}</Text>
                  <Text style={styles.boxAmount}>Amount</Text>
                </View>
                {row.items.slice(0, 3).map(it => (
                  <View key={it.label} style={styles.boxRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
                      <Ionicons name={iconForCategory(it.label)} size={14} color="#7c3aed" />
                      <Text style={styles.boxItemLabel} numberOfLines={1}>{it.label}</Text>
                    </View>
                    <Text style={styles.boxItemAmount}>{currency(it.amount)}</Text>
                  </View>
                ))}
                <View style={[styles.boxRow, { borderTopWidth: 1, borderColor: '#e5e7eb', marginTop: 8, paddingTop: 8 }]}>
                  <Text style={[styles.boxItemLabel, { fontWeight: '800' }]}>Total Income</Text>
                  <Text style={[styles.boxItemAmount, { fontWeight: '800' }]}>{currency(row.total)}</Text>
                </View>
              </View>
            ))
          )}
          {incomeBreakdown.length > 3 && (
            <TouchableOpacity onPress={() => setShowAllIncomeMonths(v => !v)} style={{ alignSelf: 'flex-end', paddingBottom: 8, marginTop: -8 }}>
              <Text style={{ color: Colors.primary, fontWeight: '700' }}>{showAllIncomeMonths ? 'View Less' : 'View More'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Expense Breakdown (Month-by-Month) */}
        <View style={{ marginTop: 8 }}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Expenses Breakdown (Month-by-Month)</Text>
            <TouchableOpacity style={styles.filterPill} onPress={() => setCategoryPickerOpen('expense')}>
              {expenseCategory ? (
                <Ionicons name={iconForCategory(expenseCategory)} size={14} color="#10b981" />
              ) : (
                <Ionicons name="funnel-outline" size={14} color="#111827" />
              )}
              <Text style={styles.filterPillText} numberOfLines={1}>{expenseCategory ? expenseCategory : 'All categories'}</Text>
              <Ionicons name="chevron-down" size={14} color="#111827" />
            </TouchableOpacity>
          </View>
          {expenseBreakdown.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="file-tray-outline" size={36} color="#94a3b8" />
              <Text style={{ color: '#64748b' }}>No expense records</Text>
            </View>
          ) : (
            (showAllExpenseMonths ? expenseBreakdown : expenseBreakdown.slice(0, 3)).map(row => (
              <View key={row.monthLabel} style={styles.boxCard}>
                <View style={styles.boxHeader}>
                  <Text style={styles.boxTitle}>{row.monthLabel}</Text>
                  <Text style={styles.boxAmount}>Amount</Text>
                </View>
                {row.items.slice(0, 5).map(it => (
                  <View key={it.label} style={styles.boxRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
                      <Ionicons name={iconForCategory(it.label)} size={14} color="#10b981" />
                      <Text style={styles.boxItemLabel} numberOfLines={1}>{it.label}</Text>
                    </View>
                    <Text style={styles.boxItemAmount}>{currency(it.amount)}</Text>
                  </View>
                ))}
                <View style={[styles.boxRow, { borderTopWidth: 1, borderColor: '#e5e7eb', marginTop: 8, paddingTop: 8 }]}>
                  <Text style={[styles.boxItemLabel, { fontWeight: '800' }]}>Total Expenses</Text>
                  <Text style={[styles.boxItemAmount, { fontWeight: '800' }]}>{currency(row.total)}</Text>
                </View>
              </View>
            ))
          )}
          {expenseBreakdown.length > 3 && (
            <TouchableOpacity onPress={() => setShowAllExpenseMonths(v => !v)} style={{ alignSelf: 'flex-end', paddingBottom: 8, marginTop: -8}}>
              <Text style={{ color: Colors.primary, fontWeight: '700' }}>{showAllExpenseMonths ? 'View Less' : 'View More'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Financial Health Comparison (Pie) */}
        <Text style={styles.cardTitle}>Financial Health Comparison</Text>
        <View style={[styles.cardPrimary, { marginTop: 12 }]}>
          {((summary?.totals.income || 0) + (summary?.totals.expense || 0)) === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="pie-chart-outline" size={40} color="#94a3b8" />
              <Text style={{ color: '#64748b' }}>No data to compare</Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'column', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ color: PRIMARY_BLUE, marginBottom: 6, fontSize: 15 }}>Expense and Income</Text>

              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' ,right:10}}> 
                  <Svg width={250} height={250} viewBox="0 0 180 160">
                    <G transform="translate(20, 10)">
                      {(() => {
                        const inc = summary?.totals.income || 0; const exp = summary?.totals.expense || 0; const total = inc + exp;
                        // Show one decimal place without rounding for income; ensure expense is the exact complement
                        const incPct = total ? (Math.trunc(((inc / total) * 100) * 10) / 10) : 0;
                        const expPct = Number((100 - incPct).toFixed(1));
                        const radius = 60; const cx = 80; const cy = 70;
                        const expEnd = (360 * (exp / total)) || 0;
                        const expPath = describeArc(cx, cy, radius, 0, expEnd);
                        const incPath = describeArc(cx, cy, radius, expEnd, 360);
                        // Compute label positions at slice centroids
                        const labelR = radius * 0.6;
                        const expMidAngle = expEnd / 2; // expense slice from 0 to expEnd
                        const incMidAngle = expEnd + (360 - expEnd) / 2; // income slice from expEnd to 360
                        const expLabel = polarToCartesian(cx, cy, labelR, expMidAngle);
                        const incLabel = polarToCartesian(cx, cy, labelR, incMidAngle);
                        return (
                          <>
                            <Path d={expPath} fill="#10b981" />
                            <Path d={incPath} fill="#7c3aed" />
                            {incPct > 0 && (
                              <SvgText x={incLabel.x} y={incLabel.y} fill="#ffffff" fontSize="8" fontWeight="800" textAnchor="middle" alignmentBaseline="middle">{`${incPct.toFixed(1)}%`}</SvgText>
                            )}
                            {expPct > 0 && (
                              <SvgText x={expLabel.x} y={expLabel.y} fill="#ffffff" fontSize="8" fontWeight="800" textAnchor="middle" alignmentBaseline="middle">{`${expPct.toFixed(1)}%`}</SvgText>
                            )}
                          </>
                        );
                      })()}
                    </G>
                  </Svg>
                  <View >
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <View style={{ width: 12, height: 12, backgroundColor: '#10b981', borderRadius: 2, marginRight: 6 }} />
                    <Text style={{ color: '#111827' }}>Expense</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 12, height: 12, backgroundColor: '#7c3aed', borderRadius: 2, marginRight: 6 }} />
                    <Text style={{ color: '#111827' }}>Income</Text>
                  </View>
                  </View>
              </View>

            </View>
          )}
        </View>
      </ScrollView>

      {/* Year Picker Modal */}
      <Modal visible={yearPickerOpen} transparent animationType="fade" onRequestClose={() => setYearPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={{ fontWeight: '800', fontSize: 16, marginBottom: 8 }}>Select Year</Text>
            {availableYears.map(y => (
              <TouchableOpacity key={y} style={styles.modalRow} onPress={() => { setYear(y); setYearPickerOpen(false); }}>
                <Text style={{ fontSize: 16 }}>{y}</Text>
                {y === year && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.primaryBtn, { marginTop: 12 }]} onPress={() => setYearPickerOpen(false)}>
              <Text style={styles.primaryText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Category Picker Modal */}
      <Modal visible={!!categoryPickerOpen} transparent animationType="fade" onRequestClose={() => setCategoryPickerOpen(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={{ fontWeight: '800', fontSize: 16, marginBottom: 8 }}>
              {categoryPickerOpen === 'income' ? 'Filter Income by Category' : 'Filter Expenses by Category'}
            </Text>
            <TouchableOpacity style={styles.modalRow} onPress={() => {
              if (categoryPickerOpen === 'income') setIncomeCategory(null); else setExpenseCategory(null);
              setCategoryPickerOpen(null);
            }}>
              <Text style={{ fontSize: 16 }}>All categories</Text>
              {((categoryPickerOpen === 'income' && incomeCategory === null) || (categoryPickerOpen === 'expense' && expenseCategory === null)) && (
                <Ionicons name="checkmark" size={18} color={Colors.primary} />
              )}
            </TouchableOpacity>
            {(categoryPickerOpen === 'income' ? incomeCategories : expenseCategories).map(cat => (
              <TouchableOpacity key={cat} style={styles.modalRow} onPress={() => {
                if (categoryPickerOpen === 'income') setIncomeCategory(cat); else setExpenseCategory(cat);
                setCategoryPickerOpen(null);
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name={iconForCategory(cat)} size={16} color={categoryPickerOpen === 'income' ? '#7c3aed' : '#10b981'} />
                  <Text style={{ fontSize: 16 }}>{cat}</Text>
                </View>
                {((categoryPickerOpen === 'income' && incomeCategory === cat) || (categoryPickerOpen === 'expense' && expenseCategory === cat)) && (
                  <Ionicons name="checkmark" size={18} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.primaryBtn, { marginTop: 12 }]} onPress={() => setCategoryPickerOpen(null)}>
              <Text style={styles.primaryText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Full Amount Modal */}
      <Modal visible={amountModalOpen} transparent animationType="fade" onRequestClose={() => setAmountModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { alignItems: 'center' }]}>
            <Text style={{ fontWeight: '800', fontSize: 16, marginBottom: 8 }}>{amountModalTitle}</Text>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#111827', marginBottom: 6 }}>{currency(amountModalValue)}</Text>
            <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>Full amount</Text>
            <TouchableOpacity style={[styles.primaryBtn, { alignSelf: 'stretch' }]} onPress={() => setAmountModalOpen(false)}>
              <Text style={styles.primaryText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flexGrow: 1, paddingTop: 20, backgroundColor: '#ffffff' },
  header: { height: 60, backgroundColor: "#ffffff", flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
  headerTitle: { color: '#000', fontWeight: '800', fontSize: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  cardPrimary: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#1f2937', marginBottom: -2, marginTop: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 },
  muted: { color: '#334155' },
  bold: { fontWeight: '700', color: '#0f172a' },
  primaryBtn: { backgroundColor: Colors.primary, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontWeight: '800' },
  search: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  datePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f3f4f6', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 },
  datePillText: { color: '#111827', fontWeight: '600', marginHorizontal: 6 },
  metricCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: Colors.primary, flex: 1 },
  metricLabel: { color: Colors.primary, marginBottom: 6, fontWeight: '700', fontSize: 16 },
  metricValue: { fontSize: 15, fontWeight: '800' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  sectionTitle: { fontSize: widthPercentageToDP("3.6%"), fontWeight: '800', color: '#1f2937', flexShrink: 1 },
  filterPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 10 },
  filterPillText: { color: '#111827', fontWeight: '600', marginRight: 4, maxWidth: widthPercentageToDP('40%') },
  boxCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12 },
  boxHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  boxTitle: { fontSize: 14, fontWeight: '800', color: '#1f2937' },
  boxAmount: { fontSize: 12, color: '#6b7280' },
  boxRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  boxItemLabel: { color: '#1f2937' },
  boxItemAmount: { color: '#1f2937', fontWeight: '700' },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, width: '80%' },
  modalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 }
});
