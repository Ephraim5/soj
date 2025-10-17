import axios from 'axios';
import { BASE_URl } from './users';

export type FinanceType = 'income' | 'expense';

export interface FinanceDoc {
  _id: string;
  type: FinanceType;
  amount: number;
  source?: string;
  description?: string;
  date: string;
  unit?: string;
  recordedBy?: string;
}

export interface FinanceSummary {
  totals: { income: number; expense: number; net: number };
  byMonth: Record<string, { income: number; expense: number }>;
  incomeChangeVsLast: number | null;
}

export async function getFinanceSummary(unitId: string, token: string) {
  const res = await axios.get(`${BASE_URl}/api/finance/summary`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { unitId }
  });
  return res.data as { ok: boolean; summary: FinanceSummary };
}

export async function listFinance(params: { unitId: string; type?: FinanceType; from?: string; to?: string }, token: string) {
  const res = await axios.get(`${BASE_URl}/api/finance`, {
    headers: { Authorization: `Bearer ${token}` },
    params
  });
  return res.data as { ok: boolean; finances: FinanceDoc[] };
}

export async function recordFinance(input: { unitId: string; type: FinanceType; amount: number; source?: string; description?: string; date?: string }, token: string) {
  const res = await axios.post(`${BASE_URl}/api/finance`, input, { headers: { Authorization: `Bearer ${token}` } });
  return res.data as { ok: boolean; finance: FinanceDoc };
}

export async function updateFinance(id: string, input: Partial<{ type: FinanceType; amount: number; source?: string; description?: string; date?: string }>, token: string) {
  const res = await axios.put(`${BASE_URl}/api/finance/${id}`, input, { headers: { Authorization: `Bearer ${token}` } });
  return res.data as { ok: boolean; finance: FinanceDoc };
}

export async function deleteFinance(id: string, token: string) {
  const res = await axios.delete(`${BASE_URl}/api/finance/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  return res.data as { ok: boolean; id: string };
}
