import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URl } from './users';

// Types
export type SupportCategory = 'Login Issues' | 'Performance' | 'Bug Report' | 'Feature Request' | 'Data Issue' | 'Other';

export interface CreateSupportTicketInput {
  email: string;
  phone?: string;
  category: SupportCategory;
  description: string;
  screenshotBase64?: string; // data URI (image/*)
}

export interface SupportTicket {
  _id: string;
  email: string;
  phone?: string;
  category: SupportCategory;
  description: string;
  screenshotUrl?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: string;
}

interface LegalSection { heading: string; body: string; }
export interface LegalPage { _id: string; type: 'terms' | 'privacy'; title: string; sections: LegalSection[]; lastUpdated: string; }

const LEGAL_CACHE_KEY = (type: 'terms' | 'privacy') => `LEGAL_CACHE_${type.toUpperCase()}`;

export async function createSupportTicket(input: CreateSupportTicketInput, token?: string) {
  const headers: any = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await axios.post(`${BASE_URl}/api/support/tickets`, input, { headers });
  return res.data as { ok: boolean; ticket?: SupportTicket; message?: string };
}

export async function getLegal(type: 'terms' | 'privacy', { forceRefresh }: { forceRefresh?: boolean } = {}) {
  const cacheKey = LEGAL_CACHE_KEY(type);
  if (!forceRefresh) {
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as { page: LegalPage; cachedAt: number };
        return { fromCache: true, page: parsed.page };
      }
    } catch {}
  }
  const res = await axios.get(`${BASE_URl}/api/support/legal/${type}`);
  const data = res.data as { ok: boolean; page: LegalPage };
  if (data.ok) {
    try { await AsyncStorage.setItem(cacheKey, JSON.stringify({ page: data.page, cachedAt: Date.now() })); } catch {}
  }
  return { fromCache: false, page: data.page };
}

export async function purgeLegalCache() {
  await Promise.all(['terms','privacy'].map(t => AsyncStorage.removeItem(LEGAL_CACHE_KEY(t as any))));
}
