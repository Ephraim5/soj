import axios from 'axios';
import { BASE_URl } from './users';

export interface Achievement {
  _id: string;
  title: string;
  description?: string;
  date: string; // ISO string
  unit?: string;
  addedBy?: string;
  createdAt?: string;
}

export interface AchievementInput {
  title: string;
  description?: string;
  date?: string; // ISO string
  unitId?: string; // optional; server infers from role if missing
}

export async function listAchievements(token: string, opts?: { year?: number; scope?: 'unit'|'mine'; unitId?: string }) {
  const params: any = {};
  if (opts?.year) params.year = opts.year;
  if (opts?.scope) params.scope = opts.scope;
  if (opts?.unitId) params.unitId = opts.unitId;
  const res = await axios.get(`${BASE_URl}/api/achievements`, { headers: { Authorization: `Bearer ${token}` }, params });
  return res.data as { ok: boolean; achievements: Achievement[] };
}

export async function createAchievement(input: AchievementInput, token: string) {
  const res = await axios.post(`${BASE_URl}/api/achievements`, input, { headers: { Authorization: `Bearer ${token}` } });
  return res.data as { ok: boolean; achievement: Achievement };
}

export async function updateAchievement(id: string, input: Partial<AchievementInput>, token: string) {
  const res = await axios.put(`${BASE_URl}/api/achievements/${id}`, input, { headers: { Authorization: `Bearer ${token}` } });
  return res.data as { ok: boolean; achievement: Achievement };
}

export async function deleteAchievement(id: string, token: string) {
  const res = await axios.delete(`${BASE_URl}/api/achievements/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  return res.data as { ok: boolean };
}
