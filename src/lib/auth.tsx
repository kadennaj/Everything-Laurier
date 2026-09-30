import type { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { AUTH_UNAVAILABLE, authErrorMessage, normalizeEmail, requestEmailCode, RESEND_DELAY_MS, restorePendingEmailDraft, verifyEmailCode } from './auth-flow';
import { emailLoginEnabled, supabase } from './supabase';

const PENDING_EMAIL_KEY = 'everything-laurier-pending-email-v1';
const clearPendingEmail = () => { void AsyncStorage.removeItem(PENDING_EMAIL_KEY).catch(() => {}); };

type AuthState = {
  session: Session | null;
  ready: boolean;
  configured: boolean;
  recoveryError: string;
  pendingEmail: string;
  cooldownEmail: string;
  resendAvailableAt: number;
  busy: boolean;
  sendCode: (email: string) => Promise<void>;
  verifyCode: (code: string) => Promise<void>;
  changeEmail: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!supabase);
  const [recoveryError, setRecoveryError] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [cooldownEmail, setCooldownEmail] = useState('');
  const [resendAvailableAt, setResendAvailableAt] = useState(0);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let active = true;
    let authEvents = 0;
    let signedIn = false;
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      authEvents++;
      signedIn = !!nextSession;
      setSession(nextSession);
      if (nextSession) {
        setRecoveryError('');
        setPendingEmail('');
        clearPendingEmail();
      }
    });
    const initialEvents = authEvents;
    void Promise.allSettled([client.auth.getSession(), AsyncStorage.getItem(PENDING_EMAIL_KEY)]).then(([sessionResult, draftResult]) => {
      if (!active) return;
      if (sessionResult.status === 'rejected' || sessionResult.value.error) {
        setRecoveryError('Your session could not be restored. Please sign in again.');
      } else if (authEvents === initialEvents) {
        signedIn = !!sessionResult.value.data.session;
        setSession(sessionResult.value.data.session);
      }
      if (!signedIn && draftResult.status === 'fulfilled' && draftResult.value) {
        const draft = restorePendingEmailDraft(draftResult.value);
        if (draft) {
          setPendingEmail(draft.email);
          setCooldownEmail(draft.email);
          setResendAvailableAt(draft.sentAt + RESEND_DELAY_MS);
        } else {
          clearPendingEmail();
        }
      }
      setReady(true);
    });

    const updateRefresh = (state: string) => {
      if (state === 'active') void client.auth.startAutoRefresh();
      else void client.auth.stopAutoRefresh();
    };
    if (Platform.OS !== 'web') updateRefresh(AppState.currentState);
    const appState = Platform.OS !== 'web' ? AppState.addEventListener('change', updateRefresh) : null;
    return () => {
      active = false;
      subscription.unsubscribe();
      appState?.remove();
      if (Platform.OS !== 'web') void client.auth.stopAutoRefresh();
    };
  }, []);

  async function perform(action: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try { await action(); }
    finally { inFlight.current = false; setBusy(false); }
  }

  const sendCode = (email: string) => perform(async () => {
    if (!supabase || !emailLoginEnabled) throw new Error(AUTH_UNAVAILABLE);
    const normalizedEmail = normalizeEmail(email);
    if (normalizedEmail === cooldownEmail && Date.now() < resendAvailableAt) throw new Error('Please wait before requesting another code.');
    await requestEmailCode(supabase.auth, normalizedEmail);
    const sentAt = Date.now();
    setPendingEmail(normalizedEmail);
    setCooldownEmail(normalizedEmail);
    setResendAvailableAt(sentAt + RESEND_DELAY_MS);
    setRecoveryError('');
    try { await AsyncStorage.setItem(PENDING_EMAIL_KEY, JSON.stringify({ email: normalizedEmail, sentAt })); }
    catch { /* The code still works in this session if local storage is unavailable. */ }
  });

  const verifyCode = (code: string) => perform(async () => {
    if (!supabase || !emailLoginEnabled) throw new Error(AUTH_UNAVAILABLE);
    if (!pendingEmail) throw new Error('Enter your email to request a new code.');
    const verifiedSession = await verifyEmailCode(supabase.auth, pendingEmail, code);
    setSession(verifiedSession);
    setPendingEmail('');
    clearPendingEmail();
  });

  const signOut = () => perform(async () => {
    if (!supabase) return;
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
      setSession(null);
      setPendingEmail('');
      clearPendingEmail();
    } catch (error) { throw new Error(authErrorMessage(error, 'signout')); }
  });

  return <AuthContext.Provider value={{ session, ready, configured: !!supabase && emailLoginEnabled, recoveryError, pendingEmail,
    cooldownEmail, resendAvailableAt, busy, sendCode, verifyCode, signOut,
    changeEmail: () => {
      if (!inFlight.current) {
        setPendingEmail('');
        clearPendingEmail();
      }
    },
  }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider is missing');
  return context;
}
