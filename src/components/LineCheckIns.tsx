import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { venues } from '../data/nightlife';
import { useAuth } from '../lib/auth';
import { currentLineStatus, isLineReportingOpen, lineOptions, lineTimeAgo, lineWaitLabel, type LineStatus } from '../lib/line-reporting';
import { supabase } from '../lib/supabase';
import { colors as c, fonts as f } from '../lib/theme';
import { Button, Eyebrow, Icon, T } from './ui';

const ink = '#F9F4EB';
const soft = '#C9BED0';

function LineCard({ venue, status, now, signedIn, reportingOpen, onUpdated }: {
  venue: typeof venues[number]; status?: LineStatus; now: Date; signedIn: boolean;
  reportingOpen: boolean; onUpdated: () => Promise<void>;
}) {
  const current = currentLineStatus(status, now);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function submit() {
    if (!supabase || selected === null || submitting) return;
    setSubmitting(true);
    setError('');
    setSuccess(false);
    const { error: submitError } = await supabase.rpc('submit_venue_line_report', {
      p_venue_id: venue.id, p_wait_minutes: selected,
    });
    if (submitError) {
      setError(submitError.message.includes('open at 6 PM') ? 'Reports open at 6 PM Waterloo time.' : 'We could not save your report. Please try again.');
    } else {
      await onUpdated();
      setEditing(false);
      setSelected(null);
      setSuccess(true);
    }
    setSubmitting(false);
  }

  return <View style={{ flexBasis: '46%', flexGrow: 1, minWidth: 280, backgroundColor: '#34253F', borderRadius: 19, padding: 22, gap: 16, borderWidth: 1, borderColor: '#5B4667' }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
      <View style={{ flex: 1, gap: 5 }}><T style={{ color: ink, fontFamily: f.bold, fontSize: 18 }}>{venue.shortName}</T><T style={{ color: soft, fontSize: 12 }}>{venue.area}</T></View>
      <View style={{ backgroundColor: current ? '#42694F' : '#5A4A62', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 }}><T style={{ color: ink, fontSize: 11, fontFamily: f.bold }}>{current ? 'LIVE REPORTS' : 'AWAITING REPORTS'}</T></View>
    </View>
    <View style={{ gap: 5 }}>
      <T accessibilityLabel={`${venue.shortName} line estimate: ${lineWaitLabel(current?.wait_minutes ?? null)}`} style={{ color: c.gold, fontFamily: f.serif, fontSize: 30, lineHeight: 38 }}>{lineWaitLabel(current?.wait_minutes ?? null)}</T>
      <T style={{ color: soft, fontSize: 12 }}>
        {current?.last_reported_at ? `${current.report_count} ${current.report_count === 1 ? 'report' : 'reports'} · Last update ${lineTimeAgo(current.last_reported_at, now)}` : 'Be the first to report tonight'}
      </T>
    </View>
    <View accessibilityLabel="Estimated line length scale" style={{ flexDirection: 'row', gap: 5 }}>{lineOptions.map((option, index) => <View key={option.minutes} style={{ height: 5, flex: 1, borderRadius: 4, backgroundColor: current && lineOptions.findIndex(item => item.minutes === current.wait_minutes) >= index ? c.gold : '#6B5973' }} />)}</View>
    {success && <T accessibilityRole="alert" style={{ color: '#BFE7C2', fontSize: 12 }}>Thanks — your report is live.</T>}
    {error && <T accessibilityRole="alert" style={{ color: '#FFD2C7', fontSize: 12 }}>{error}</T>}
    {editing ? <View style={{ gap: 13 }}>
      <T style={{ color: ink, fontFamily: f.bold, fontSize: 13 }}>How long is the line right now?</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{lineOptions.map(option => <Pressable key={option.minutes} accessibilityRole="button" accessibilityState={{ selected: selected === option.minutes }} onPress={() => setSelected(option.minutes)} style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', borderRadius: 9, paddingHorizontal: 12, backgroundColor: selected === option.minutes ? c.gold : '#554360', opacity: pressed ? 0.75 : 1 })}><T style={{ color: selected === option.minutes ? c.purpleDark : ink, fontFamily: f.bold, fontSize: 12 }}>{option.label}</T></Pressable>)}</View>
      <View style={{ flexDirection: 'row', gap: 9 }}><Pressable accessibilityRole="button" accessibilityState={{ disabled: submitting || selected === null }} disabled={submitting || selected === null} onPress={() => { void submit(); }} style={({ pressed }) => ({ flex: 1, minHeight: 46, borderRadius: 10, backgroundColor: c.gold, alignItems: 'center', justifyContent: 'center', opacity: submitting || selected === null ? 0.5 : pressed ? 0.75 : 1 })}><T style={{ color: c.purpleDark, fontFamily: f.bold, fontSize: 13 }}>{submitting ? 'Saving…' : 'Share update'}</T></Pressable><Button label="Cancel" secondary onPress={() => { setEditing(false); setError(''); }} style={{ flex: 1 }} /></View>
    </View> : <Pressable accessibilityRole="button" accessibilityState={{ disabled: signedIn && !reportingOpen }} disabled={signedIn && !reportingOpen} onPress={() => { setSuccess(false); if (!signedIn) router.push('/login'); else setEditing(true); }} style={({ pressed }) => ({ minHeight: 46, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#614A70', opacity: signedIn && !reportingOpen ? 0.65 : pressed ? 0.75 : 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' })}>
      <T style={{ color: ink, fontFamily: f.bold, fontSize: 13 }}>{!signedIn ? 'Sign in to report' : reportingOpen ? 'Report the line' : 'Reports open at 6 PM'}</T><Icon name={reportingOpen || !signedIn ? 'arrow-right' : 'clock'} color={ink} size={16} />
    </Pressable>}
  </View>;
}

export function LineCheckIns() {
  const { width } = useWindowDimensions();
  const { session } = useAuth();
  const [statuses, setStatuses] = useState<Record<string, LineStatus>>({});
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!supabase) { setError('Line updates are unavailable right now.'); setLoading(false); return; }
    const { data, error: fetchError } = await supabase.from('venue_line_status').select('venue_id,night_date,wait_minutes,report_count,last_reported_at');
    if (fetchError) { setStatuses({}); setError('Line updates could not load. Try again in a moment.'); }
    else { setStatuses(Object.fromEntries(((data ?? []) as LineStatus[]).map(item => [item.venue_id, item]))); setError(''); }
    setNow(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    const initialLoad = setTimeout(() => { void refresh(); }, 0);
    const ticker = setInterval(() => { setNow(new Date()); void refresh(); }, 60_000);
    const channel = supabase?.channel('venue-line-status').on('postgres_changes', { event: '*', schema: 'public', table: 'venue_line_status' }, () => { void refresh(); }).subscribe();
    return () => { clearTimeout(initialLoad); clearInterval(ticker); if (channel && supabase) void supabase.removeChannel(channel); };
  }, [refresh]);

  return <View style={{ gap: 20, backgroundColor: '#251B2F', borderRadius: 24, padding: width < 700 ? 20 : 30 }}>
    <View style={{ gap: 8 }}><Eyebrow color={c.gold}>THE LINE, RIGHT NOW</Eyebrow><T accessibilityRole="header" style={{ color: ink, fontFamily: f.serif, fontSize: width < 700 ? 28 : 34 }}>Know before you go.</T><T style={{ color: soft, fontSize: 13, lineHeight: 20 }}>Student-reported waits from the past 90 minutes. Estimates can change quickly.</T></View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
      {venues.map(venue => <LineCard key={venue.id} venue={venue} status={statuses[venue.id]} now={now} signedIn={!!session} reportingOpen={isLineReportingOpen(now)} onUpdated={refresh} />)}
    </View>
    {loading && <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><ActivityIndicator color={c.gold} size="small" /><T style={{ color: soft, fontSize: 12 }}>Checking tonight’s lines…</T></View>}
    {error && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><T accessibilityRole="alert" style={{ color: '#FFD2C7', fontSize: 12, flex: 1 }}>{error}</T><Button label="Retry" secondary onPress={() => { void refresh(); }} /></View>}
    <T style={{ color: soft, fontSize: 11, lineHeight: 18 }}>Reports are anonymous to other students. One current report per person, per place. Please report only what you can see.</T>
  </View>;
}
