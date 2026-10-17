import React from 'react';
import { LegalPolicy } from '../components/LegalPolicy';
import policy from '../data/cookies-policy.json';
export default function Cookies() { return <LegalPolicy policy={policy} />; }
