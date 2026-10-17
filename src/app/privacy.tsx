import React from 'react';
import {View} from 'react-native';
import {Card,ExternalButton,PageHeading,T,body} from '../components/ui';
import {fonts as f} from '../lib/theme';
import {privacyPolicyUrl} from '../lib/privacy';
import policy from '../data/privacy-policy.json';
export default function Privacy(){return <>
 <PageHeading eyebrow="YOUR INFORMATION" title="Privacy policy." subtitle="Effective October 17, 2026. Accounts, campus location, and private tutor applications."/>
 {policy.sections.map(section=><Card key={section.title} style={{padding:22,gap:16}}><T accessibilityRole="header" style={{fontFamily:f.bold,fontSize:21,lineHeight:29}}>{section.title}</T>{section.paragraphs.map((paragraph,index)=><T key={index} selectable style={body}>{paragraph}</T>)}</Card>)}
 <View style={{gap:12,alignItems:'flex-start'}}><ExternalButton label="Contact privacy support" url="mailto:everythinglaurier@gmail.com"/>{privacyPolicyUrl&&<ExternalButton label="Public policy webpage" url={privacyPolicyUrl}/>}</View>
</>;}
