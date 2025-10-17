import axios from 'axios';
import { BASE_URl } from './users';

export interface CheckPhoneResponse { ok: boolean; exists: boolean; }
export async function checkPhone(phone: string): Promise<CheckPhoneResponse> {
  const res = await axios.post(BASE_URl + '/api/users/check-phone', { phone });
  return res.data;
}

export interface CompleteRegularPayload {
  userId: string;
  firstName: string;
  surname: string;
  middleName?: string;
  activeRole: 'UnitLeader'|'Member'|'MinistryAdmin'|'SuperAdmin';
  unitsLed?: string[]; // UnitLeader only
  unitsMember?: string[]; // Member or dual membership
  ministryName?: string; // MinistryAdmin requirement
  churchId?: string; // Selected church for MinistryAdmin scope
  gender?: string;
  dob?: string; // ISO
  occupation?: string;
  employmentStatus?: string;
  maritalStatus?: string;
  password: string;
  phone: string;
}
export async function completeRegularRegistration(payload: CompleteRegularPayload){
  const res = await axios.post(BASE_URl + '/api/auth/complete-regular', payload);
  return res.data;
}

export interface CompleteSuperAdminPayload {
  userId: string;
  email: string;
  title?: string;
  firstName: string;
  middleName?: string;
  surname: string;
  password: string;
  phone: string;
}
export async function completeSuperAdminRegistration(payload: CompleteSuperAdminPayload){
  const res = await axios.post(BASE_URl + '/api/auth/complete-superadmin', payload);
  return res.data;
}
