import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URl } from './users';

export type AttachmentInput = { uri?: string; url?: string; name?: string; type?: 'image'|'file'|'other'; publicId?: string; resourceType?: string };

export async function listConversations(){
  const token = await AsyncStorage.getItem('token');
  if(!token) throw new Error('Missing token');
  const res = await axios.get(`${BASE_URl}/api/messages/conversations`, { headers:{ Authorization:`Bearer ${token}` }});
  return res.data;
}

export async function fetchConversation(scope:'user'|'unit', id:string){
  const token = await AsyncStorage.getItem('token');
  if(!token) throw new Error('Missing token');
  const res = await axios.get(`${BASE_URl}/api/messages/conversation/${scope}/${id}`, { headers:{ Authorization:`Bearer ${token}` }});
  return res.data;
}

export async function markRead(scope:'user'|'unit', id:string){
  const token = await AsyncStorage.getItem('token');
  if(!token) throw new Error('Missing token');
  const res = await axios.post(`${BASE_URl}/api/messages/mark-read`, { scope, id }, { headers:{ Authorization:`Bearer ${token}` }});
  return res.data;
}

export async function deleteConversation(scope:'user'|'unit', id:string){
  const token = await AsyncStorage.getItem('token');
  if(!token) throw new Error('Missing token');
  const res = await axios.delete(`${BASE_URl}/api/messages/conversation`, { headers:{ Authorization:`Bearer ${token}` }, data: { scope, id } });
  return res.data;
}

export async function sendMessage(payload: { toUserId?: string; toUnitId?: string; subject?: string; text?: string; attachments?: AttachmentInput[] }){
  const token = await AsyncStorage.getItem('token');
  if(!token) throw new Error('Missing token');
  const res = await axios.post(`${BASE_URl}/api/messages`, payload, { headers:{ Authorization:`Bearer ${token}` }});
  return res.data;
}

export async function uploadMessageFile(file: { uri: string; name?: string; type?: string; }): Promise<{ ok:boolean; url:string; public_id?: string; resource_type?: string }>{
  const token = await AsyncStorage.getItem('token');
  if(!token) throw new Error('Missing token');
  const form = new FormData();
  const filename = file.name || 'upload';
  form.append('file', { uri: file.uri, name: filename, type: file.type || 'application/octet-stream' } as any);
  const res = await axios.post(`${BASE_URl}/api/upload/message`, form, { headers: { Authorization:`Bearer ${token}`, 'Content-Type':'multipart/form-data' } });
  return res.data;
}

export async function deleteMessage(id: string){
  const token = await AsyncStorage.getItem('token');
  if(!token) throw new Error('Missing token');
  const res = await axios.delete(`${BASE_URl}/api/messages/${id}`, { headers:{ Authorization:`Bearer ${token}` } });
  return res.data;
}

export async function addReaction(id: string, emoji: string){
  const token = await AsyncStorage.getItem('token');
  if(!token) throw new Error('Missing token');
  const res = await axios.post(`${BASE_URl}/api/messages/${id}/reactions`, { emoji }, { headers:{ Authorization:`Bearer ${token}` } });
  return res.data;
}
export async function removeReaction(id: string, emoji: string){
  const token = await AsyncStorage.getItem('token');
  if(!token) throw new Error('Missing token');
  const res = await axios.delete(`${BASE_URl}/api/messages/${id}/reactions`, { headers:{ Authorization:`Bearer ${token}` }, data:{ emoji } });
  return res.data;
}
