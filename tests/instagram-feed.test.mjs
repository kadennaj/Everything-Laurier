import assert from 'node:assert/strict';
import test from 'node:test';
import { INSTAGRAM_ACCOUNTS, normalizePost } from '../supabase/functions/sync-instagram-feed/normalize.ts';

const syncedAt = '2026-09-30T15:00:00.000Z';
const sample = {
  ownerUsername: 'RareNightClub',
  url: 'https://www.instagram.com/p/ABC_123/?stkn=tracking',
  caption: 'Tonight at Rare',
  timestamp: '2026-09-30T12:00:00.000Z',
  displayUrl: 'https://scontent.cdninstagram.com/photo.jpg',
  type: 'Image',
};

test('the feed monitors exactly the four requested accounts', () => {
  assert.deepEqual(INSTAGRAM_ACCOUNTS, ['rarenightclub', 'prohibitionwarehouse', 'thepubonking', 'kentuckywaterloo']);
});

test('valid posts keep their author and date while removing tracking parameters', () => {
  assert.deepEqual(normalizePost(sample, syncedAt), {
    id: 'ABC_123',
    source_username: 'rarenightclub',
    post_url: 'https://www.instagram.com/p/ABC_123/',
    caption: 'Tonight at Rare',
    image_url: 'https://scontent.cdninstagram.com/photo.jpg',
    media_type: 'Image',
    posted_at: '2026-09-30T12:00:00.000Z',
    synced_at: syncedAt,
  });
});

test('other authors, unsafe links, and missing dates never enter the public feed', () => {
  assert.equal(normalizePost({ ...sample, ownerUsername: 'anotheraccount' }, syncedAt), null);
  assert.equal(normalizePost({ ...sample, url: 'https://evil.example/p/ABC_123/' }, syncedAt), null);
  assert.equal(normalizePost({ ...sample, timestamp: null }, syncedAt), null);
  assert.equal(normalizePost({ ...sample, url: 'https://www.instagram.com/rarenightclub/' }, syncedAt), null);
});

test('untrusted media URLs are discarded without losing the post', () => {
  const post = normalizePost({ ...sample, displayUrl: 'https://evil.example/track.jpg' }, syncedAt);
  assert.equal(post?.image_url, null);
});
