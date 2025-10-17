import axios from 'axios';
import { BASE_URl } from './users';

export type FinanceCategory = { _id: string; unit: string; type: 'income'|'expense'; name: string };

export async function listFinanceCategories(params: { unitId: string; type: 'income'|'expense' }, token: string): Promise<{ ok: boolean; categories: FinanceCategory[] }>{
  const res = await axios.get(`${BASE_URl}/api/finance-categories`, {
    params: { unitId: params.unitId, type: params.type },
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

export async function addFinanceCategory(body: { unitId: string; type: 'income'|'expense'; name: string }, token: string): Promise<{ ok: boolean; category?: FinanceCategory; message?: string }>{
  const res = await axios.post(`${BASE_URl}/api/finance-categories`, body, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

export async function renameFinanceCategory(body: { unitId: string; type: 'income'|'expense'; from: string; to: string }, token: string): Promise<{ ok: boolean; category?: FinanceCategory; message?: string }>{
  const res = await axios.put(`${BASE_URl}/api/finance-categories/rename`, body, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}
