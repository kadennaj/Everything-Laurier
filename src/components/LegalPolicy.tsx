import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, ExternalButton, PageHeading, T, body } from './ui';
import { fonts as f } from '../lib/theme';
export function LegalPolicy({ policy }: { policy: { title: string; version: string; sections: { title: string; paragraphs: string[] }[] } }) {
 return <><PageHeading title={policy.title} subtitle={`Version ${policy.version} · Everything Laurier`} />{policy.sections.map(section => <Card key={section.title} style={{ padding: 22, gap: 16 }}><T accessibilityRole="header" style={{ fontFamily: f.bold, fontSize: 21, lineHeight: 29 }}>{section.title}</T>{section.paragraphs.map((paragraph, index) => <T key={index} selectable style={body}>{paragraph}</T>)}</Card>)}<View style={{ gap: 12 }}><ExternalButton label="Contact Kaden Najarali" url="mailto:everythinglaurier@gmail.com" /><Button secondary label="All legal notices" onPress={() => router.push('/legal')} /></View></>;
}
