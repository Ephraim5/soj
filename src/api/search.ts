import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URl } from './users';

export async function searchUsers(q: string){
  const token = await AsyncStorage.getItem('token');
  if(!token) throw new Error('Missing token');
  const res = await axios.get(`${BASE_URl}/api/users`, { params: { q }, headers: { Authorization:`Bearer ${token}` }});
  return res.data?.users || [];
}

export async function listUnits(params?: { churchId?: string; ministry?: string }){
  const token = await AsyncStorage.getItem('token');
  if(!token) throw new Error('Missing token');
  const res = await axios.get(`${BASE_URl}/api/units`, { params, headers: { Authorization:`Bearer ${token}` }});
  return res.data?.units || [];
}
