import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateProfileAnswers } from '../src/lib/profile-fields.ts';

const answers = { displayName: '  Kaden  N. ', program: '  Computer  Science ', yearLabel: '2nd year', bio: '  Looking for study partners.  ', discoverable: false };

test('a new profile is private and never publishes the account email by default', () => {
  const fields = validateProfileAnswers(answers, 'Student@Example.com');
  assert.equal(fields.display_name, 'Kaden N.');
  assert.equal(fields.program, 'Computer Science');
  assert.equal(fields.contact_email, null);
  assert.equal(fields.is_discoverable, false);
});

test('publishing a profile requires a verified account email', () => {
  assert.throws(() => validateProfileAnswers({ ...answers, discoverable: true }, undefined), /verified email/);
  const fields = validateProfileAnswers({ ...answers, discoverable: true }, 'Student@Example.com');
  assert.equal(fields.contact_email, 'student@example.com');
  assert.equal(fields.is_discoverable, true);
});

test('name and program are required before profile creation', () => {
  assert.throws(() => validateProfileAnswers({ ...answers, displayName: ' ' }, undefined), /name/);
  assert.throws(() => validateProfileAnswers({ ...answers, program: ' ' }, undefined), /program/);
});
