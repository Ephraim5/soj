import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const BASE = 'https://streamsofjoyumuahia-api.onrender.com';

export type AnnouncementItem = { _id: string; title: string; body: string; targetAudience?: string; createdAt?: string };

export async function listAnnouncements(): Promise<AnnouncementItem[]>{
  const token = await AsyncStorage.getItem('token');
  const res = await axios.get(BASE + '/api/announcements', { headers: { Authorization: `Bearer ${token}` } });
  const arr = res.data?.announcements || res.data?.data || [];
  return arr;
}

export async function createAnnouncement(payload: any){
  const token = await AsyncStorage.getItem('token');
  const res = await axios.post(BASE + '/api/announcements', payload, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}

export async function updateAnnouncement(id: string, payload: any){
  const token = await AsyncStorage.getItem('token');
  const res = await axios.put(BASE + `/api/announcements/${id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}

export async function deleteAnnouncement(id: string){
  const token = await AsyncStorage.getItem('token');
  const res = await axios.delete(BASE + `/api/announcements/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
