import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUnitMemberSummary } from '../api/unitMemberSummary';
import { listSouls, addSoul, AddSoulInput } from '../api/souls';
import { listInvites, createInvite, CreateInviteInput } from '../api/invites';
import { listUnitMembers } from '../api/unitMembers';
import { listAssists, createAssist, updateAssist, deleteAssist, Assistance, AssistanceInput } from '../api/assists';

// Generic fetch hook builder for simple list endpoints
function useListFetcher<T>(key: string, fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchRef = useRef<number>(0);

  const load = useCallback(async (opts: { force?: boolean } = {}) => {
    if (loading) return;
    if (!opts.force && Date.now() - lastFetchRef.current < 15_000) return; // throttle
    setLoading(true);
    setError(null);
    try {
      const res = await fetcher();
      setData(res);
      lastFetchRef.current = Date.now();
      try { await AsyncStorage.setItem(key, JSON.stringify({ t: Date.now(), v: res })); } catch {}
    } catch (e: any) {
      setError(e?.message || 'Failed');
      // try cache
      try {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          const parsed = JSON.parse(cached);
          setData(parsed.v);
        }
      } catch {}
    } finally {
      setLoading(false);
    }
  }, [fetcher, key, loading]);

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(() => load({ force: true }), [load]);

  return { data, loading, error, refresh, setData };
}

// Summary
export function useUnitMemberSummary(token: string | undefined) {
  const fetcher = useCallback(() => {
    if (!token) return Promise.reject(new Error('No token'));
    return getUnitMemberSummary(token);
  }, [token]);
  return useListFetcher('CACHE_SUMMARY_UNIT_MEMBER', fetcher);
}

// Souls list
export function useSouls(token: string | undefined, opts: { scope?: 'mine'|'unit'|'auto'; unitId?: string } = {}) {
  const { scope = 'auto', unitId } = opts;
  const fetcher = useCallback(async () => {
    let tk = token;
    if (!tk) {
      try {
        const t1 = await AsyncStorage.getItem('token');
        tk = t1 || (await AsyncStorage.getItem('auth_token')) || undefined;
      } catch {}
    }
    if (!tk) throw new Error('No token');
    return listSouls(tk, { scope, unitId });
  }, [token, scope, unitId]);
  const hook = useListFetcher(`CACHE_SOULS_LIST_${scope}_${unitId||'none'}`, fetcher);

  const create = useCallback(async (input: AddSoulInput) => {
    if (!token) throw new Error('No token');
    const res = await addSoul(input, token);
    if (res.ok && res.soul) {
      hook.setData(prev => {
        if (!prev) return { souls: [res.soul] } as any;
        return { souls: [res.soul, ...(prev as any).souls].slice(0,500) };
      });
    }
    return res;
  }, [token, hook]);

  return { ...hook, create };
}

// Invites
export function useInvites(token: string | undefined, scope: 'mine'|'unit' = 'unit') {
  const fetcher = useCallback(() => {
    if (!token) return Promise.reject(new Error('No token'));
    return listInvites(token, { scope });
  }, [token, scope]);
  const hook = useListFetcher('CACHE_INVITES_LIST_'+scope, fetcher);

  const create = useCallback(async (input: CreateInviteInput) => {
    if (!token) throw new Error('No token');
    const res = await createInvite(input, token);
    if (res.ok && res.invite) {
      hook.setData(prev => {
        if (!prev) return { invites: [res.invite] } as any;
        return { invites: [res.invite, ...(prev as any).invites] };
      });
    }
    return res;
  }, [token, hook]);

  return { ...hook, create };
}

// Unit Members list (needs unitId derived by caller from profile/summary)
export function useUnitMembers(token: string | undefined, unitId: string | undefined) {
  const fetcher = useCallback(() => {
    if (!token || !unitId) return Promise.reject(new Error('Missing context'));
    return listUnitMembers(unitId, token);
  }, [token, unitId]);
  return useListFetcher('CACHE_UNIT_MEMBERS_'+(unitId||'none'), fetcher);
}

// Assists (Members Assisted) list + CRUD
export function useAssists(token: string | undefined, opts: { scope?: 'mine'|'unit'|'auto'; unitId?: string; year?: number } = {}) {
  const { scope = 'auto', unitId, year } = opts;
  const fetcher = useCallback(async () => {
    let tk = token;
    if (!tk) {
      try {
        const t1 = await AsyncStorage.getItem('token');
        tk = t1 || (await AsyncStorage.getItem('auth_token')) || undefined;
      } catch {}
    }
    if (!tk) throw new Error('No token');
  const effScope: 'mine'|'unit'|undefined = scope === 'auto' ? undefined : scope;
  return listAssists(tk, { scope: effScope, unitId, year });
  }, [token, scope, unitId, year]);

  const hook = useListFetcher<{ ok: boolean; assists: Assistance[] }>(`CACHE_ASSISTS_LIST_${scope}_${unitId||'none'}_${year||'all'}`, fetcher);

  const create = useCallback(async (input: AssistanceInput) => {
    let tk = token;
    if (!tk) {
      try {
        const t1 = await AsyncStorage.getItem('token');
        tk = t1 || (await AsyncStorage.getItem('auth_token')) || undefined;
      } catch {}
    }
    if (!tk) throw new Error('No token');
    const res = await createAssist(input, tk);
    if ((res as any).ok && (res as any).assist) {
      hook.setData(prev => {
        const next = (prev?.assists || []);
        return { ok: true, assists: [(res as any).assist, ...next] } as any;
      });
    }
    return res;
  }, [token, hook]);

  const updateOne = useCallback(async (id: string, input: Partial<AssistanceInput>) => {
    let tk = token;
    if (!tk) {
      try {
        const t1 = await AsyncStorage.getItem('token');
        tk = t1 || (await AsyncStorage.getItem('auth_token')) || undefined;
      } catch {}
    }
    if (!tk) throw new Error('No token');
    const res = await updateAssist(id, input, tk);
    if ((res as any).ok && (res as any).assist) {
      hook.setData(prev => {
        const arr = prev?.assists || [];
        const idx = arr.findIndex(a => a._id === id);
        if (idx >= 0) {
          const copy = [...arr];
          copy[idx] = (res as any).assist;
          return { ok: true, assists: copy } as any;
        }
        return prev as any;
      });
    }
    return res;
  }, [token, hook]);

  const remove = useCallback(async (id: string) => {
    let tk = token;
    if (!tk) {
      try {
        const t1 = await AsyncStorage.getItem('token');
        tk = t1 || (await AsyncStorage.getItem('auth_token')) || undefined;
      } catch {}
    }
    if (!tk) throw new Error('No token');
    const res = await deleteAssist(id, tk);
    if ((res as any).ok) {
      hook.setData(prev => {
        const arr = prev?.assists || [];
        return { ok: true, assists: arr.filter(a => a._id !== id) } as any;
      });
    }
    return res;
  }, [token, hook]);

  return { ...hook, create, updateOne, remove };
}
