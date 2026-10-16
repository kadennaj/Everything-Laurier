import React, { useState } from 'react';
import { TextInput, View } from 'react-native';
import { T } from './ui';
import { colors as c,fonts as f } from '../lib/theme';
export function FormField({label,value,onChange,maxLength=120,multiline=false,helper,disabled=false,numeric=false}:{label:string;value:string;onChange:(v:string)=>void;maxLength?:number;multiline?:boolean;helper?:string;disabled?:boolean;numeric?:boolean}) {
 const [focused,setFocused]=useState(false);
 return <View style={{gap:8}}><T style={{fontFamily:f.medium}}>{label}</T>{helper&&<T muted style={{fontSize:12,lineHeight:19}}>{helper}</T>}<TextInput accessibilityLabel={label} value={value} onChangeText={onChange} editable={!disabled} maxLength={maxLength} multiline={multiline} keyboardType={numeric?'decimal-pad':'default'} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} style={{minHeight:multiline?110:50,textAlignVertical:'top',padding:14,borderWidth:1,borderColor:focused?c.purple:c.border,borderRadius:12,backgroundColor:c.background,color:c.ink,fontFamily:f.regular,fontSize:15}} /></View>;
}
