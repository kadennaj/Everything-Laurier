import React from 'react';
import { View } from 'react-native';
import { IntegratedCampusMap } from '../components/IntegratedCampusMap';
export default function MapPage() {
 return <View style={{flex:1,minHeight:0,overflow:'hidden'}}><IntegratedCampusMap /></View>;
}
