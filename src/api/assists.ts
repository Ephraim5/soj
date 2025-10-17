import axios from 'axios';
import { BASE_URl } from './users';

export interface Assistance {
  _id: string;
  member: string;
  memberName: string;
  phone?: string;
  assistedOn: string; // ISO
  reason: string;
  howHelped: string;
  unit?: string;
  addedBy?: string;
}

export interface AssistanceInput {
  memberId: string;
  assistedOn: string; // ISO
  reason: string;
  howHelped: string;
}

export async function listAssists(token: string, opts?: { year?: number; scope?: 'unit'|'mine'; unitId?: string }) {
  const params: any = {};
  if (opts?.year) params.year = opts.year;
  if (opts?.scope) params.scope = opts.scope;
  if (opts?.unitId) params.unitId = opts.unitId;
  const res = await axios.get(`${BASE_URl}/api/assists`, { headers: { Authorization: `Bearer ${token}` }, params });
  return res.data as { ok: boolean; assists: Assistance[] };
}

export async function createAssist(input: AssistanceInput, token: string) {
  const res = await axios.post(`${BASE_URl}/api/assists`, input, { headers: { Authorization: `Bearer ${token}` } });
  return res.data as { ok: boolean; assist: Assistance };
}

export async function updateAssist(id: string, input: Partial<AssistanceInput>, token: string) {
  const res = await axios.put(`${BASE_URl}/api/assists/${id}`, input, { headers: { Authorization: `Bearer ${token}` } });
  return res.data as { ok: boolean; assist: Assistance };
}

export async function deleteAssist(id: string, token: string) {
  const res = await axios.delete(`${BASE_URl}/api/assists/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  return res.data as { ok: boolean };
}
