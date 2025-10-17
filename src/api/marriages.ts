export type Marriage = {
  _id: string;
  name: string;
  date: string; // ISO
  note?: string;
  createdAt?: string;
};

const base = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api';

export async function listMarriages(token: string, params?: { year?: string; q?: string }): Promise<Marriage[]> {
  const qs = new URLSearchParams();
  if (params?.year) qs.set('year', params.year);
  if (params?.q) qs.set('q', params.q);
  const url = qs.toString() ? `${base}/marriages?${qs.toString()}` : `${base}/marriages`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to load marriages');
  const data = await res.json();
  return data.marriages || [];
}

export async function createMarriage(token: string, payload: { name: string; date: string; note?: string; }): Promise<Marriage> {
  const res = await fetch(`${base}/marriages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to create');
  const data = await res.json();
  return data.marriage;
}

export async function updateMarriage(token: string, id: string, payload: Partial<{ name: string; date: string; note?: string; }>): Promise<Marriage> {
  const res = await fetch(`${base}/marriages/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to update');
  const data = await res.json();
  return data.marriage;
}

export async function deleteMarriage(token: string, id: string): Promise<void> {
  const res = await fetch(`${base}/marriages/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to delete');
}
