import { View, Text } from 'react-native'
import React, { useEffect, useState } from 'react'
import ReportLeader from '../main/UnitLeader/ReportScreen';
import ReportMember from '../main/UnitMember/ReportScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppEventBus } from '../../components/AppBootstrapGate';

type RoleType = 'superadmin' | 'leader' | 'member' | 'unknown';

const mapRole = (r?: string): RoleType => {
  switch(r){
    case 'SuperAdmin': return 'superadmin';
    case 'UnitLeader': return 'leader';
    case 'Member': return 'member';
    default: return 'unknown';
  }
}


export default function ReportScreen() {
  const [role, setRole] = useState<RoleType>('unknown');
  useEffect(()=>{
    let mounted = true;
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem('user');
        if(!mounted) return;
        if(raw){ const parsed = JSON.parse(raw); setRole(mapRole(parsed.activeRole)); }
      } catch{}
    };
    load();
    const off = AppEventBus.on((event,payload)=>{
      if(event==='roleSwitchOptimistic' || event==='roleSwitched' || event==='roleSwitchRevert' || event==='profileRefreshed' || event==='profileLoaded'){
        load();
      }
    });
    return ()=>{ mounted=false; off(); };
  },[]);

  if (role === 'leader' || role === 'superadmin') {
    // Use leader report screen for both UnitLeader and SuperAdmin contexts for now
    return (<ReportLeader />);
  }
  if (role === 'member') {
    return (<ReportMember />);
  }
  return (<View><Text>ReportScreen</Text></View>);


}