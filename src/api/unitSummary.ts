import axios from 'axios';
import { BASE_URl } from './users';

export interface UnitSummaryResponse {
  ok: boolean;
  unit: { _id: string; name: string } | null;
  counts: {
    membersCount: number;
    femaleCount?: number;
    maleCount?: number;
    soulsCount: number;
    invitesCount: number;
    assistsCount: number;
    marriagesCount: number;
    recoveredCount: number;
    songsCount: number;
    achievementsCount: number;
  };
  finance: { income: number; expense: number; balance: number };
  message?: string;
}

export async function getUnitSummaryById(token: string, unitId: string): Promise<UnitSummaryResponse> {
  const res = await axios.get(`${BASE_URl}/api/units/${unitId}/summary`, { headers: { Authorization: `Bearer ${token}` } });
  return res.data as UnitSummaryResponse;
}
