import axios from 'axios';
import { BASE_URl } from './users';

export interface TestimonyDoc {
  _id: string;
  title: string;
  body: string;
  approved?: boolean;
  createdAt?: string;
}

export interface ListTestimoniesResponse { testimonies: TestimonyDoc[] }

export async function listTestimonies(token: string) {
  const res = await axios.get(`${BASE_URl}/api/testimonies`, { headers: { Authorization: `Bearer ${token}` } });
  return res.data as ListTestimoniesResponse;
}

export async function submitTestimony(input: { title: string; body: string }, token: string) {
  const res = await axios.post(`${BASE_URl}/api/testimonies`, input, { headers: { Authorization: `Bearer ${token}` } });
  return res.data as { ok: boolean; testimony?: TestimonyDoc };
}
