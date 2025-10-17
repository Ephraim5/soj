import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import RegistrationScreen from '../screens/AuthScreens/Registration/RegistrationScreen';
import RegularRegistrationForm from '../screens/AuthScreens/Registration/RegularRegistrationForm';
import LoginScreen from '../screens/AuthScreens/Login/LoginScreen';
import MainTabs from './MainTab';
import PhonenumberScreen from '../screens/AuthScreens/Home/PhonenumberScreen';
import OtpScreen from '../screens/AuthScreens/Home/OtpScreen';
import { PhoneNumberProvider } from '../context/phonenumber';
import SuperAdminForm from '../screens/AuthScreens/SuperAdmin/FormScreen';
import OtpVerificationScreen from '../screens/AuthScreens/Home/MailOtpScreen';
import SuperAdminRegistrationScreen from '../screens/AuthScreens/SuperAdmin/SuperAdminRegistrationScreen';
import FingerprintSetupScreen from '../screens/AuthScreens/SuperAdmin/FingerprintSetupScreen';
import ProfileScreen from '../screens/main/SuperAdmin/ProfileScreen';
import NotificationDetailScreen from '../screens/main/Home/NotificationDetail';
import NotificationScreen from '../screens/main/Home/Notification';
import ComposeEmailScreen from '../screens/main/Home/ComposeEmailScreen';
import AllUnitDashboardsScreen from '../screens/main/Home/AllUnitDashboard';
import AddAdmin from '../screens/AuthScreens/SuperAdmin/AddUnitLeaders';
import AdminUnitLead from '../screens/AuthScreens/SuperAdmin/AddUnitNext';
import AddUnitScreen from '../screens/main/SuperAdmin/AddUnitScreen';
import EventsAnnouncementsScreen from '../screens/AuthScreens/SuperAdmin/EventAndAnnoucement';
import AddEventScreen from '../screens/AuthScreens/SuperAdmin/AddEvent';
import AddAnnouncementScreen from '../screens/AuthScreens/SuperAdmin/AddAnnouncement';
import ManageSuperAdminsUnitLeadersScreen from '../screens/AuthScreens/SuperAdmin/ManageUnit';
import AddNewSuperAdminScreen from '../screens/AuthScreens/SuperAdmin/AddNewSuperAdmin';
import ApproveUnitLeadersScreen from '../screens/AuthScreens/SuperAdmin/ApproveUnitLeaders';
import ApproveSuperAdminsScreen from '../screens/AuthScreens/SuperAdmin/ApproveSuperAdmins';
import MinistryDashboard from '../screens/MinistryAdmin/MinistryDashboard';
import ApproveMinistryAdminsScreen from '../screens/AuthScreens/SuperAdmin/ApproveMinistryAdmins';
import MemberListScreen from '../screens/main/UnitLeader/MemeberListScreen';
import SoulsWonScreen from '../screens/main/UnitLeader/SoulsWOnSCreen';
import PeopleInvitedScreen from '../screens/main/UnitLeader/PeopleInvitedScreen';
import AddSoulModal from '../screens/main/UnitLeader/AddSoulModalSCreen';
import { UnitLeader1Screen, UnitLeader2Screen } from '../screens/AuthScreens/UnitLeader/FormScreen';
import MemberInvited from '../screens/main/UnitLeader/MemberInvited';
import AddPeop from '../screens/main/UnitLeader/AddPeople';
import MembersAssistedScreen from '../screens/main/UnitLeader/UnitMemberAdd';
import TestimoniesScreen from '../screens/main/UnitLeader/TestimoniesScreen';
import MarriagesScreen from '../screens/main/UnitLeader/MembersMarried';
import InviteAndPart from '../screens/main/UnitLeader/InvitedAndPart';
import SongsScreen from '../screens/main/UnitLeader/SongRelased';
import UnitAssignmentsListScreen from '../screens/main/Common/UnitAssignmentsListScreen';
import UnitAssignmentsDetailScreen from '../screens/main/Common/UnitAssignmentsDetailScreen';
import ManageUnitLeadersUnitScreen from '../screens/AuthScreens/UnitLeader/ManageUnit';
import ApproveMembersScreen from '../screens/main/UnitLeader/ApproveMembersScreen';
import RecoveredAddictsScreen from '../screens/main/UnitLeader/RecoveredAdit';
import AchievementsScreen from '../screens/main/UnitLeader/AchievementsScreen';
// WorkPlan screens (to implement)
import { WorkPlansListScreen, NewWorkPlanScreen, ViewWorkPlanScreen, AdminWorkPlansListScreen, AdminViewWorkPlanScreen } from '@screens/workplans';
import LegalContentScreen from '../screens/LegalContentScreen';
import { DefaultTheme, Theme, NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { StatusBar } from 'react-native';
import { navigationRef } from './navigationRef';
import { Colors } from '@theme/colors';
import SalesNavigator from '@sales/index';
import GraduatedStudents from '../screens/main/UnitLeader/GraduatedStudents';
import AttendanceHome from '../screens/main/UnitLeader/student/AttendanceHome';
import StudentsList from '../screens/main/UnitLeader/student/StudentsList';
import TakeAttendance from '../screens/main/UnitLeader/student/TakeAttendance';
import AttendanceRecord from '../screens/main/UnitLeader/student/AttendanceRecord';
import AttendanceSummary from '../screens/main/UnitLeader/student/AttendanceSummary';
import GraduatedStudentsList from '../screens/main/UnitLeader/GraduatedStudentsList';
import { Student } from '../screens/main/UnitLeader/student/types';
import AwaitingApprovalScreen from '../screens/AuthScreens/AwaitingApprovalScreen';
import ChurchSwitchScreen from '../screens/main/SuperAdmin/ChurchSwitchScreen';
import AssignUnitControlScreen from '../screens/main/Common/AssignUnitControlScreen';
import FinanceSummaryScreen from '../screens/main/Common/FinanceSummaryScreen';
import FinanceHistoryScreen from '../screens/main/Common/FinanceHistoryScreen';
import FinanceRecordScreen from '../screens/main/Common/FinanceRecordScreen';


const navTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.primary,
    background: Colors.background,
    card: '#fff',
    text: '#111',
    border: '#e6e9ef',
    notification: Colors.primary,
  },
};

export type RootStackParamList = {
  Registration: undefined;
  Login: undefined;
  MainTabs: undefined;
  Phonenumber: undefined;
  OtpScreen: undefined;
  SuperAdminForm: undefined;
  Sales: undefined;
  UnitMember: undefined;
  MailOtp: undefined;
  SuperAdminRegistration: { userId: string; prefills?: any; email: string } | undefined;
  RegularRegistrationForm: { userId: string; prefills?: any; email: string } | undefined;
  FingerprintSetup: undefined;
  ProfileAdmin: undefined;
  NotificationDetail: undefined;
  Notification: undefined;
  ComposeEmailScreen: undefined;
  MembersMarried: undefined;
  AllUnitDashboard: undefined;
  AddUnit: undefined;
  AddUnitNext: undefined;
  EventAndAnnouncement: undefined;
  UnitLeaderFormOne: undefined;
  UnitLeaderFormTwo: undefined;
  AddAnnouncement: undefined;
  AddEvent: undefined;
  ManageSuperAdminsUnitLeaders: undefined;
  AddNewSuperAdmin: undefined;
  ApproveUnitLeaders: undefined;
  ApproveSuperAdmins: undefined;
  MinistryDashboard: undefined;
  ApproveMinistryAdmins: undefined;
  ApproveMembers: undefined;
  MemberList: undefined;
  SoulsWon: { scope?: 'mine'|'unit' } | undefined;
  ManageUnitLeadersUnitScreen: undefined;
  AttendanceHome: undefined;
  StudentsList: undefined;
 TakeAttendance: { date?: string } | undefined;
  AttendanceRecord: { studentId: string; student?: Student | undefined };
  AttendanceSummary: undefined;
  InviteAndPart: undefined;
  MemberInvited: undefined;
  RecoveredAddict: undefined;
  GraduatedStudents: undefined;
  GraduatedStudentsList: undefined;
  Testimonies: undefined;
  SongReleased: undefined;
  UnitAssignmentsList: undefined;
  UnitAssignmentsDetail: { unit: any } | undefined;
  AddPeop: undefined;
  PeopleInvited: undefined;
  AddSoulModal: { visible: boolean; onClose: () => void; navigation: any };
  LegalContent: { type: 'terms' | 'privacy' } | undefined;
  UnitLeaderProfile: undefined;
  Achievements: undefined;
  WorkPlansList: undefined;
  NewWorkPlan: { draftId?: string } | undefined;
  ViewWorkPlan: { id: string };
  AdminWorkPlansList: undefined;
  AdminViewWorkPlan: { id: string };
  AwaitingApproval: undefined;
  ChurchSwitch: undefined;
  AssignUnitControl: undefined;
  FinanceSummary: { unitId?: string } | undefined;
  FinanceIncomeHistory: { unitId?: string; type: 'income' } | undefined;
  FinanceExpenseHistory: { unitId?: string; type: 'expense' } | undefined;
  FinanceRecord: { unitId?: string; type: 'income'|'expense' } | undefined;

};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function Navigation() {
  // Use a ref to listen for nav changes and normalize StatusBar each time
  const navRef = useNavigationContainerRef();
  React.useEffect(() => {
    // Set a safe default on mount
    StatusBar.setBarStyle('dark-content');
    // Note: on Android, backgroundColor persists; set to white to avoid bleed
    StatusBar.setBackgroundColor('#ffffff');
  }, []);

  React.useEffect(() => {
    const unsubscribe = navRef.addListener('state', () => {
      // Every navigation change, re-apply the default to prevent prior screen bleed
      StatusBar.setBarStyle('dark-content');
      StatusBar.setBackgroundColor('#ffffff');
    });
    return unsubscribe;
  }, [navRef]);
  return (
    <PhoneNumberProvider>
  <NavigationContainer theme={navTheme} ref={(ref)=>{ navigationRef.current = ref as any; (navRef as any).current = ref; }}>
        <Stack.Navigator
          screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#ffffff' } }}
          initialRouteName="Registration"
        >
          <Stack.Screen name="Registration" component={RegistrationScreen} />
          <Stack.Screen name="SuperAdminForm" component={SuperAdminForm} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="Phonenumber" component={PhonenumberScreen} />
          <Stack.Screen name="OtpScreen" component={OtpScreen} />
          <Stack.Screen name="MailOtp" component={OtpVerificationScreen} />
          <Stack.Screen name="SuperAdminRegistration" component={SuperAdminRegistrationScreen} />
          <Stack.Screen name="RegularRegistrationForm" component={RegularRegistrationForm} />
          <Stack.Screen name="FingerprintSetup" component={FingerprintSetupScreen} />
          <Stack.Screen name="Testimonies" component={TestimoniesScreen} />
          <Stack.Screen name="ProfileAdmin" component={ProfileScreen} />
          <Stack.Screen name="UnitLeaderFormOne" component={UnitLeader1Screen} />
          <Stack.Screen name="UnitLeaderFormTwo" component={UnitLeader2Screen} />
          <Stack.Screen name="NotificationDetail" component={NotificationDetailScreen} />
          <Stack.Screen name="Notification" component={NotificationScreen} />
          <Stack.Screen name="ComposeEmailScreen" component={ComposeEmailScreen} />
          <Stack.Screen name="AllUnitDashboard" component={AllUnitDashboardsScreen} />
          <Stack.Screen name="AddUnit" component={AddUnitScreen} />
          <Stack.Screen name="GraduatedStudents" component={GraduatedStudents} />
          <Stack.Screen name="GraduatedStudentsList" component={GraduatedStudentsList} />
          <Stack.Screen name="MemberInvited" component={MemberInvited} />
          <Stack.Screen
            name="AttendanceHome"
            component={AttendanceHome}
            options={{ title: 'Attendance Home' }}
          />
          <Stack.Screen
            name="StudentsList"
            component={StudentsList}
            options={{ title: 'Students List' }}
          />
          <Stack.Screen
            name="TakeAttendance"
            component={TakeAttendance}
            options={{ title: 'Take Attendance' }}
          />
          <Stack.Screen
            name="AttendanceRecord"
            component={AttendanceRecord}
            options={{ title: 'Attendance Record' }}
          />
          <Stack.Screen
            name="AttendanceSummary"
            component={AttendanceSummary}
            options={{ title: 'Attendance Summary' }}
          />
          <Stack.Screen name="UnitMember" component={MembersAssistedScreen} />
          <Stack.Screen name="MembersMarried" component={MarriagesScreen} />
          <Stack.Screen name="InviteAndPart" component={InviteAndPart} />
          <Stack.Screen name="AddUnitNext" component={AdminUnitLead} />
          <Stack.Screen name="RecoveredAddict" component={RecoveredAddictsScreen} />
          <Stack.Screen name="Achievements" component={AchievementsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="EventAndAnnouncement" component={EventsAnnouncementsScreen} />
          <Stack.Screen name="SongReleased" component={SongsScreen} />
          <Stack.Screen name="UnitAssignmentsList" component={UnitAssignmentsListScreen} />
          <Stack.Screen name="UnitAssignmentsDetail" component={UnitAssignmentsDetailScreen} />
          <Stack.Screen name="AddEvent" component={AddEventScreen} />
          <Stack.Screen name="AddAnnouncement" component={AddAnnouncementScreen} />
          <Stack.Screen name="ManageSuperAdminsUnitLeaders" component={ManageSuperAdminsUnitLeadersScreen} />
          <Stack.Screen name="AddNewSuperAdmin" component={AddNewSuperAdminScreen} />
          <Stack.Screen name="ApproveUnitLeaders" component={ApproveUnitLeadersScreen} />
          <Stack.Screen name="ApproveSuperAdmins" component={ApproveSuperAdminsScreen} />
          <Stack.Screen name="MinistryDashboard" component={MinistryDashboard} />
          <Stack.Screen name="ApproveMinistryAdmins" component={ApproveMinistryAdminsScreen} />
          <Stack.Screen name="ApproveMembers" component={ApproveMembersScreen} />
          <Stack.Screen name="ManageUnitLeadersUnitScreen" component={ManageUnitLeadersUnitScreen} />
          <Stack.Screen
            name="MemberList"
            component={MemberListScreen}
            options={{
              headerShown: false,
            }}
          />

          <Stack.Screen
            name="SoulsWon"
            component={SoulsWonScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="Sales"
            component={SalesNavigator}
            options={{
              headerShown: false
            }}
          />
          <Stack.Screen
            name="PeopleInvited"
            component={PeopleInvitedScreen}
            options={{
              headerShown: false,
            }}
          />

          <Stack.Screen
            name="AddSoulModal"
            options={{
              presentation: 'modal',
              headerShown: false,
            }}
          >
            {(props) => <AddSoulModal {...props} visible={true} onClose={() => { }} />}
          </Stack.Screen>
          <Stack.Screen
            name="AddPeop"
            options={{
              presentation: 'modal',
              headerShown: false,
            }}
          >
            {(props) => <AddPeop {...props} visible={true} onClose={() => { }} />}
          </Stack.Screen>
          <Stack.Screen name="LegalContent" component={LegalContentScreen} />
          <Stack.Screen name="UnitLeaderProfile" component={require('../screens/main/UnitLeader/UnitLeaderProfileScreen').default} />
          <Stack.Screen name="WorkPlansList" component={WorkPlansListScreen} />
          <Stack.Screen name="NewWorkPlan" component={NewWorkPlanScreen} />
          <Stack.Screen name="ViewWorkPlan" component={ViewWorkPlanScreen} />
          <Stack.Screen name="AdminWorkPlansList" component={AdminWorkPlansListScreen} />
          <Stack.Screen name="AdminViewWorkPlan" component={AdminViewWorkPlanScreen} />
          <Stack.Screen name="AwaitingApproval" component={AwaitingApprovalScreen} />
          <Stack.Screen name="ChurchSwitch" component={ChurchSwitchScreen} />
          <Stack.Screen name="AssignUnitControl" component={AssignUnitControlScreen} />
          <Stack.Screen name="FinanceSummary" component={FinanceSummaryScreen} />
          <Stack.Screen name="FinanceIncomeHistory" component={FinanceHistoryScreen} initialParams={{ type: 'income' }} />
          <Stack.Screen name="FinanceExpenseHistory" component={FinanceHistoryScreen} initialParams={{ type: 'expense' }} />
          <Stack.Screen name="FinanceRecord" component={FinanceRecordScreen} />

        </Stack.Navigator>
      </NavigationContainer>
    </PhoneNumberProvider>
  );
}
