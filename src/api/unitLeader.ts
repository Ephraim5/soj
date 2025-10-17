import axios from 'axios';
import { BASE_URl } from './users';

export interface UnitLeaderSummary {
  ok: boolean;
  unit: { _id: string; name: string } | null;
  membersCount: number;
  soulsWonCount: number;
  finance: { income: number; expense: number; balance: number };
  upcomingEvents: { _id: string; title: string; date: string }[];
  message?: string;
}

export async function getUnitLeaderSummary(token: string): Promise<UnitLeaderSummary> {
  const res = await axios.get(`${BASE_URl}/api/reports/unit-leader/summary`, { headers: { Authorization: `Bearer ${token}` } });
  return res.data as UnitLeaderSummary;
}
