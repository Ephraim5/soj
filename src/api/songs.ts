import axios from 'axios';
import { BASE_URl } from './users';

export interface SongDoc {
  _id: string;
  title: string;
  composer?: string;
  vocalLeads?: string;
  link?: string;
  description?: string;
  releaseDate?: string;
}

export async function listSongs(token: string){
  const res = await axios.get(`${BASE_URl}/api/songs`, { headers: { Authorization: `Bearer ${token}` }});
  return res.data as { ok: boolean; songs: SongDoc[] };
}

export async function createSong(input: { title: string; composer?: string; vocalLeads?: string; link?: string; description?: string; releaseDate?: string }, token: string){
  const res = await axios.post(`${BASE_URl}/api/songs`, input, { headers: { Authorization: `Bearer ${token}` }});
  return res.data as { ok: boolean; song?: SongDoc };
}

export async function deleteSong(id: string, token: string){
  const res = await axios.delete(`${BASE_URl}/api/songs/${id}`, { headers: { Authorization: `Bearer ${token}` }});
  return res.data as { ok: boolean };
}

export async function updateSong(id: string, input: Partial<{ title: string; composer?: string; vocalLeads?: string; link?: string; description?: string; releaseDate?: string }>, token: string){
  const res = await axios.put(`${BASE_URl}/api/songs/${id}`, input, { headers: { Authorization: `Bearer ${token}` }});
  return res.data as { ok: boolean; song?: SongDoc };
}
