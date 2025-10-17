import * as Notifications from 'expo-notifications';
import type { NotificationResponse } from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URl } from '../api/users';
import { navigationRef, navigate as nav } from 'navigation/navigationRef';
import { Colors } from '../screens/main/UnitLeader/theme/colors';

// One-time init guard
let initialized = false;

// Show alerts in foreground and use default sound
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    // For iOS 16+ specific properties; keep defaults if unsupported
    // @ts-ignore
    shouldShowBanner: true,
    // @ts-ignore
    shouldShowList: true,
  })
});

function deriveProjectId(): string | undefined {
  // Try multiple places because EAS/Expo place it differently
  // @ts-ignore
  return (Constants?.expoConfig?.extra?.eas?.projectId)
    // @ts-ignore
    || (Constants as any)?.easConfig?.projectId
    // @ts-ignore
    || (Constants as any)?.expoConfig?.projectId;
}

async function createAndroidChannel() {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: undefined,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: Colors.primary,
    });
  } catch {}
}

export async function ensurePushTokenRegistered(): Promise<void> {
  try {
    if (!Device.isDevice) return; // simulators may not get a token
    await createAndroidChannel();

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const projectId = deriveProjectId();
    const tokenRes = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    const expoToken = tokenRes.data;
    if (!expoToken) return;

    const saved = await AsyncStorage.getItem('expoPushToken');
    if (saved === expoToken) return; // already registered

    const auth = await AsyncStorage.getItem('token');
    if (!auth) return; // not logged in yet

    await axios.post(
      BASE_URl + '/api/push/register',
      { token: expoToken, platform: Platform.OS },
      { headers: { Authorization: `Bearer ${auth.trim()}` } }
    );
    await AsyncStorage.setItem('expoPushToken', expoToken);
  } catch (e) {
    // swallow errors to avoid blocking app startup
  }
}

function navigateFromNotificationData(data: any) {
  if (!data || !navigationRef.isReady()) return;
  const type = data.type as string | undefined;
  try {
    switch (type) {
      case 'message': {
        // Open notification detail with preview to reply
  nav('NotificationDetail', {});
        break;
      }
      case 'event':
      case 'announcement': {
  nav('AllUnitDashboard');
        break;
      }
      case 'approval': {
        // If user just got approved, send them to main tabs
  nav('MainTabs');
        break;
      }
      case 'workplan': {
        if (data.id) {
          nav('AdminViewWorkPlan', { id: String(data.id) });
        } else {
          nav('AdminWorkPlansList');
        }
        break;
      }
      default: {
        nav('Notification');
      }
    }
  } catch {}
}

export function initPushHandlingOnce() {
  if (initialized) return;
  initialized = true;
  // Response listener for taps
  Notifications.addNotificationResponseReceivedListener((resp: NotificationResponse) => {
    try {
      const data = resp?.notification?.request?.content?.data;
      navigateFromNotificationData(data);
    } catch {}
  });
  // Handle app opened from a notification when cold-started
  Notifications.getLastNotificationResponseAsync().then((init: any) => {
    try {
      const data = init?.notification?.request?.content?.data;
      if (data) {
        // defer a tick to allow navigation container to mount
        setTimeout(() => navigateFromNotificationData(data), 200);
      }
    } catch {}
  }).catch(()=>{});
}

