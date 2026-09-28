import React from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { Building, buildings } from '../data/content';
import { colors as c, fonts as f } from '../lib/theme';
import { Icon, T, s } from './ui';

export function CampusMap({ selected, onSelect }: { selected: Building; onSelect: (b: Building) => void }) {
  return <View style={{ backgroundColor: '#EDF0E9', borderRadius: 18, overflow: 'hidden', minHeight: 370, aspectRatio: 1.35 }}>
    <Svg viewBox="0 0 700 500" width="100%" height="100%" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }} accessible={false}>
      <Rect width="700" height="500" fill="#EBEEE6" />
      <Path d="M-10 101 L224 148 L374 102 L710 180 M176 -10 L170 133 L226 319 L140 510 M531 -10 L472 170 L502 339 L510 510" stroke="#DDE0D6" strokeWidth="30" fill="none" />
      <Path d="M-10 101 L224 148 L374 102 L710 180 M176 -10 L170 133 L226 319 L140 510 M531 -10 L472 170 L502 339 L510 510" stroke="#FAFAF4" strokeWidth="23" fill="none" />
      <Path d="M-10 390 L710 288" stroke="#D7DBD1" strokeWidth="48" /><Path d="M-10 390 L710 288" stroke="#FAFAF6" strokeWidth="40" />
      <Path d="M300 -10 L314 138 L345 261 L342 345 L357 510" stroke="#D4DCCB" strokeWidth="8" strokeDasharray="5 7" fill="none" />
      <G fill="#DDD7CA" stroke="#C9C8BC" strokeWidth="1.5"><Rect x="64" y="37" width="90" height="48" rx="7" transform="rotate(12 64 37)" /><Rect x="235" y="35" width="68" height="43" rx="5" /><Rect x="382" y="130" width="59" height="87" rx="7" transform="rotate(-9 382 130)" /><Rect x="380" y="244" width="74" height="41" rx="6" /><Rect x="233" y="224" width="73" height="74" rx="7" /><Rect x="490" y="387" width="70" height="61" rx="5" /><Rect x="70" y="421" width="79" height="35" rx="7" /><Rect x="560" y="40" width="53" height="67" rx="5" /></G>
      <G fill="#D2DDC9">{[[65,250],[97,269],[81,292],[604,222],[622,244],[580,242],[593,268],[401,440],[426,420],[419,456],[62,461],[285,185],[307,202],[619,398],[640,418]].map(([x,y],i)=><Circle key={i} cx={x} cy={y} r={i%2 ? 12 : 15} />)}</G>
      <SvgText x="391" y="329" fill="#8C9385" fontSize="10" letterSpacing="2" transform="rotate(-8 391 329)">UNIVERSITY AVENUE</SvgText>
      <SvgText x="541" y="270" fill="#919887" fontSize="10" letterSpacing="2" transform="rotate(88 541 270)">KING STREET</SvgText>
    </Svg>
    {buildings.map(building => <Pressable key={building.id} onPress={() => onSelect(building)} accessibilityRole="button" accessibilityLabel={`Select ${building.name}`} accessibilityState={{ selected: selected.id === building.id }} style={({ pressed }) => ({ position: 'absolute', left: `${building.x}%`, top: `${building.y}%`, marginLeft: -24, marginTop: -24, alignItems: 'center', justifyContent: 'center', minWidth: 48, minHeight: 48, borderRadius: 16, paddingHorizontal: 9, backgroundColor: selected.id === building.id ? c.purple : '#FFF', borderWidth: 3, borderColor: selected.id === building.id ? '#CABBDC' : '#FFFFFF', boxShadow: '0px 3px 8px rgba(55,50,45,0.12)', opacity: pressed ? 0.7 : 1 })}><T style={{ color: selected.id === building.id ? '#FFF' : c.purple, fontFamily: f.bold, fontSize: 12 }}>{building.id}</T></Pressable>)}
    <View style={[s.row, { position: 'absolute', left: 13, top: 13, padding: 9, borderRadius: 9, gap: 6, backgroundColor: '#FFFFFFEA' }]}><Icon name="map-pin" color={c.green} size={13} /><T style={{ fontSize: 10, color: c.green }}>WATERLOO CAMPUS</T></View>
    <View style={{ position: 'absolute', right: 13, bottom: 13, padding: 7, borderRadius: 7, backgroundColor: '#FFFFFFEA' }}><T style={{ fontSize: 9, color: '#666C60' }}>Illustrated guide · not to scale</T></View>
  </View>;
}
