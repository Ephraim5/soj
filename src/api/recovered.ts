export type Recovered = {
  _id: string;
  fullName: string;
  gender: 'Male'|'Female';
  age?: number;
  maritalStatus?: string;
  addictionType: string;
  dateOfRecovery: string; // ISO
  phone?: string;
};

const base = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api';

export async function listRecovered(token: string, params?: { year?: string; month?: string; gender?: string; addiction?: string; q?: string; }): Promise<Recovered[]> {
  const qs = new URLSearchParams();
  if (params?.year) qs.set('year', params.year);
  if (params?.month) qs.set('month', params.month);
  if (params?.gender) qs.set('gender', params.gender);
  if (params?.addiction) qs.set('addiction', params.addiction);
  if (params?.q) qs.set('q', params.q);
  const url = qs.toString() ? `${base}/recovered-addicts?${qs.toString()}` : `${base}/recovered-addicts`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Failed to load');
  const data = await res.json();
  return data.recovered || [];
}

export async function createRecovered(token: string, payload: Omit<Recovered, '_id'>): Promise<Recovered> {
  const res = await fetch(`${base}/recovered-addicts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to create');
  const data = await res.json();
  return data.recovered;
}

export async function updateRecovered(token: string, id: string, payload: Partial<Omit<Recovered, '_id'>>): Promise<Recovered> {
  const res = await fetch(`${base}/recovered-addicts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to update');
  const data = await res.json();
  return data.recovered;
}

export async function deleteRecovered(token: string, id: string): Promise<void> {
  const res = await fetch(`${base}/recovered-addicts/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to delete');
}
