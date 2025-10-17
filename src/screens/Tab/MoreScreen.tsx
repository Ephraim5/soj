import React, { useCallback, useEffect,useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TextInput,
  Switch,
   Animated, 
   Easing
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { heightPercentageToDP, widthPercentageToDP } from 'react-native-responsive-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URl } from '../../api/users';
import ModernLoader from 'loader/load';
import { AppEventBus } from '../../components/AppBootstrapGate';

type RootStackParamList = {
  // NOTE: Ensure this matches the actual registered route name in Navigation (ManageUnit.tsx exports ManageSuperAdminsUnitLeadersScreen)
  ManageSuperAdminsUnitLeaders: undefined;
  ManageUnitLeadersUnitScreen: undefined;
  ChurchSwitch: undefined;
  AssignUnitControl: undefined;
};

type MoreNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ManageSuperAdminsUnitLeaders',
  'ManageUnitLeadersUnitScreen'

>;
 type whoType = "superadmin" | "unitleader" | "member";



const More = () => {
  const navigation = useNavigation<MoreNavigationProp>();
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [hasFinSecDuty, setHasFinSecDuty] = useState<boolean>(false);
  // Derive role mapping dynamically each render to avoid stale state when profile loads async
  const whoManage: whoType = profile?.activeRole === 'SuperAdmin'
    ? 'superadmin'
    : profile?.activeRole === 'UnitLeader'
      ? 'unitleader'
      : 'member';
      const [loading, setLoading] = useState<boolean>(true);
      const [error, setError] = useState<string | null>(null);
  
    const fetchProfile = useCallback(async () => {
          try {
              setError(null);
              const token = await AsyncStorage.getItem('token');
              if (!token) {
                  setError('Missing token');
                  setLoading(false);
                  return;
              }
        const bioPref = await AsyncStorage.getItem('biometricEnabled');
        if(bioPref!==null) setBiometricEnabled(bioPref==='true');
              const res = await axios.get(`${BASE_URl}/api/users/me`, {
                  headers: { Authorization: `Bearer ${token}` }
              });
              if (res.data?.ok) {
                  setProfile(res.data.user);
                  try{
                    const u = res.data.user;
                    const roles = Array.isArray(u?.roles)? u.roles: [];
                    const activeUnitId = await AsyncStorage.getItem('activeUnitId');
                    let unitIdToCheck: string | null = activeUnitId || null;
                    if(!unitIdToCheck){ const match = roles.find((r:any)=> r.role === (u.activeRole||'') && (r.unit||r.unitId)); if(match) unitIdToCheck = String(match.unit||match.unitId); }
                    if(unitIdToCheck){
                      const has = roles.some((r:any)=> String(r.unit||r.unitId||'')===String(unitIdToCheck) && Array.isArray(r.duties) && (r.duties.includes('FinancialSecretary') || r.duties.includes('Financial Secretary')));
                      setHasFinSecDuty(!!has);
                    } else { setHasFinSecDuty(false); }
                  }catch{ setHasFinSecDuty(false); }
              } else {
                  setError('Failed to load profile');
              }
          } catch (e: any) {
              setError(e?.response?.data?.message || e.message);
          } finally {
              setLoading(false);
          }
      }, []);
  
      useEffect(() => {
          let mounted = true;
          const run = async()=>{ if(mounted) await fetchProfile(); };
          run();
          const off = AppEventBus.on((event,payload)=>{
            if(event==='roleSwitchOptimistic' || event==='roleSwitched' || event==='roleSwitchRevert' || event==='profileRefreshed' || event==='profileLoaded' || event==='assignmentsChanged'){
              run();
            }
          });
          return ()=>{ mounted=false; off(); };
      }, [fetchProfile]);
  //ManageUnitLeadersUnitScreen
  const handleLogout = useCallback(async () => {
    try {
      // Clear session/auth-related storage
      await AsyncStorage.multiRemove([
        'token',
        'user',
        'activeUnitId',
        'pendingEmail',
        'pendingUserId',
        'API_BASE_URL',
      ]);
    } catch {}
    // Reset navigation stack to Registration entry point
    // (keeps users in the correct bootstrap flow on next launch)
    navigation.reset({ index: 0, routes: [{ name: 'Registration' as never }] });
  }, [navigation]);

  if (loading) {
    return <ModernLoader />;
  }
  return (
    <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" />
      
      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          placeholder="Search"
          placeholderTextColor="#999"
          style={styles.searchInput}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollView}>
        
        {/* Manage Section */}
        <Text style={styles.sectionTitle}>Manage</Text>
        <View style={styles.card}>
         {whoManage !== 'member' && (<TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              if (whoManage === 'superadmin') {
                navigation.navigate('ManageSuperAdminsUnitLeaders' as any);
              } else {
                // MinistryAdmin and UnitLeader go to Unit Leaders & Members management (scoped)
                navigation.navigate('ManageUnitLeadersUnitScreen' as any);
              }
            }}
          >
            <View style={styles.iconWrapper}>
              <MaterialIcons name="people" size={22} color="#007AFF" />
            </View>
            <View style={styles.textWrapper}>
              <Text style={styles.menuText}>Manage {whoManage === 'superadmin' ? 'Super Admins & Unit Leaders' : 'and control unit' }</Text>
              <Text style={styles.subText}>
                {whoManage === 'superadmin'
                  ? 'Add, remove, or update super admins & unit leaders'
                  : 'Manage and control unit (approvals, duties)'}
              </Text>
            </View>
          </TouchableOpacity>)}
          {(profile?.activeRole==='SuperAdmin' || profile?.activeRole==='MinistryAdmin') && (
            <TouchableOpacity style={styles.menuItem} onPress={()=> navigation.navigate('AddUnit' as any)}>
              <View style={styles.iconWrapper}>
                <MaterialIcons name="group-add" size={22} color="#007AFF" />
              </View>
              <View style={styles.textWrapper}>
                <Text style={styles.menuText}>Add Unit</Text>
                <Text style={styles.subText}>Create a new unit under your ministry</Text>
              </View>
            </TouchableOpacity>
          )}
          {(profile?.activeRole==='SuperAdmin' || profile?.activeRole==='MinistryAdmin' || profile?.activeRole==='UnitLeader') && (
            <TouchableOpacity style={styles.menuItem} onPress={()=> navigation.navigate('AssignUnitControl' as any)}>
              <View style={styles.iconWrapper}>
                <MaterialIcons name="assignment" size={22} color="#007AFF" />
              </View>
              <View style={styles.textWrapper}>
                <Text style={styles.menuText}>Assign Unit Control</Text>
                <Text style={styles.subText}>
                  {profile?.activeRole==='UnitLeader' ? 'Select a member to make Financial Secretary' : 'Pick attendance-taking unit for your scope'}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
        {/* Financial Secretary Tools (Member only when has duty) */}
        {profile?.activeRole==='Member' && hasFinSecDuty && (
          <>
            <Text style={styles.sectionTitle}>Financial Secretary</Text>
            <View style={styles.card}>
              <TouchableOpacity style={styles.menuItem} onPress={()=> navigation.navigate('FinanceSummary' as any)}>
                <View style={styles.iconWrapper}>
                  <MaterialCommunityIcons name="chart-bar" size={22} color="#007AFF" />
                </View>
                <View style={styles.textWrapper}>
                  <Text style={styles.menuText}>Open Financial Summary</Text>
                  <Text style={styles.subText}>View income/expense totals for your unit</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={()=> navigation.navigate('FinanceIncomeHistory' as any)}>
                <View style={styles.iconWrapper}>
                  <MaterialIcons name="trending-up" size={22} color="#10b981" />
                </View>
                <View style={styles.textWrapper}>
                  <Text style={styles.menuText}>Income History</Text>
                  <Text style={styles.subText}>Add or edit unit income records</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={()=> navigation.navigate('FinanceExpenseHistory' as any)}>
                <View style={styles.iconWrapper}>
                  <MaterialIcons name="trending-down" size={22} color="#ef4444" />
                </View>
                <View style={styles.textWrapper}>
                  <Text style={styles.menuText}>Expense History</Text>
                  <Text style={styles.subText}>Add or edit unit expense records</Text>
                </View>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Legal Section */}
        <Text style={styles.sectionTitle}>Legal</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.iconWrapper}>
              <MaterialIcons name="description" size={22} color="#007AFF" />
            </View>
            <Text style={styles.menuText}>Terms & Privacy Policy</Text>
          </TouchableOpacity>
        </View>

        {/* App Section */}
        <Text style={styles.sectionTitle}>App</Text>
      
        <View style={styles.card}>
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.iconWrapper}>
              <MaterialIcons name="update" size={22} color="#007AFF" />
            </View>
            <View style={styles.textWrapper}>
              <Text style={styles.menuText}>App Updates & Version Info</Text>
              <Text style={styles.subText}>Check current app version, see latest updates</Text>
            </View>
          </TouchableOpacity>

        </View>
                <Text style={styles.sectionTitle}>Control</Text>

        <View style={styles.card}>
                    {profile?.activeRole==='SuperAdmin' && profile?.multi && (
            <TouchableOpacity style={styles.menuItem} onPress={()=>{ navigation.navigate('ChurchSwitch' as any); }}>
              <View style={styles.iconWrapper}>
                <MaterialIcons name="church" size={22} color="#007AFF" />
              </View>
              <View style={styles.textWrapper}>
                <Text style={styles.menuText}>Switch Church</Text>
                <Text style={styles.subText}>Select a different church context to manage</Text>
              </View>
            </TouchableOpacity>
          )}</View>

        {/* Settings Section */}
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.card}>
          <View style={styles.menuItem}>
            <View style={styles.iconWrapper}>
              <MaterialCommunityIcons name="fingerprint" size={20} color="#007AFF" />
            </View>
            <Text style={styles.menuText}>Enable/Disable Biometric Login</Text>
            <Switch
              value={biometricEnabled}
              onValueChange={async (val)=>{
                setBiometricEnabled(val);
                await AsyncStorage.setItem('biometricEnabled', val? 'true':'false');
              }}
              style={{width:30,height:30}}
            />
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={[styles.card, styles.logoutCard]} onPress={handleLogout}>
          <View style={styles.menuItem}>
            <View style={styles.iconWrapper}>
              <MaterialIcons name="logout" size={22} color="#FF3B30" />
            </View>
            <Text style={[styles.menuText, { color: '#FF3B30' }]}>Logout</Text>
          </View>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flexGrow: 1,
    height:heightPercentageToDP("100%"),
    paddingTop:heightPercentageToDP(4),
    backgroundColor: '#F8F9FA',
    
  },
  searchContainer: {
    padding: 16,
    backgroundColor: 'white',
  },
  searchInput: {
    backgroundColor: '#F1F3F5',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#000',
  },
  scrollView: {
    paddingHorizontal: 16,
    flexGrow: 1,
    paddingBottom: heightPercentageToDP(12)
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 20,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    overflow: 'hidden',
    width:widthPercentageToDP(90)
  },
  logoutCard: {
    marginTop: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  iconWrapper: {
    backgroundColor: '#E8F0FE',
    padding: 8,
    borderRadius: 50,
    marginRight: 12,
  },
  textWrapper: {
    flex: 1,
  },
  menuText: {
    fontSize: widthPercentageToDP(4),
    fontWeight: '500',
    color: '#111827',
    marginRight:widthPercentageToDP(6),
    marginLeft:widthPercentageToDP(1),
  },
  subText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  }
});

export default More;

