import { useEffect } from 'react';
import { AppState } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../lib/auth';
import { useLocal } from '../lib/state';
import { notificationRequest } from '../lib/notifications';
import { notificationTarget } from '../lib/notification-fields';
import { listenForPush, pushToken, pushSupported } from '../lib/push-device';
export function NightlifeNotifications() {
  const { session, ready } = useAuth();
  const { nightlifeAgeConfirmed } = useLocal();
  const userId = session?.user.id;
  useEffect(() => {
    if (!ready || !userId || !pushSupported) return;
    let active = true, running = false;
    async function refresh() {
      if (running || !active) return;
      running = true;
      try {
        const prefs = await notificationRequest('preferences');
        if (!active || !prefs.enabled || !prefs.available) return;
        const device = await pushToken(false);
        if (active) await notificationRequest(device && nightlifeAgeConfirmed ? 'register' : 'unregister', device && nightlifeAgeConfirmed ? device : {});
      } catch { /* Settings exposes retry; background sync never interrupts browsing. */ }
      finally { running = false; }
    }
    const stop = listenForPush(data => { const target = notificationTarget(data); if (active && target) router.push(target); }, () => { void refresh(); });
    const state = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    void refresh();
    return () => { active = false; state.remove(); stop(); };
  }, [ready, userId, nightlifeAgeConfirmed]);
  return null;
}
