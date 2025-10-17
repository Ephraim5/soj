import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const BASE = 'https://streamsofjoyumuahia-api.onrender.com';

export type EventItem = { _id: string; title: string; date?: string; venue?: string; description?: string; tags?: string[]; status?: 'Upcoming'|'Past' };

function coerceDate(val: any): string | undefined {
  if (!val) return undefined;
  if (typeof val === 'string') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString();
  } else if (val instanceof Date) {
    if (!isNaN(val.getTime())) return val.toISOString();
  }
  return undefined;
}

export async function listEvents(): Promise<EventItem[]>{
  const token = await AsyncStorage.getItem('token');
  const res = await axios.get(BASE + '/api/events', { headers: { Authorization: `Bearer ${token}` } });
  const arr = res.data?.events || res.data?.data || res.data?.items || [];
  return (arr as any[]).map(raw => {
    const date = coerceDate(raw.date || raw.eventDate || raw.startDate || raw.dateTime);
    return {
      _id: raw._id || raw.id,
      title: raw.title,
      date,
      venue: raw.venue,
      description: raw.description,
      tags: Array.isArray(raw.tags) ? raw.tags : [],
      status: raw.status,
    } as EventItem;
  });
}

export async function createEvent(payload: any){
  const token = await AsyncStorage.getItem('token');
  const res = await axios.post(BASE + '/api/events', payload, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}

export async function deleteEvent(id: string){
  const token = await AsyncStorage.getItem('token');
  const res = await axios.delete(BASE + '/api/events/' + id, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
