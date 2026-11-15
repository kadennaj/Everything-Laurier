// Keep hit-testing separate from OrbitControls: a completed pinch, drag or
// cancelled touch is never a building tap, even if the finger returns to start.
export class MapGesture {
  private pointers = new Map<number, { x: number; y: number }>();
  private blocked = false;
  down(id: number, x: number, y: number) {
    if (!this.pointers.size) this.blocked = false;
    this.pointers.set(id, { x, y });
    if (this.pointers.size > 1) this.blocked = true;
  }
  move(id: number, x: number, y: number) {
    const start = this.pointers.get(id);
    if (start && Math.hypot(x - start.x, y - start.y) > 6) this.blocked = true;
  }
  up(id: number, x: number, y: number) {
    const known = this.pointers.has(id);
    this.move(id, x, y);
    this.pointers.delete(id);
    return known && !this.blocked && this.pointers.size === 0;
  }
  cancel(id: number) {
    this.blocked = true;
    this.pointers.delete(id);
  }
}
