import axios from 'axios';
import { BASE_URl } from './users';

export interface Soul {
  _id: string;
  name: string;
  phone?: string;
  gender?: 'Male'|'Female';
  ageRange?: string;
  convertedThrough?: string;
  location?: string;
  unit?: string;
  addedBy?: string;
  dateWon?: string;
}

export interface ListSoulsResponse { ok?: boolean; scope?: string; souls: Soul[] }
export interface AddSoulInput { name: string; phone?: string; unitId?: string; dateWon?: string; gender?: 'Male'|'Female'; ageRange?: string; convertedThrough?: string; location?: string }

export async function listSouls(token: string, opts?: { scope?: 'mine'|'unit'|'auto'; unitId?: string }): Promise<ListSoulsResponse> {
  const params: any = {};
  if (opts?.scope) params.scope = opts.scope;
  if (opts?.unitId) params.unitId = opts.unitId;
  const res = await axios.get(`${BASE_URl}/api/souls`, { headers: { Authorization: `Bearer ${token}` }, params });
  return res.data as ListSoulsResponse;
}

export async function addSoul(input: AddSoulInput, token: string) {
  const res = await axios.post(`${BASE_URl}/api/souls`, input, { headers: { Authorization: `Bearer ${token}` } });
  return res.data as { ok: boolean; soul?: Soul };
}
