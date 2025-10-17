import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError } from 'axios';
import { BASE_URl } from '../api/users';
import ModernLoader from '../loader/load';
import { Colors } from '../screens/main/UnitLeader/theme/colors';
import Toast from 'react-native-toast-message';
import { ensurePushTokenRegistered, initPushHandlingOnce } from '../utils/push';

interface Props { children: React.ReactNode; }

type Phase = 'idle' | 'loading' | 'ready' | 'network-error' | 'unauthorized';

const BASE_URL = BASE_URl;

// Simple event emitter for role changes & bootstrap (avoid external libs)
export const AppEventBus = {
  listeners: new Set<(event:string,payload?:any)=>void>(),
  emit(event:string,payload?:any){ this.listeners.forEach(l=>l(event,payload)); },
  on(cb:(event:string,payload?:any)=>void){ this.listeners.add(cb); return ()=>this.listeners.delete(cb); }
};

export default function AppBootstrapGate({ children }: Props){
  // Initialize push listeners once
  initPushHandlingOnce();
  const [phase,setPhase] = useState<Phase>('idle');
  const [attempt,setAttempt] = useState(0);
  const [networkDetail,setNetworkDetail] = useState<string>('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const isRefreshingRef = useRef(false);

  const REFRESH_INTERVAL_MS = 60_000; // 1 minute

  const clearTimer = () => { if(timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; } };

  const fetchProfile = useCallback(async ()=>{
    const tokenRaw = await AsyncStorage.getItem('token');
    if(!tokenRaw){ setPhase('ready'); return; }
    try {
      const token = tokenRaw.trim();
  const res = await axios.get(BASE_URL + '/api/users/me',{ headers:{ Authorization:`Bearer ${token}` }, timeout: 8000 });
      if(res.data?.ok){
        await AsyncStorage.setItem('user', JSON.stringify(res.data.user));
        setPhase('ready');
        AppEventBus.emit('profileLoaded', res.data.user);
        // Register device push token in the background
        ensurePushTokenRegistered().catch(()=>{});
      } else {
        setPhase('unauthorized');
      }
    } catch(e){
      const ax = e as AxiosError;
      if(ax.response){
        if(ax.response.status === 401){ setPhase('unauthorized'); }
        else { setNetworkDetail('Server responded with status ' + ax.response.status); setPhase('network-error'); }
      } else {
        setNetworkDetail(ax.message.includes('timeout')? 'Request timed out' : 'No response - possibly offline');
        setPhase('network-error');
      }
    }
  },[]);

  // Silent refresh that does not alter visible phase unless we detect unauthorized.
  const silentRefresh = useCallback(async () => {
    if(isRefreshingRef.current || phase !== 'ready') return; // Only refresh while in ready state
    isRefreshingRef.current = true;
    try {
      const tokenRaw = await AsyncStorage.getItem('token');
      if(!tokenRaw){ isRefreshingRef.current = false; return; }
      const token = tokenRaw.trim();
  const res = await axios.get(BASE_URL + '/api/users/me',{ headers:{ Authorization:`Bearer ${token}` }, timeout: 8000 });
      if(res.data?.ok){
        await AsyncStorage.setItem('user', JSON.stringify(res.data.user));
  AppEventBus.emit('profileRefreshed', res.data.user);
        ensurePushTokenRegistered().catch(()=>{});
      } else {
        setPhase('unauthorized');
      }
    } catch(e){
      const ax = e as AxiosError;
      if(ax.response && ax.response.status === 401){
        setPhase('unauthorized');
      }
      // Suppress other errors to avoid flicker; next interval can succeed.
    } finally {
      isRefreshingRef.current = false;
    }
  },[phase]);

  const start = useCallback(()=>{
    clearTimer();
    setPhase('loading');
    const run = async () => {
      await fetchProfile();
    };
    run();
  },[fetchProfile]);

  // retry with backoff on network-error
  useEffect(()=>{
    if(phase==='idle') start();
  },[phase,start]);

  useEffect(()=>{
    if(phase==='network-error'){
      if(attempt < 3){
        const backoff = [1500, 3000, 5000][attempt] || 5000;
        timeoutRef.current = setTimeout(()=>{ setAttempt(a=>a+1); setPhase('loading'); fetchProfile(); }, backoff);
      }
    }
  },[phase,attempt,fetchProfile]);

  // Manage 1-minute auto refresh lifecycle.
  useEffect(()=>{
    if(phase === 'ready'){
      // Start interval if not already
      if(!refreshIntervalRef.current){
        // Immediate first silent refresh after one full interval (not instantly to avoid double fetch)
        refreshIntervalRef.current = setInterval(()=>{ silentRefresh(); }, REFRESH_INTERVAL_MS);
      }
    } else {
      // Clear interval when leaving ready state
      if(refreshIntervalRef.current){
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    }
    return ()=>{
      if(refreshIntervalRef.current){
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  },[phase,silentRefresh]);

  const manualRetry = () => { setAttempt(0); start(); };

  const handleUnauth = async () => {
    await AsyncStorage.multiRemove(['token','user']);
    Toast.show({ type:'info', text1:'Session ended', text2:'Please login again.' });
    setPhase('ready'); // let navigation show auth screens
    AppEventBus.emit('authCleared');
  };

  if(phase==='ready') return <>{children}</>;

  if(phase==='unauthorized'){
    return (
      <View style={styles.center}>        
        <Text style={styles.big}>Session Expired</Text>
        <Text style={styles.msg}>Your session is no longer valid. Please login again.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleUnauth}>
          <Text style={styles.primaryText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if(phase==='network-error'){
    return (
      <View style={styles.center}>        
        <View style={styles.iconCircle}><Text style={styles.iconTxt}>!</Text></View>
        <Text style={styles.big}>Network Issues</Text>
        <Text style={styles.msg}>{networkDetail || 'Unable to reach server.'}</Text>
        <Text style={styles.sub}>We will keep trying automatically{attempt<3?` (attempt ${attempt+1}/4)`:''}.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={manualRetry}>
          <Text style={styles.primaryText}>Retry Now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.loaderWrap}>
      <ModernLoader fullscreen spinnerSize={70} ringWidth={7} logoSize={42} />
      <Text style={styles.loadingText}>Preparing your dashboard...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loaderWrap:{ flex:1, backgroundColor:'#fff', justifyContent:'center', alignItems:'center' },
  loadingText:{ marginTop:16, color:Colors.primary, fontWeight:'600' },
  center:{ flex:1, backgroundColor:Colors.background, paddingHorizontal:28, justifyContent:'center', alignItems:'center' },
  big:{ fontSize:22, fontWeight:'700', color:Colors.primary, marginTop:12 },
  msg:{ textAlign:'center', color:'#333', marginTop:10, lineHeight:18 },
  sub:{ textAlign:'center', color:Colors.muted, fontSize:12, marginTop:8 },
  primaryBtn:{ marginTop:22, backgroundColor:Colors.primary, paddingHorizontal:26, paddingVertical:14, borderRadius:10 },
  primaryText:{ color:'#fff', fontWeight:'600', fontSize:15 },
  iconCircle:{ width:74, height:74, borderRadius:37, backgroundColor:'#dff3fb', justifyContent:'center', alignItems:'center' },
  iconTxt:{ fontSize:34, color:Colors.primary, fontWeight:'800' }
});
