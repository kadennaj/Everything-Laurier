import React from 'react';
import { Image } from 'react-native';

const logo = require('../../assets/laurier-app-icon.png');

export function BrandLogo({ size = 48, decorative = false }: { size?: number; decorative?: boolean }) {
  return <Image source={logo} resizeMode="contain" accessible={!decorative}
    accessibilityLabel={decorative ? undefined : 'Everything Laurier logo'}
    style={{ width: size, height: size, flexShrink: 0 }} />;
}
