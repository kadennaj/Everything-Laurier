import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Linking, Pressable, ScrollView, StyleProp, StyleSheet, Text, TextInput, TextStyle, useWindowDimensions, View, ViewStyle } from 'react-native';
import { colors as c, fonts as f } from '../lib/theme';
import { useLocal } from '../lib/state';

export type IconName = keyof typeof Feather.glyphMap;
export const Icon = ({ name, size = 20, color = c.ink }: { name: IconName; size?: number; color?: string }) => <Feather name={name} size={size} color={color} accessible={false} />;
export function T({ children, style, muted = false, ...props }: React.ComponentProps<typeof Text> & { muted?: boolean }) { return <Text {...props} style={[s.text, muted && { color: c.muted }, style]}>{children}</Text>; }
export function Button({ label, onPress, secondary, icon, style, disabled = false }: { label: string; onPress: () => void; secondary?: boolean; icon?: IconName; style?: StyleProp<ViewStyle>; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} accessibilityLabel={label} onPress={onPress} disabled={disabled} style={({ pressed }) => [s.button, secondary && s.secondary, style, { opacity: disabled ? 0.45 : pressed ? 0.78 : 1 }]}>{icon && <Icon name={icon} size={17} color={secondary ? c.purple : c.surface} />}<T style={{ color: secondary ? c.purple : c.surface, fontFamily: f.bold, fontSize: 14 }}>{label}</T></Pressable>;
}
export function IconButton({ name, label, onPress, active, style }: { name: IconName; label: string; onPress: () => void; active?: boolean; style?: StyleProp<ViewStyle> }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: active }} onPress={onPress} style={({ pressed }) => [s.iconButton, active && { backgroundColor: c.lavender }, style, pressed && { opacity: 0.65 }]}><Icon name={name} size={20} color={active ? c.purple : c.ink} /></Pressable>;
}
export function Pill({ label, active, onPress, icon }: { label: string; active?: boolean; onPress?: () => void; icon?: IconName }) {
  return <Pressable accessibilityRole={onPress ? 'button' : 'text'} accessibilityLabel={label} accessibilityState={onPress ? { selected: active } : undefined} onPress={onPress} style={({ pressed }) => [s.pill, active && s.pillActive, pressed && { opacity: 0.7 }]}>{icon && <Icon name={icon} size={15} color={active ? c.surface : c.muted} />}<T style={{ fontSize: 13, fontFamily: active ? f.bold : f.medium, color: active ? c.surface : c.muted }}>{label}</T></Pressable>;
}
export function Chips({ items, value, onChange }: { items: string[]; value: string; onChange: (v: string) => void }) { return <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingVertical: 3 }}>{items.map(item => <Pill key={item} label={item} active={item === value} onPress={() => onChange(item)} />)}</ScrollView>; }
export function Eyebrow({ children, color = c.purple }: { children: React.ReactNode; color?: string }) { return <T style={{ fontSize: 11, fontFamily: f.bold, letterSpacing: 1.8, color }}>{children}</T>; }
export function Badge({ label, color = c.lavender, textColor = c.purple }: { label: string; color?: string; textColor?: string }) { return <View style={{ alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 5, backgroundColor: color, borderRadius: 7 }}><T style={{ fontSize: 10, fontFamily: f.bold, color: textColor, letterSpacing: 0.3 }}>{label}</T></View>; }
export function PageHeading({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: React.ReactNode }) {
  const { width } = useWindowDimensions();
  return <View style={[s.heading, width < 700 && { flexDirection: 'column', alignItems: 'stretch' }]}><View style={{ flex: 1, gap: 8 }}><Eyebrow>{eyebrow}</Eyebrow><T accessibilityRole="header" style={{ fontSize: width < 600 ? 30 : 38, lineHeight: width < 600 ? 38 : 46, fontFamily: f.serif, letterSpacing: -1 }}>{title}</T><T muted style={{ maxWidth: 630, fontSize: 15, lineHeight: 23 }}>{subtitle}</T></View>{action}</View>;
}
export function SectionTitle({ title, subtitle, action, onPress }: { title: string; subtitle?: string; action?: string; onPress?: () => void }) { return <View style={[s.row, { justifyContent: 'space-between', gap: 16 }]}><View style={{ flex: 1 }}><T accessibilityRole="header" style={{ fontFamily: f.bold, fontSize: 20, letterSpacing: -0.4 }}>{title}</T>{subtitle && <T muted style={{ fontSize: 13, lineHeight: 19, marginTop: 5 }}>{subtitle}</T>}</View>{action && <Pressable onPress={onPress} accessibilityRole="button" style={[s.row, { minHeight: 44, gap: 7 }]}><T style={{ fontSize: 13, fontFamily: f.bold, color: c.purple }}>{action}</T><Icon name="arrow-up-right" size={16} color={c.purple} /></Pressable>}</View>; }
export function Search({ value, onChange, placeholder, onSubmit, style }: { value: string; onChange: (v: string) => void; placeholder: string; onSubmit?: () => void; style?: StyleProp<ViewStyle> }) { return <View style={[s.search, style]}><Icon name="search" size={19} color={c.muted} /><TextInput accessibilityLabel={placeholder} placeholder={placeholder} placeholderTextColor={c.muted} value={value} onChangeText={onChange} onSubmitEditing={onSubmit} returnKeyType="search" style={s.input} autoCapitalize="none" autoCorrect={false} />{value.length > 0 && <Pressable onPress={() => onChange('')} accessibilityLabel="Clear search" accessibilityRole="button" style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Icon name="x" size={16} /></Pressable>}</View>; }
export function Empty({ title, description, icon = 'search', action }: { title: string; description: string; icon?: IconName; action?: React.ReactNode }) { return <View style={s.empty}><View style={s.emptyIcon}><Icon name={icon} size={28} color={c.purple} /></View><T accessibilityRole="header" style={{ fontFamily: f.serif, fontSize: 25, textAlign: 'center' }}>{title}</T><T muted style={{ textAlign: 'center', lineHeight: 23, maxWidth: 350 }}>{description}</T>{action}</View>; }
export function SaveButton({ id, title, style }: { id: string; title: string; style?: StyleProp<ViewStyle> }) { const { saved, toggleSave } = useLocal(); const active = saved.includes(id); return <IconButton name={active ? 'check' : 'bookmark'} active={active} label={`${active ? 'Unsave' : 'Save'} ${title}`} onPress={() => toggleSave(id)} style={style} />; }
export function ExternalButton({ url, label, secondary = true }: { url: string; label: string; secondary?: boolean }) { const { notify } = useLocal(); return <Button label={label} secondary={secondary} icon="arrow-up-right" onPress={() => Linking.openURL(url).catch(() => notify('The link could not open. Please try again.'))} />; }
export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) { return <View style={[s.card, style]}>{children}</View>; }
export const body: TextStyle = { fontSize: 15, lineHeight: 25, color: c.muted };
export const s = StyleSheet.create({
  text: { fontFamily: f.regular, fontSize: 14, color: c.ink }, row: { flexDirection: 'row', alignItems: 'center' },
  card: { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 20, overflow: 'hidden', shadowColor: c.purpleDark, shadowOpacity: 0.035, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  button: { minHeight: 48, backgroundColor: c.purple, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 18, paddingVertical: 12 },
  secondary: { backgroundColor: c.lavender },
  iconButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
  pill: { minHeight: 44, borderRadius: 14, paddingHorizontal: 17, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface },
  pillActive: { backgroundColor: c.purple, borderColor: c.purple },
  heading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, paddingTop: 8, paddingBottom: 6 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingLeft: 16, minHeight: 52 },
  input: { flex: 1, minWidth: 0, minHeight: 50, fontFamily: f.regular, color: c.ink, fontSize: 15, paddingVertical: 12, paddingRight: 12 },
  empty: { paddingHorizontal: 24, paddingVertical: 44, alignItems: 'center', gap: 15 },
  emptyIcon: { backgroundColor: c.lavender, width: 64, height: 64, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
});
