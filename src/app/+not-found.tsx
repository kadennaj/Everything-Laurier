import { router } from 'expo-router';
import React from 'react';
import { Button, Empty } from '../components/ui';
export default function NotFound() { return <Empty title="A little off the beaten path." description="That page could not be found. Head back to campus." action={<Button label="Back to Discover" onPress={() => router.replace('/')} />} />; }
