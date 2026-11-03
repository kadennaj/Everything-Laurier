import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
export const pushSupported = Device.isDevice && !!projectId && Constants.appOwnership !== 'expo';
Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }) });
export async function pushToken(requestPermission: boolean): Promise<{ token: string; platform: 'ios' | 'android' } | null> {
  if (!pushSupported) return null;
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('nightlife', { name: 'Venue posts', importance: Notifications.AndroidImportance.DEFAULT, sound: null });
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && requestPermission && permission.canAskAgain) permission = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: false, allowBadge: false } });
  if (!permission.granted) return null;
  return { token: (await Notifications.getExpoPushTokenAsync({ projectId })).data, platform: Platform.OS === 'ios' ? 'ios' : 'android' };
}
export function listenForPush(open: (data: unknown) => void, refresh: () => void) {
  let active = true;
  const responses = Notifications.addNotificationResponseReceivedListener(response => open(response.notification.request.content.data));
  const tokens = Notifications.addPushTokenListener(() => refresh());
  void Notifications.getLastNotificationResponseAsync().then(response => {
    if (active && response) { open(response.notification.request.content.data); void Notifications.clearLastNotificationResponseAsync(); }
  }).catch(() => {});
  return () => { active = false; responses.remove(); tokens.remove(); };
}
