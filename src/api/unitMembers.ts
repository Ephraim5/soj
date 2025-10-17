import axios from 'axios';
import { BASE_URl } from './users';

export interface UnitMemberLite {
  name: string;
  _id: string;
  firstName?: string;
  middleName?: string;
  surname?: string;
  phone?: string;
  gender?: string;
  title?: string;
  profile?: { avatar?: string };
}

export async function listUnitMembers(unitId: string, token: string) {
  const res = await axios.get(`${BASE_URl}/api/units/${unitId}/members/list`, { headers: { Authorization: `Bearer ${token}` } });
  return res.data as { ok?: boolean; members: UnitMemberLite[] };
}
