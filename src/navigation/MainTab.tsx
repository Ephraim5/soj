import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, Entypo, Feather, AntDesign } from '@expo/vector-icons';
import { Platform, TouchableWithoutFeedback, View, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import HomeScreen from '../screens/Tab/HomeScreen';
import ReportScreen from '../screens/Tab/ReportScreen';
import SupportScreen from '../screens/Tab/SupportScreen';
import More from '../screens/Tab/MoreScreen';
import { AppEventBus } from '../components/AppBootstrapGate';
import ModernLoader from '../loader/load';
import { listConversations } from '../api/messages';
import { eventBus } from '../utils/eventBus';

const Tab = createBottomTabNavigator();
type MinimalUser = { _id: string; activeRole?: string };

const roleCanSeeReports = (role?: string) => {
  if (!role) return false;
  // MinistryAdmin should not see Reports tab
  return ['UnitLeader','SuperAdmin'].includes(role);
};

export default function MainTabs() {
  const [userRole, setUserRole] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [unreadTotal, setUnreadTotal] = useState(0);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem('user');
        if (raw && mounted) {
          const parsed: MinimalUser = JSON.parse(raw);
          setUserRole(parsed.activeRole);
        }
      } catch {}
      finally { if(mounted) setLoading(false); }
    };
    load();
    const off = AppEventBus.on((event,payload)=>{
      if(event==='roleSwitchOptimistic' || event==='roleSwitched' || event==='roleSwitchRevert' || event==='profileRefreshed' || event==='profileLoaded'){
        load();
      }
    });
    return ()=>{ mounted=false; off(); };
  }, []);

  useEffect(()=>{
    let mounted = true;
    const refresh = async ()=>{
      try{ const res = await listConversations(); if(!mounted) return; const total = (res.conversations||[]).reduce((acc:number, c:any)=> acc + (c.unread||0), 0); setUnreadTotal(total); }
      catch{}
    };
    refresh();
    const off = eventBus.on('SOJ_MESSAGE', refresh);
    return ()=>{ mounted=false; off && off(); };
  }, []);

  if (loading) {
    return (
      <View style={{ flex:1, backgroundColor:'#fff', justifyContent:'center', alignItems:'center' }}>
        <ModernLoader fullscreen={false} spinnerSize={70} ringWidth={7} logoSize={42} />
      </View>
    );
  }
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => (
          route.name === 'Home' ? (
            <View>
              <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
              {unreadTotal>0 && (
                <View style={{ position:'absolute', top:-6, right:-12, backgroundColor:'#ef4444', borderRadius:10, minWidth:18, height:18, alignItems:'center', justifyContent:'center', paddingHorizontal:4 }}>
                  <Text style={{ color:'#fff', fontSize:10, fontWeight:'800' }}>{unreadTotal>9? '9+': unreadTotal}</Text>
                </View>
              )}
            </View>
          ) : route.name === 'Reports' ? (
            <Feather name="bar-chart-2" size={size} color={color} />
          ) : route.name === 'Support' ? (
            <AntDesign name="customerservice" size={size} color={color} />
          ) : route.name === 'More' ? (
            <Entypo name="menu" size={size} color={color} />
          ) : (
            <Ionicons name="ellipse-outline" size={size} color={color} />
          )
        ),
        animationEnabled: true,
        paddingEnabled: true,
        tabBarActiveTintColor: '#349DC5',
        tabBarInactiveTintColor: '#8e8e93',
        tabBarHideOnKeyboard: true,
        tabBarButton: (props) => (
          <TouchableWithoutFeedback onPress={props.onPress} >
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              {props.children}
            </View>
          </TouchableWithoutFeedback>
        ),

        headerShown: false,
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 90 : 70,
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          backgroundColor: '#fff',
          position: 'absolute',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      {roleCanSeeReports(userRole) && (
        <Tab.Screen name="Reports" component={ReportScreen} />
      )}
      <Tab.Screen name="Support" component={SupportScreen} />
      <Tab.Screen name="More" component={More} />
    </Tab.Navigator>
  );
}
