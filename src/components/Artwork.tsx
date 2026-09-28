import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import { T } from './ui';
import { fonts as f } from '../lib/theme';

export function Artwork({ kind, height = 180 }: { kind: string; height?: number }) {
  const dark = kind === 'vinyl';
  return <View style={{ height, overflow: 'hidden', backgroundColor: dark ? '#382B47' : kind === 'coffee' ? '#ECEEE1' : kind === 'grid' ? '#F4E9D2' : '#E9E3F0' }}>
    <Svg width="100%" height="100%" viewBox="0 0 360 205" preserveAspectRatio="xMidYMid slice" aria-hidden={true}>
      {kind === 'flower' && <><Path d="M-20 190 Q120 55 380 150" stroke="#D9CCE8" strokeWidth="58" fill="none" /><G transform="translate(262 92)">{Array.from({ length: 8 }, (_, i) => <Ellipse key={i} cx="0" cy="-42" rx="19" ry="39" fill={i % 2 ? '#A890BE' : '#86659D'} transform={`rotate(${i * 45})`} />)}<Circle r="24" fill="#F4CE73" /><Circle r="5" fill="#543473" /></G><Circle cx="33" cy="38" r="4" fill="#86659D" /><Path d="M50 130 L54 140 L66 144 L54 148 L50 159 L46 148 L36 144 L46 140Z" fill="#86659D" /></>}
      {kind === 'coffee' && <><Path d="M0 166 Q150 137 360 172 L360 205 L0 205Z" fill="#D8DFCB" /><Ellipse cx="261" cy="168" rx="64" ry="14" fill="#A5B49A" /><Path d="M214 82 L226 158 Q256 177 291 157 L304 82Z" fill="#FAF8EE" /><Ellipse cx="259" cy="82" rx="45" ry="13" fill="#FDFBF5" /><Ellipse cx="259" cy="83" rx="35" ry="8" fill="#754C35" /><Path d="M302 98 Q343 96 324 131 L293 140" fill="none" stroke="#FAF8EE" strokeWidth="13" /><Path d="M247 62 C220 46 261 30 243 15 M271 61 C251 44 285 31 270 16" fill="none" stroke="#9EAC94" strokeWidth="3" strokeLinecap="round" /><Circle cx="61" cy="52" r="22" fill="#DCE3CE" /></>}
      {kind === 'vinyl' && <><Circle cx="265" cy="110" r="109" fill="#241C31" />{[95, 84, 73, 62].map(r => <Circle key={r} cx="265" cy="110" r={r} fill="none" stroke="#51435F" strokeWidth="1" />)}<Circle cx="265" cy="110" r="37" fill="#D7ACEE" /><Circle cx="265" cy="110" r="7" fill="#241C31" /><Path d="M310 14 L342 14 L330 90 L302 124" fill="none" stroke="#F3D282" strokeWidth="5" strokeLinecap="round" /><Circle cx="53" cy="166" r="3" fill="#F3D282" /><Path d="M43 38 L43 60 M32 49 L54 49" stroke="#A083B6" strokeWidth="2" /></>}
      {kind === 'grid' && <>{Array.from({ length: 12 }, (_, i) => <Line key={`v${i}`} x1={i * 32} x2={i * 32} y1="0" y2="205" stroke="#EAD7AF" />)}{Array.from({ length: 8 }, (_, i) => <Line key={`h${i}`} y1={i * 32} y2={i * 32} x1="0" x2="360" stroke="#EAD7AF" />)}<G transform="translate(221 37) rotate(9)"><Rect width="106" height="136" rx="7" fill="#FFFCF3" /><Rect x="9" width="5" height="136" fill="#866A4A" />{[38, 56, 74, 92, 110].map(y => <Line key={y} x1="28" x2="87" y1={y} y2={y} stroke="#DAD2C1" strokeWidth="2" />)}<Path d="M42 12 L54 12 L54 34 L48 29 L42 34Z" fill="#DCA674" /></G></>}
    </Svg>
    <View style={{ position: 'absolute', left: 23, top: 27, gap: 8 }}>
      <T style={{ color: dark ? '#DECDEF' : '#6E537D', fontFamily: f.bold, fontSize: 9, letterSpacing: 2 }}>{kind === 'flower' ? 'MAKE SOMETHING' : kind === 'coffee' ? 'TAKE A MOMENT' : kind === 'vinyl' ? 'TURN IT UP' : 'FIND YOUR FOCUS'}</T>
      <T style={{ color: dark ? '#FAF5FF' : '#3A3340', fontFamily: f.serif, fontSize: 30, lineHeight: 34 }}>{kind === 'flower' ? 'The creative\nsocial.' : kind === 'coffee' ? 'Coffee &\nconnections.' : kind === 'vinyl' ? 'After\nhours.' : 'Study,\ntogether.'}</T>
    </View>
  </View>;
}
