import { Feather } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleProp, StyleSheet, Text, TextInput, TextStyle, useWindowDimensions, View, ViewStyle } from 'react-native';
import { colors as c, fonts as f, radii } from '../lib/theme';
import { useLocal } from '../lib/state';

export type IconName = keyof typeof Feather.glyphMap;
export const Icon = ({ name, size = 20, color = c.ink }: { name: IconName; size?: number; color?: string }) => <Feather name={name} size={size} color={color} accessible={false} />;
export function T({ children, style, muted = false, ...props }: React.ComponentProps<typeof Text> & { muted?: boolean }) {
  return <Text {...props} style={[s.text, muted && { color: c.muted }, style]}>{children}</Text>;
}
export function Button({ label, onPress, secondary, icon, style, disabled = false, loading = false }: { label: string; onPress: () => void; secondary?: boolean; icon?: IconName; style?: StyleProp<ViewStyle>; disabled?: boolean; loading?: boolean }) {
  const unavailable = disabled || loading;
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: unavailable, busy: loading }} accessibilityLabel={label} onPress={onPress} disabled={unavailable}
    style={({ pressed }) => [s.button, secondary && s.secondary, style, { opacity: unavailable ? (loading ? 0.8 : 0.45) : pressed ? 0.76 : 1 }]}>
    {loading ? <ActivityIndicator size="small" color={secondary ? c.purple : c.surface} /> : icon ? <Icon name={icon} size={18} color={secondary ? c.purple : c.surface} /> : null}
    <T style={{ color: secondary ? c.purple : c.surface, fontFamily: f.medium, fontSize: 14, flexShrink: 1, textAlign: 'center' }}>{label}</T>
  </Pressable>;
}
export function IconButton({ name, label, onPress, active, style }: { name: IconName; label: string; onPress: () => void; active?: boolean; style?: StyleProp<ViewStyle> }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: active }} onPress={onPress}
    style={({ pressed }) => [s.iconButton, active && { backgroundColor: c.lavender }, style, pressed && { backgroundColor: c.pressed, opacity: 0.75 }]}>
    <Icon name={name} size={20} color={active ? c.purple : c.muted} />
  </Pressable>;
}
export function Pill({ label, active, onPress, icon }: { label: string; active?: boolean; onPress?: () => void; icon?: IconName }) {
  return <Pressable accessibilityRole={onPress ? 'button' : 'text'} accessibilityLabel={label} accessibilityState={onPress ? { selected: active } : undefined} onPress={onPress}
    style={({ pressed }) => [s.pill, active && s.pillActive, pressed && { opacity: 0.7 }]}>
    {icon && <Icon name={icon} size={15} color={active ? c.surface : c.muted} />}
    <T style={{ fontSize: 13, fontFamily: f.medium, color: active ? c.surface : c.muted }}>{label}</T>
  </Pressable>;
}
export function Chips({ items, value, onChange }: { items: string[]; value: string; onChange: (v: string) => void }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>{items.map(item => <Pill key={item} label={item} active={item === value} onPress={() => onChange(item)} />)}</ScrollView>;
}
export function Eyebrow({ children, color = c.purple }: { children: React.ReactNode; color?: string }) {
  return <T style={{ fontSize: 11, lineHeight: 16, fontFamily: f.medium, letterSpacing: 0.8, color }}>{children}</T>;
}
export function Badge({ label, color = c.lavender, textColor = c.purple }: { label: string; color?: string; textColor?: string }) {
  if (!label?.trim()) return null;
  return <View style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, backgroundColor: color, borderRadius: 8 }}><T style={{ fontSize: 11, lineHeight: 15, fontFamily: f.medium, color: textColor }}>{label}</T></View>;
}
export function PageHeading({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: string; subtitle?: string; action?: React.ReactNode }) {
  const { width } = useWindowDimensions();
  return <View style={[s.heading, width < 700 && { flexDirection: 'column', alignItems: 'stretch' }]}>
    <View style={{ flex: 1, gap: 10 }}>{eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <T accessibilityRole="header" style={{ fontSize: width < 600 ? 30 : 38, lineHeight: width < 600 ? 38 : 46, fontFamily: f.bold, letterSpacing: -0.4 }}>{title}</T>
      {subtitle ? <T muted style={{ maxWidth: 560, fontSize: 15, lineHeight: 24 }}>{subtitle}</T> : null}
    </View>{action ? <View style={{ alignItems: 'flex-start' }}>{action}</View> : null}
  </View>;
}
export function SectionTitle({ title, subtitle, action, onPress }: { title: string; subtitle?: string; action?: string; onPress?: () => void }) {
  return <View style={[s.row, { justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }]}>
    <View style={{ flex: 1, gap: 6 }}><T accessibilityRole="header" style={{ fontFamily: f.bold, fontSize: 21, lineHeight: 28, letterSpacing: -0.4 }}>{title}</T>{subtitle && <T muted style={{ fontSize: 14, lineHeight: 22 }}>{subtitle}</T>}</View>
    {action && <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [s.row, { minHeight: 44, gap: 5, opacity: pressed ? 0.6 : 1 }]}><T style={{ fontSize: 13, fontFamily: f.medium, color: c.purple }}>{action}</T><Icon name="chevron-right" size={16} color={c.purple} /></Pressable>}
  </View>;
}
export function Search({ value, onChange, placeholder, onSubmit, style }: { value: string; onChange: (v: string) => void; placeholder: string; onSubmit?: () => void; style?: StyleProp<ViewStyle> }) {
  const [focused, setFocused] = React.useState(false);
  return <View style={[s.search, style, focused && { borderColor: c.purple }]}><Icon name="search" size={19} color={c.muted} />
    <TextInput accessibilityLabel={placeholder} placeholder={placeholder} placeholderTextColor={c.muted} value={value} onChangeText={onChange} onSubmitEditing={onSubmit} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} returnKeyType="search" style={s.input} autoCapitalize="none" autoCorrect={false} />
    {value.length > 0 && <Pressable onPress={() => onChange('')} accessibilityLabel="Clear search" accessibilityRole="button" style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Icon name="x" size={16} /></Pressable>}
  </View>;
}
export function Empty({ title, description, icon = 'search', action }: { title: string; description: string; icon?: IconName; action?: React.ReactNode }) {
  return <View style={s.empty}><View style={s.emptyIcon}><Icon name={icon} size={24} color={c.purple} /></View><T accessibilityRole="header" style={{ fontFamily: f.bold, fontSize: 21, lineHeight: 28, textAlign: 'center', letterSpacing: -0.4 }}>{title}</T><T muted style={{ textAlign: 'center', lineHeight: 24, maxWidth: 350 }}>{description}</T>{action ? <View style={{ marginTop: 8 }}>{action}</View> : null}</View>;
}
export function SaveButton({ id, title, style }: { id: string; title: string; style?: StyleProp<ViewStyle> }) {
  const { saved, toggleSave } = useLocal(); const active = saved.includes(id);
  return <IconButton name={active ? 'check' : 'bookmark'} active={active} label={`${active ? 'Unsave' : 'Save'} ${title}`} onPress={() => toggleSave(id)} style={style} />;
}
export function ExternalButton({ url, label, secondary = true }: { url: string; label: string; secondary?: boolean }) {
  const { notify } = useLocal();
  if (!url?.trim()) return null;
  return <Button label={label} secondary={secondary} icon="arrow-up-right" onPress={() => Linking.openURL(url).catch(() => notify('The link could not open. Please try again.'))} />;
}
export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) { return <View style={[s.card, style]}>{children}</View>; }
export function FeedSkeleton({ compact = false }: { compact?: boolean }) {
  return <View accessibilityLabel="Loading recent posts" accessibilityState={{ busy: true }} style={{ flexDirection: 'row', gap: 16 }}>
    {[0, 1].map(item => <Card key={item} style={{ flex: 1 }}><View style={{ height: compact ? 132 : 180, backgroundColor: c.skeleton }} /><View style={{ padding: 20, gap: 12 }}><View style={{ height: 14, width: '65%', borderRadius: 5, backgroundColor: c.skeleton }} /><View style={{ height: 10, width: '90%', borderRadius: 5, backgroundColor: c.skeleton }} /><View style={{ height: 10, width: '45%', borderRadius: 5, backgroundColor: c.skeleton }} /></View></Card>)}
  </View>;
}
export const body: TextStyle = { fontSize: 15, lineHeight: 25, color: c.muted };
export const s = StyleSheet.create({
  text: { fontFamily: f.regular, fontSize: 15, color: c.ink }, row: { flexDirection: 'row', alignItems: 'center' },
  card: { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: radii.card, overflow: 'hidden' },
  button: { minHeight: 48, backgroundColor: c.purple, borderRadius: radii.control, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 20, paddingVertical: 13 },
  secondary: { backgroundColor: c.lavender },
  iconButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
  pill: { minHeight: 44, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface },
  pillActive: { backgroundColor: c.purpleDark, borderColor: c.purpleDark },
  heading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, paddingTop: 4, paddingBottom: 4 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.control, paddingLeft: 16, minHeight: 54 },
  input: { flex: 1, minWidth: 0, minHeight: 52, fontFamily: f.regular, color: c.ink, fontSize: 15, paddingVertical: 14, paddingRight: 12 },
  empty: { paddingHorizontal: 24, paddingVertical: 36, alignItems: 'center', gap: 12 },
  emptyIcon: { backgroundColor: c.lavender, width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
});
