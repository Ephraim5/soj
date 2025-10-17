import axios from 'axios';
import { BASE_URl } from './users';

export interface UnitMemberSummaryResponse {
  ok: boolean;
  unit?: { _id: string; name: string } | null;
  counts?: {
    unitMembers: number;
    unitSouls: number;
    mySouls: number;
    unitInvites: number;
    myInvites: number;
  };
  upcomingEvents?: { _id: string; title: string; date: string }[];
  message?: string;
}

export async function getUnitMemberSummary(token: string): Promise<UnitMemberSummaryResponse> {
  const res = await axios.get(`${BASE_URl}/api/summary/unit-member`, { headers: { Authorization: `Bearer ${token}` } });
  return res.data as UnitMemberSummaryResponse;
}
