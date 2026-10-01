import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, useWindowDimensions, View } from 'react-native';
import { lineVenues } from '../data/line-venues';
import { useAuth } from '../lib/auth';
import { currentLineStatus, isLineReportingOpen, lineOptions, lineTimeAgo, lineWaitLabel, type LineStatus } from '../lib/line-reporting';
import { supabase } from '../lib/supabase';
import { colors as c, fonts as f } from '../lib/theme';
import { Icon, T } from './ui';

export function LineCheckIns() {
  const { width } = useWindowDimensions();
  const { session } = useAuth();
  const [statuses, setStatuses] = useState<Record<string, LineStatus>>({});
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [savedVenue, setSavedVenue] = useState<string | null>(null);
  const open = isLineReportingOpen(now);

  const refresh = useCallback(async () => {
    if (!supabase) { setLoadError(true); setLoading(false); return; }
    const { data, error } = await supabase.from('venue_line_status').select('venue_id,night_date,wait_minutes,report_count,last_reported_at');
    if (error) { setStatuses({}); setLoadError(true); }
    else { setStatuses(Object.fromEntries(((data ?? []) as LineStatus[]).map(item => [item.venue_id, item]))); setLoadError(false); }
    setNow(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    const initial = setTimeout(() => { void refresh(); }, 0);
    const interval = setInterval(() => { void refresh(); }, 60_000);
    const channel = supabase?.channel('venue-line-status').on('postgres_changes', { event: '*', schema: 'public', table: 'venue_line_status' }, () => { void refresh(); }).subscribe();
    return () => { clearTimeout(initial); clearInterval(interval); if (channel && supabase) void supabase.removeChannel(channel); };
  }, [refresh]);

  async function submit() {
    if (!supabase || !editing || selected === null || submitting) return;
    setSubmitting(true);
    setSubmitError('');
    const venueId = editing;
    const { error } = await supabase.rpc('submit_venue_line_report', { p_venue_id: venueId, p_wait_minutes: selected });
    if (error) setSubmitError(error.message.includes('open at 6 PM') ? 'Reports open at 6 PM Waterloo time.' : 'Could not save your report. Try again.');
    else { await refresh(); setEditing(null); setSelected(null); setSavedVenue(venueId); }
    setSubmitting(false);
  }

  return <View style={{ backgroundColor: c.night, borderRadius: 21, padding: width < 700 ? 16 : 20, gap: 13 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
      <View style={{ flex: 1, gap: 3 }}><T accessibilityRole="header" style={{ color: c.surface, fontFamily: f.bold, fontSize: 18 }}>Tonight’s lines</T><T style={{ color: c.nightMuted, fontSize: 12 }}>Tap + to report · updates from the past 90 min</T></View>
      {loading ? <ActivityIndicator color={c.gold} size="small" /> : <Icon name="activity" size={19} color={c.gold} />}
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{lineVenues.map(venue => {
      const status = currentLineStatus(statuses[venue.id], now);
      const expanded = editing === venue.id;
      const actionLabel = !open ? `Reports at ${venue.name} open at 6 PM` : !session ? `Sign in to report the line at ${venue.name}` : `Report the line at ${venue.name}`;
      return <View key={venue.id} style={{ width: width < 760 ? '100%' : '48%', flexGrow: 1, backgroundColor: c.nightRaised, borderRadius: 13, overflow: 'hidden', borderWidth: 1, borderColor: expanded ? c.gold : c.nightBorder }}>
        <View style={{ minHeight: 61, paddingLeft: 14, paddingRight: 6, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1, minWidth: 0 }}><T numberOfLines={1} style={{ color: c.surface, fontFamily: f.bold, fontSize: 14 }}>{venue.shortName}</T><T numberOfLines={1} style={{ color: c.nightMuted, fontSize: 11, marginTop: 2 }}>{status?.last_reported_at ? `${status.report_count} ${status.report_count === 1 ? 'report' : 'reports'} · ${lineTimeAgo(status.last_reported_at, now)}` : 'No recent reports'}</T></View>
          <T accessibilityLabel={`${venue.name}: ${lineWaitLabel(status?.wait_minutes ?? null)}`} numberOfLines={1} style={{ color: status ? c.gold : c.nightMuted, fontFamily: f.bold, fontSize: 13, maxWidth: 112 }}>{status ? lineWaitLabel(status.wait_minutes) : 'No estimate'}</T>
          <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} accessibilityState={{ expanded, disabled: !open }} disabled={!open} onPress={() => { if (!session) router.push('/login'); else { setEditing(expanded ? null : venue.id); setSelected(null); setSubmitError(''); setSavedVenue(null); } }} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center', opacity: !open ? 0.4 : pressed ? 0.65 : 1 })}><Icon name={expanded ? 'x' : 'plus'} color={c.gold} size={20} /></Pressable>
        </View>
        {expanded && <View style={{ paddingHorizontal: 12, paddingBottom: 12, gap: 10 }}>
          <T style={{ color: c.nightMuted, fontSize: 12 }}>How long is the line right now?</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>{lineOptions.map(option => <Pressable key={option.minutes} accessibilityRole="button" accessibilityState={{ selected: selected === option.minutes }} onPress={() => setSelected(option.minutes)} style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 10, borderRadius: 9, justifyContent: 'center', backgroundColor: selected === option.minutes ? c.gold : c.nightOption, opacity: pressed ? 0.7 : 1 })}><T style={{ color: selected === option.minutes ? c.night : c.surface, fontFamily: f.bold, fontSize: 12 }}>{option.label}</T></Pressable>)}</View>
          {!!submitError && <T accessibilityRole="alert" style={{ color: c.nightError, fontSize: 12 }}>{submitError}</T>}
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: submitting || selected === null }} disabled={submitting || selected === null} onPress={() => { void submit(); }} style={({ pressed }) => ({ minHeight: 44, borderRadius: 10, backgroundColor: c.gold, alignItems: 'center', justifyContent: 'center', opacity: submitting || selected === null ? 0.48 : pressed ? 0.78 : 1 })}><T style={{ color: c.night, fontFamily: f.bold, fontSize: 13 }}>{submitting ? 'Saving…' : 'Share line update'}</T></Pressable>
        </View>}
        {savedVenue === venue.id && <T accessibilityRole="alert" style={{ color: c.nightSuccess, fontSize: 11, paddingHorizontal: 14, paddingBottom: 8 }}>Thanks — your report is live.</T>}
      </View>;
    })}</View>
    {loadError && <Pressable accessibilityRole="button" onPress={() => { void refresh(); }} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 }}><Icon name="refresh-cw" size={15} color={c.gold} /><T style={{ color: c.surface, fontSize: 12 }}>Line updates unavailable. Tap to retry.</T></Pressable>}
    {!open && <T style={{ color: c.nightMuted, fontSize: 11 }}>Reports open at 6 PM Waterloo time.</T>}
  </View>;
}
