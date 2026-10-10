import assert from 'node:assert/strict';
import test from 'node:test';
import { visibleFeedPosts } from '../src/lib/feed-visibility.ts';

const posts = [
  { id: 'a', source_username: 'rare' }, { id: 'b', source_username: 'pub' },
  { id: 'c', source_username: 'rare' }, { id: 'd', source_username: 'pub' },
];
test('hiding a single post leaves other posts from that venue visible', () => {
  assert.deepEqual(visibleFeedPosts(posts, 'all', [], ['a'], 2).map(p => p.id), ['b', 'c']);
});
test('venue blocks and individual hides apply together before the display limit', () => {
  assert.deepEqual(visibleFeedPosts(posts, 'all', ['rare'], ['b'], 12).map(p => p.id), ['d']);
  assert.deepEqual(visibleFeedPosts(posts, 'rare', ['rare'], [], 3), []);
});
test('restoring post visibility respects venues that are still hidden', () => {
  assert.deepEqual(visibleFeedPosts(posts, 'all', ['rare'], [], 12).map(p => p.id), ['b', 'd']);
  assert.deepEqual(visibleFeedPosts(posts, 'all', [], [], 3).map(p => p.id), ['a', 'b', 'c']);
});
