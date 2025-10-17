import axios from 'axios';
import { BASE_URl } from './users';

export interface UnitLeaderLite {
  _id: string;
  firstName?: string;
  surname?: string;
  middleName?: string;
  phone?: string;
  title?: string;
  profile?: { avatar?: string };
}

export async function listUnitLeaders(unitId: string, token: string) {
  const res = await axios.get(`${BASE_URl}/api/units/${unitId}/leaders/list`, { headers: { Authorization: `Bearer ${token}` } });
  return res.data as { ok?: boolean; leaders: UnitLeaderLite[] };
}
