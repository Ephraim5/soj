import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DashboardScreen from '../main/SuperAdmin/DashboardScreen';
import Dashboard from '../main/UnitLeader/Dashboard';
import { AppEventBus } from '../../components/AppBootstrapGate';
import ModernLoader from '../../loader/load';
import { Colors } from '../main/UnitLeader/theme/colors';
import DashboardMember from '@screens/main/UnitMember/Dashboard';
import MinistryDashboard from '@screens/MinistryAdmin/MinistryDashboard';

type MinimalUser = { activeRole?: string; firstName?: string };

const mapRole = (role?: string): 'superadmin' | 'ministry' | 'leader' | 'member' | 'unknown' => {
  switch (role) {
    case 'SuperAdmin':
      return 'superadmin';
    case 'MinistryAdmin':
      return 'ministry';
    case 'UnitLeader':
      return 'leader';
    case 'Member':
      return 'member';
    default:
      return 'unknown';
  }
};

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'superadmin' | 'ministry' | 'leader' | 'member' | 'unknown'>('unknown');
  const [user, setUser] = useState<MinimalUser | null>(null);

  const stableRoleRef = useRef(role);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('user');
        if (raw) {
          const parsed: MinimalUser = JSON.parse(raw);
            setUser(parsed);
            setRole(mapRole(parsed.activeRole));
            stableRoleRef.current = mapRole(parsed.activeRole);
        }
      } catch {}
      finally {
        setLoading(false);
      }
    })();
  const off = AppEventBus.on((event,payload)=>{
      if(event==='roleSwitchOptimistic' && payload?.activeRole){
        const mapped = mapRole(payload.activeRole);
        setRole(mapped);
      }
      if(event==='roleSwitched' && payload?.activeRole){
        const mapped = mapRole(payload.activeRole);
        setRole(mapped);
        stableRoleRef.current = mapped;
      }
      if(event==='roleSwitchRevert' && payload?.activeRole){
        const mapped = mapRole(payload.activeRole);
        setRole(mapped);
        stableRoleRef.current = mapped;
      }
      if(event==='profileRefreshed' && payload?.activeRole){
        const mapped = mapRole(payload.activeRole);
        if(mapped !== stableRoleRef.current){
          setRole(mapped);
          stableRoleRef.current = mapped;
        }
      }
    });
    return () => { off(); };
  }, []);

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ModernLoader fullscreen={false} spinnerSize={70} ringWidth={7} logoSize={42} />
        <Text style={styles.loadingText}>Preparing your dashboard...</Text>
      </View>
    );
  }

  if (role === 'superadmin') {
    return <DashboardScreen />;
  }
  if (role === 'ministry') {
    return <MinistryDashboard />;
  }
  if (role === 'leader') {
    return <Dashboard />;
  }

  // Placeholder for member & pastor unit views
  return (<DashboardMember />);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff', // optional
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  loaderWrap:{ flex:1, backgroundColor:'#fff', justifyContent:'center', alignItems:'center' },
  loadingText:{ marginTop:16, color:Colors.primary, fontWeight:'600' },
  text: {
    fontSize: 28,
    fontWeight: '600',
    color: '#222',
    textAlign: 'center',
  },
  sub: {
    marginTop: 8,
    fontSize: 16,
    color: '#555'
  },
  helper: {
    marginTop: 4,
    fontSize: 14,
    color: '#888'
  }
});
