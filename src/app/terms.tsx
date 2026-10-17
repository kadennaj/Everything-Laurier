import React from 'react';
import { LegalPolicy } from '../components/LegalPolicy';
import policy from '../data/terms-policy.json';
export default function Terms() { return <LegalPolicy policy={policy} />; }
