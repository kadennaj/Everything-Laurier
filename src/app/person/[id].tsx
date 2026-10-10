import { Redirect, useLocalSearchParams } from 'expo-router';
import React from 'react';
// Preserve old links while directing people to the real, moderated directory.
export default function PersonPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id ?? '') ? { pathname: '/student/[id]', params: { id } } : '/people'} />;
}
