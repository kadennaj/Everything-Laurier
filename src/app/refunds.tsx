import React from 'react';
import { LegalPolicy } from '../components/LegalPolicy';
import policy from '../data/refunds-policy.json';
export default function Refunds() { return <LegalPolicy policy={policy} />; }
