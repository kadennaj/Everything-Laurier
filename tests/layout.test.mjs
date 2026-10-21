import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appLayout, gridItemStyle } from '../src/lib/layout.ts';

test('iPad grids fit after safe areas, sidebar and padding at every supported width', () => {
  for (const width of [320, 375, 507, 744, 768, 820, 834, 1024, 1180, 1194, 1366]) {
    for (const fontScale of [1, 1.5, 2, 3]) {
      const layout = appLayout(width, fontScale, 0, 0);
      const item = gridItemStyle(layout.contentWidth, fontScale);
      const itemWidth = typeof item.width === 'number' ? item.width : layout.contentWidth;
      assert.ok(itemWidth <= layout.contentWidth, `${width}/${fontScale}: no horizontal overflow`);
      assert.ok(itemWidth >= 280 * fontScale || item.width === '100%', 'crowded columns collapse');
    }
  }
});
test('sidebar uses actual available window space and leaves readable columns', () => {
  assert.equal(appLayout(1024).contentWidth, 708);
  assert.equal(gridItemStyle(708).width, 345);
  assert.equal(gridItemStyle(708, 2).width, '100%');
  assert.equal(appLayout(1024, 1, 30, 30).regular, false);
  assert.equal(appLayout(507).regular, false);
  assert.equal(appLayout(1366).regular, true);
});
