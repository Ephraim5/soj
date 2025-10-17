import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  SoulsWon: undefined;
  PeopleInvited: undefined;
  UnitMember: undefined;
  MembersMarried:undefined;
  Testimonies:undefined;
  InviteAndPart:undefined;
  RecoveredAddict:undefined;
  SongReleased:undefined;
  GraduatedStudents:undefined;
  GraduatedStudentsList:undefined;
  Sales:undefined;
  AttendanceHome: undefined;
  StudentsList: undefined;
  TakeAttendance: undefined;
  AttendanceRecord: { studentId: string };
  AttendanceSummary: undefined;
  Achievements:undefined;
};

export type ReportLeaderNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'SoulsWon'
>;