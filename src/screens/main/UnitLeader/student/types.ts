export type Student = {
  id: string;
  firstName: string;
  lastName?: string;
  middleName?: string;
  regNo?: string;
  className?: string;
  phone?: string;
  photoUrl?: string;
  createdAt?: string;
};

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export type AttendanceRecord = {
  id: string;
  studentId: string;
  date: string;
  status: AttendanceStatus;
  note?: string;
};
