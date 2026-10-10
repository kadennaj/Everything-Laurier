import React from 'react';
import { View } from 'react-native';
import { useOfficialEvents } from '../lib/official-events';
import { Button, ExternalButton, T } from './ui';

export function CalendarStatus() {
  const { syncedAt, loading, error, refresh, now } = useOfficialEvents();
  const stale = syncedAt && now - Date.parse(syncedAt) > 10 * 3600000;
  return <View style={{ gap: 8, alignItems: 'flex-start' }}>
    <T muted style={{ fontSize: 12, lineHeight: 19 }}>{loading ? 'Loading campus events…' : syncedAt
      ? `Laurier’s official calendar · Updated ${new Date(syncedAt).toLocaleString('en-CA', { timeZone: 'America/Toronto', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}${stale ? ' · Update delayed' : ''}`
      : 'Laurier’s official calendar'}</T>
    {(error || stale) && <T muted style={{ fontSize: 12 }}>{error || 'Showing the last available listings. Check the official calendar for recent changes.'}</T>}
    {!!error && <Button secondary label="Try again" onPress={() => { void refresh(); }} />}
    <ExternalButton label="Official calendar" url="https://events.wlu.ca/" />
  </View>;
}
