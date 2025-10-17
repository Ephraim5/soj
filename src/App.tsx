import 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Navigation from './navigation/Navigation';
import AppBootstrapGate from './components/AppBootstrapGate';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useReactQueryDevTools } from '@dev-plugins/react-query';
import Toast from 'react-native-toast-message';
import { toastConfig } from 'toastConfig';
import LoadingOverlay from './components/LoadingOverlay';
import InitialLoaderGate from './components/InitialLoaderGate';
import { SoulsStoreProvider } from './context/SoulsStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Lazy import socket.io-client to avoid runtime crash if not installed in dev
let ioRef: any = null;
try { ioRef = require('socket.io-client').io; } catch {}
type Socket = any;
import { BASE_URl } from './api/users';
import { eventBus } from './utils/eventBus';

const queryClient = new QueryClient();

function MainApp() {
  useReactQueryDevTools(queryClient);
  useEffect(() => {
    (async ()=>{ try { await SplashScreen.preventAutoHideAsync(); } catch {} })();
    // Hide splash quickly; our own gate handles additional branding delay
    setTimeout(()=>{ SplashScreen.hideAsync().catch(()=>{}); }, 400);
  }, []);

  // Socket.io client: register and listen for message events
  useEffect(() => {
    let socket: Socket | null = null;
    (async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const rawUser = await AsyncStorage.getItem('user');
        const me = rawUser ? JSON.parse(rawUser) : null;
        if (!token || !me?._id) return;
        if(!ioRef) return; // no socket client available
        socket = ioRef(BASE_URl, { transports: ['websocket'], auth: { token } });
        // Register this user on connect (server maps userId->socketId)
        socket.on('connect', () => {
          try { socket?.emit('register', { userId: me._id }); } catch {}
        });
        // On message, we can broadcast an event to refresh notifications or detail
        socket.on('message', () => { eventBus.emit('SOJ_MESSAGE'); });
        // Presence list from server
        socket.on('onlineUsers', (ids: string[])=>{ eventBus.emit('SOJ_PRESENCE', ids); });
      } catch {}
    })();
    return () => { try { socket?.disconnect(); } catch {} };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <InitialLoaderGate minDuration={1400}>
        <AppBootstrapGate>
          <SoulsStoreProvider>
            <Navigation />
          </SoulsStoreProvider>
        </AppBootstrapGate>
      </InitialLoaderGate>
      <Toast config={toastConfig} />
    </QueryClientProvider>
  );
}

export default function App() {
  return <MainApp />;
}