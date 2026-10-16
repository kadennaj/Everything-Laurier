import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { campus, colors, connectedBuildings, indoorConnections } from "./data";
import type { IndoorBuilding, Point, Route, RouteNode, RoomKind, Floor } from "./types";
import { displayFloor, displayNode, displayPoint, floorAtLevel, isSharedBuilding, mapBuildingName, sameIndoorView, sharedLevel, sharedNorthAngle } from "./connected-layout";
import { projectToSegment } from "./routing";
import { headingDifference } from "./live-location";
import type { TrackingMode } from "./live-location";

export interface MapState {
  building: IndoorBuilding | null;
  floor: number;
  stacked: boolean;
  flat: boolean;
  selected: string | null;
  route: Route | null;
  location: { point: Point; accuracy: number } | null;
  heading?: number | null;
  trackingMode?: TrackingMode;
  centerRequest?: number;
  indoorLocation: { buildingId: string; floor: number; point: Point } | null;
  showAmenities: boolean;
  connectedView: boolean;
}
interface Label {
  element: HTMLButtonElement;
  position: THREE.Vector3;
  priority: number;
  leader?: SVGLineElement;
  roadSegments?: { a: Point; b: Point }[];
}
const stairsSvg =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 20h6v-6h6V8h6V3M3 8l5-5m-5 0h5v5"/></svg>';
const liftSvg =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="m8 9 4-4 4 4m-8 6 4 4 4-4"/></svg>';
const doorSvg =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 20V4h12v16M2 20h20M12 12h2"/></svg>';
const washroomSvg =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="7" cy="4" r="2"/><circle cx="17" cy="4" r="2"/><path d="M4 18V9h6v9m4 0 3-9 3 9M6 18v4m2-4v4m8-4v4m2-4v4"/></svg>';
const icons: Partial<Record<RoomKind, string>> = {
  stairs: stairsSvg,
  elevator: liftSvg,
  entrance: doorSvg,
  washroom: washroomSvg,
};
const vec = (p: Point, y = 0) => new THREE.Vector3(p[0], y, p[1]);
const inside = (p: Point, poly: Point[]) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i],
      b = poly[j];
    if (
      a[1] > p[1] !== b[1] > p[1] &&
      p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      c = !c;
  }
  return c;
};

export class MapScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(38, 1, 0.1, 3000);
  private controls: OrbitControls;
  private content = new THREE.Group();
  private labels: Label[] = [];
  private pickables: THREE.Object3D[] = [];
  private state: MapState | null = null;
  private observer: ResizeObserver;
  private frame = 0;
  private disposed = false;
  private animation: {
    start: number;
    duration: number;
    from: THREE.Vector3;
    to: THREE.Vector3;
    targetFrom: THREE.Vector3;
    targetTo: THREE.Vector3;
    after?: () => void;
  } | null = null;
  private labelLayer: HTMLDivElement;
  private northNeedle: HTMLElement | null = null;
  private pointerStart: { x: number; y: number } | null = null;
  private reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  private liveOverlay = new THREE.Group();
  private liveLabel: Label | null = null;
  private liveHalo = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshBasicMaterial({ color: "#007aff", transparent: true, opacity: .12, depthWrite: false, depthTest: false, toneMapped: false }));
  private liveCone: THREE.Mesh;
  constructor(
    private container: HTMLElement,
    private onSelect: (id: string) => void,
    private onBuilding: (id: string) => void,
    private onBrowse: () => void = () => {},
  ) {
    this.northNeedle = container.parentElement?.querySelector<HTMLElement>(".north-needle") ?? null;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor("#eef0e9");
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.92;
    this.renderer.domElement.setAttribute(
      "aria-label",
      "Interactive 3D map. Use the place list for keyboard navigation.",
    );
    this.renderer.domElement.setAttribute("role", "img");
    this.container.append(this.renderer.domElement);
    this.renderer.domElement.tabIndex = 0;
    this.labelLayer = document.createElement("div");
    this.labelLayer.className = "map-labels";
    this.container.append(this.labelLayer);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.maxPolarAngle = Math.PI * 0.46;
    this.controls.minPolarAngle = 0.02;
    this.controls.minDistance = 18;
    this.controls.maxDistance = 1800;
    this.controls.screenSpacePanning = false;
    this.controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
    this.controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
    this.controls.touches.ONE = THREE.TOUCH.PAN;
    this.controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
    this.controls.listenToKeyEvents(this.renderer.domElement);
    this.controls.addEventListener("start", () => {
      this.onBrowse();
      const after = this.animation?.after;
      this.animation = null;
      after?.();
    });
    this.scene.add(new THREE.HemisphereLight("#ffffff", "#b7acbf", 1.6));
    const sun = new THREE.DirectionalLight("#fff5e6", 1.8);
    sun.position.set(-60, 140, 60);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -160;
    sun.shadow.camera.right = 160;
    sun.shadow.camera.top = 160;
    sun.shadow.camera.bottom = -160;
    sun.shadow.camera.far = 400;
    sun.shadow.normalBias = 0.2;
    this.scene.add(sun);
    this.scene.add(this.content);
    const wedge: number[] = [];
    for (let degrees = -35; degrees < 35; degrees += 2) {
      const a = degrees * Math.PI / 180, b = (degrees + 2) * Math.PI / 180;
      wedge.push(0, 0, 0, Math.sin(a) * 8, 0, -Math.cos(a) * 8, Math.sin(b) * 8, 0, -Math.cos(b) * 8);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(wedge, 3));
    this.liveCone = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: "#007aff", transparent: true, opacity: .28, side: THREE.DoubleSide, depthWrite: false, depthTest: false, toneMapped: false }));
    this.liveHalo.rotation.x = -Math.PI / 2;
    this.liveCone.renderOrder = 21;
    this.liveHalo.renderOrder = 20;
    this.liveOverlay.add(this.liveHalo, this.liveCone);
    this.liveOverlay.visible = false;
    this.scene.add(this.liveOverlay);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(container);
    this.renderer.domElement.addEventListener("pointerdown", this.pointerDown);
    this.renderer.domElement.addEventListener("pointerup", this.pointerUp);
    this.resize();
    this.camera.position.set(80, 155, 160);
    this.controls.target.set(-15, 0, -10);
    this.controls.update();
    this.tick();
  }
  private resize() {
    const { width, height } = this.container.getBoundingClientRect();
    const previous = this.camera.aspect;
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    if (this.state && Math.abs(previous - this.camera.aspect) > 0.05)
      this.reset();
  }
  private pointerDown = (e: PointerEvent) => {
    this.pointerStart = { x: e.clientX, y: e.clientY };
  };
  private pointerUp = (e: PointerEvent) => {
    if (
      !this.pointerStart ||
      Math.hypot(
        e.clientX - this.pointerStart.x,
        e.clientY - this.pointerStart.y,
      ) > 6
    )
      return;
    const r = this.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      (-(e.clientY - r.top) / r.height) * 2 + 1,
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(mouse, this.camera);
    const hit = ray.intersectObjects(this.pickables)[0];
    if (hit) {
      const id = hit.object.userData.id as string;
      if (this.state?.building) this.onSelect(id);
      else this.enterBuilding(id);
    }
  };
  enterBuilding(id: string) {
    const place = campus.places.find((p) => p.id === id || p.indoorId === id);
    if (!place) return;
    if (!place.indoor) {
      this.onBuilding(id);
      return;
    }
    const target = vec(place.center, 2);
    this.fly(
      target.clone().add(new THREE.Vector3(16, 25, 30)),
      target,
      400,
      () => this.onBuilding(place.indoorId ?? id),
    );
  }
  private fly(
    to: THREE.Vector3,
    target: THREE.Vector3,
    duration = 350,
    after?: () => void,
  ) {
    if (this.reducedMotion.matches) {
      this.camera.position.copy(to);
      this.controls.target.copy(target);
      this.controls.update();
      after?.();
      return;
    }
    this.animation = {
      start: performance.now(),
      duration,
      from: this.camera.position.clone(),
      to,
      targetFrom: this.controls.target.clone(),
      targetTo: target,
      after,
    };
  }
  private clear() {
    this.content.traverse((o) => {
      if (
        o instanceof THREE.Mesh ||
        o instanceof THREE.LineSegments ||
        o instanceof THREE.Line
      ) {
        o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => m.dispose());
      }
    });
    this.content.clear();
    this.labelLayer.replaceChildren();
    this.labels = [];
    this.liveLabel = null;
    this.pickables = [];
  }
  private material(color: string, opacity = 1) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: 0.88,
      metalness: 0,
      transparent: opacity < 1,
      opacity,
    });
  }
  private polygon(
    points: Point[],
    height: number,
    color: string,
    y = 0,
    holes: Point[][] = [],
    opacity = 1,
  ): THREE.Mesh<THREE.ExtrudeGeometry, THREE.Material> {
    const shape = new THREE.Shape(
      points.map(([x, z]) => new THREE.Vector2(x, -z)),
    );
    holes.forEach((h) =>
      shape.holes.push(
        new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, -z))),
      ),
    );
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: height,
      bevelEnabled: false,
    });
    geometry.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geometry, this.material(color, opacity));
    mesh.position.y = y;
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    this.content.add(mesh);
    return mesh;
  }
  private segment(
    a: Point,
    b: Point,
    width: number,
    height: number,
    color: string,
    y = 0,
    opacity = 1,
  ) {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length < 0.005) return;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(length, height, width),
      this.material(color, opacity),
    );
    mesh.position.set((a[0] + b[0]) / 2, y + height / 2, (a[1] + b[1]) / 2);
    mesh.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]);
    mesh.receiveShadow = true;
    mesh.castShadow = height > 0.4;
    this.content.add(mesh);
  }
  private path(
    points: Point[],
    width: number,
    color: string,
    y = 0,
    opacity = 1,
  ) {
    for (let i = 1; i < points.length; i++)
      this.segment(points[i - 1], points[i], width, 0.08, color, y, opacity);
  }
  private label(
    text: string,
    point: Point,
    y: number,
    className: string,
    id?: string,
    icon?: string,
    priority = 0,
  ) {
    const element = document.createElement("button");
    element.type = "button";
    element.className = `scene-label ${className}`;
    element.title = text;
    if (icon) {
      const span = document.createElement("span");
      span.innerHTML = icon;
      element.append(span);
      element.setAttribute("aria-label", text);
    }
    const span = document.createElement("span");
    span.textContent = text;
    element.append(span);
    if (id)
      element.addEventListener("click", () => {
        if (this.state?.building) this.onSelect(id);
        else this.enterBuilding(id);
      });
    else element.tabIndex = -1;
    let leader: SVGLineElement | undefined;
    if (className.includes("route-building-label")) {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.classList.add("label-leader");
      svg.setAttribute("aria-hidden", "true");
      leader = document.createElementNS("http://www.w3.org/2000/svg", "line");
      leader.setAttribute("stroke", "#7d8877");
      leader.setAttribute("stroke-width", "1.3");
      leader.style.visibility = "hidden";
      svg.append(leader);
      this.labelLayer.append(svg);
    }
    this.labelLayer.append(element);
    const label: Label = { element, position: vec(point, y), priority, leader };
    this.labels.push(label);
    return label;
  }
  update(next: MapState) {
    const old = this.state;
    this.state = next;
    // Sensor updates move a small overlay, not thousands of campus meshes.
    if (old && !old.building && !next.building && old.route === next.route && old.flat === next.flat && old.stacked === next.stacked && old.selected === next.selected && old.showAmenities === next.showAmenities && old.connectedView === next.connectedView) {
      this.updateLiveOverlay(next);
      this.trackCamera(old, next);
      return;
    }
    this.clear();
    const modeChanged = old?.connectedView !== next.connectedView || (next.connectedView ? !sameIndoorView(old?.building?.id, next.building?.id) : old?.building?.id !== next.building?.id);
    if (next.building) this.buildIndoor(next);
    else this.buildCampus(next);
    if (modeChanged || !old) this.reset();
    else if (old.flat !== next.flat || old.stacked !== next.stacked || (next.connectedView && isSharedBuilding(next.building?.id) && sharedLevel(old.building?.id ?? "",old.floor) !== sharedLevel(next.building?.id ?? "",next.floor)))
      this.reset();
    this.updateLiveOverlay(next);
    this.trackCamera(old, next);
  }
  private updateLiveOverlay(s: MapState) {
    const fix = !s.building ? s.location : null;
    this.liveOverlay.visible = !!fix;
    if (!fix) {
      if (this.liveLabel) {
        this.liveLabel.element.remove();
        this.labels = this.labels.filter(label => label !== this.liveLabel);
        this.liveLabel = null;
      }
      return;
    }
    this.liveOverlay.position.copy(vec(fix.point, .65));
    this.liveHalo.scale.setScalar(Math.min(fix.accuracy / 4, 40));
    this.liveCone.visible = s.heading !== null && s.heading !== undefined;
    this.liveCone.rotation.y = -(s.heading ?? 0) * Math.PI / 180;
    if (!this.liveLabel) this.liveLabel = this.label("Your location", fix.point, .72, "blue-location-dot live-gps-dot", undefined, undefined, 10);
    this.liveLabel.position.copy(vec(fix.point, .72));
  }
  private trackCamera(old: MapState | null, next: MapState) {
    if (next.building || !next.location || !next.trackingMode || next.trackingMode === "free") return;
    const requested = old?.centerRequest !== next.centerRequest || !old?.location || old.trackingMode !== next.trackingMode || old.flat !== next.flat;
    if (!requested && (next.trackingMode === "center" || (old?.location === next.location && old?.heading === next.heading))) return;
    const target = vec(next.location.point);
    // A heading fix may arrive while the first GPS recenter is still animating.
    // Preserve the intended zoom/tilt instead of cancelling it at an interim frame.
    const offset = this.animation
      ? this.animation.to.clone().sub(this.animation.targetTo)
      : this.camera.position.clone().sub(this.controls.target);
    if (requested && (!old?.location || old.trackingMode !== next.trackingMode)) {
      if (next.flat) offset.set(0, 90, .1);
      else offset.set(0, 65, 65);
    }
    if (next.trackingMode !== "center") {
      const yaw = Math.atan2(-offset.x, offset.z) * 180 / Math.PI;
      const desired = next.trackingMode === "heading" ? next.heading ?? 0 : 0;
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), -headingDifference(desired, yaw) * Math.PI / 180);
    }
    this.fly(target.clone().add(offset), target, requested ? 300 : 160);
  }
  private buildCampus(s: MapState) {
    this.renderer.setClearColor("#e9ede4");
    const ground = this.polygon(
      [
        [-600, -600],
        [600, -600],
        [600, 600],
        [-600, 600],
      ],
      0.15,
      "#e9ede4",
      -0.3,
    );
    (ground.material as THREE.Material).dispose();
    ground.material = new THREE.MeshBasicMaterial({
      color: "#e9ede4",
      toneMapped: false,
    });
    this.polygon(
      [
        [-78, -22],
        [-34, -55],
        [55, -70],
        [66, 28],
        [0, 50],
        [-63, 29],
      ],
      0.03,
      "#dfe7d4",
      -0.12,
    );
    const parks = (campus as typeof campus & { parks: Point[][] }).parks;
    for (const p of parks ?? []) this.polygon(p, 0.03, "#dce7cc", -0.09);
    for (const road of campus.roads)
      this.path(road.points, road.width + 0.6, "#cfd3ce", -0.02);
    for (const road of campus.roads)
      this.path(road.points, road.width, "#fafaf5", 0.05);
    for (const path of campus.paths) this.path(path, 0.75, "#fffdf5", 0.12);
    for (const building of campus.context)
      this.polygon(building.polygon, building.height, "#e2e0d9");
    for (const p of campus.places) {
      const selected = p.id === s.selected;
      const onRoute = s.route?.nodes.some(n => n.placeId === p.id || n.label === p.name || n.label?.startsWith(`${p.name} ·`)) ?? false;
      const color = selected
        ? "#8460b6"
        : p.indoor
          ? "#b29aca"
          : p.category === "Athletics"
            ? "#bac7b3"
            : p.category === "Food"
              ? "#d0b28f"
              : "#d3cbbb";
      const mesh = this.polygon(p.polygon, p.height, color, 0, p.holes);
      mesh.userData.id = p.id;
      this.pickables.push(mesh);
      if (p.category === "Food" && p.locationBuildingId) continue;
      const outline = new THREE.LineSegments(
        new THREE.EdgesGeometry(mesh.geometry, 25),
        new THREE.LineBasicMaterial({
          color: selected ? "#614285" : "#b4b09e",
          transparent: true,
          opacity: 0.45,
        }),
      );
      outline.position.copy(mesh.position);
      this.content.add(outline);
      if (p.indoor) {
        const ring = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(
            [...p.polygon, p.polygon[0]].map((q) => vec(q, p.height + 0.06)),
          ),
          new THREE.LineBasicMaterial({ color: "#7953a1" }),
        );
        this.content.add(ring);
      }
      const primary =
        [
          "LH",
          "BA",
          "LIB",
          "FNCC",
          "SCI",
          "AC",
          "DH",
          "JAC",
          "AF",
          "P",
          "SC",
          "ARTS-C",
          "DAWB",
          "CONRAD",
          "ARTS-E",
        ].includes(p.id) || selected;
      const campusAnchors: Record<string,Point> = { "ARTS-C": [-50,-18], P: [-82,-15], SC: [-82,16], DAWB: [-38,16] };
      const anchor = campusAnchors[p.id] ?? p.center;
      if (primary && campusAnchors[p.id]) {
        this.content.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([vec(p.center,p.height+.8),vec(anchor,p.height+1)]),new THREE.LineBasicMaterial({color:"#9c83b4"})));
      }
      if (primary)
        this.label(
          p.id === "ARTS-C" ? "Arts Building" : p.id === "ARTS-E" ? "Concourse" : p.id === "JAC" ? "John Aird / Music" : p.id === "DAWB" ? "DAWB" : isSharedBuilding(p.id) ? mapBuildingName(p.id) : p.name,
          anchor,
          p.height + 1,
          `campus-label ${p.indoor ? "has-indoor" : ""} ${selected ? "is-selected" : ""} ${selected || onRoute || ["CONRAD", "ARTS-E"].includes(p.id) ? "route-building-label" : ""}`,
          p.id,
          undefined,
          selected || onRoute ? 7 : isSharedBuilding(p.id) || p.id === "ARTS-C" ? 6 : ["CONRAD", "ARTS-E"].includes(p.id) ? 4 : p.indoor ? 2 : 1,
        );
    }
    if (campus.field) {
      const f = campus.field;
      this.polygon(f, 0.12, "#adbf99", 0.12);
      this.path([...f, f[0]], 0.16, "#fff8df", 0.3);
      const c = vec(campus.places.find((p) => p.id === "AF")!.center, 0.35);
      const circle = new THREE.Mesh(
        new THREE.RingGeometry(2.6, 2.72, 40),
        new THREE.MeshBasicMaterial({
          color: "#fff9df",
          side: THREE.DoubleSide,
        }),
      );
      circle.rotation.x = -Math.PI / 2;
      circle.position.copy(c);
      this.content.add(circle);
    }
    // Decorative landscaping complements the mapped footprints; it is not surveyed tree data.
    const random = (seed: number) => {
      const n = Math.sin(seed * 127.1) * 43758.5453;
      return n - Math.floor(n);
    };
    for (let i = 0; i < 220; i++) {
      const point: Point = [
        random(i + 1) * 143 - 76,
        random(i + 731) * 113 - 64,
      ];
      if (
        campus.places.some((p) => inside(point, p.polygon)) ||
        campus.roads.some((r) =>
          r.points
            .slice(1)
            .some(
              (b, j) =>
                projectToSegment(point, r.points[j], b).distance < r.width,
            ),
        )
      )
        continue;
      if (point[0] > 46 && point[1] > 0) continue;
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.2, 1.1, 5),
        this.material("#b3a58d"),
      );
      trunk.position.copy(vec(point, 0.6));
      this.content.add(trunk);
      const canopy = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1 + (i % 4) * 0.14, 1),
        this.material(["#aabf98", "#b9caa5", "#9eb48d"][i % 3]),
      );
      canopy.position.copy(vec(point, 1.8));
      canopy.castShadow = true;
      this.content.add(canopy);
    }
    const mainStreets = ["University Avenue West", "King Street North", "Bricker Avenue", "Ezra Avenue", "Albert Street", "Hazel Street"];
    const otherStreets = [...new Set(campus.roads.map(road => road.name).filter(name => name && !name.includes("/") && !mainStreets.includes(name)))].sort();
    const streetNames = [...mainStreets, ...otherStreets];
    for (const name of streetNames) {
      // OSM splits a street into several ways. Keep one readable name, choosing
      // an on-road position from the visible segments as the user pans/zooms.
      const segments = campus.roads.filter(road => road.name === name).flatMap(road =>
        road.points.slice(1).map((b, i) => ({ a: road.points[i], b })),
      );
      if (!segments.length) continue;
      const label = this.label(
        name,
        segments[0].a,
        0.3,
        "road-label",
        undefined,
        undefined,
        mainStreets.includes(name) ? 5 : 2,
      );
      label.roadSegments = segments;
    }
    this.drawRoute(s.route, false);
  }
  private buildIndoor(s: MapState) {
    const building = s.building!;
    this.renderer.setClearColor("#eef0eb");
    const ground = this.polygon(
      [
        [-600, -600],
        [600, -600],
        [600, 600],
        [-600, 600],
      ],
      0.2,
      "#eef0eb",
      -0.8,
    );
    (ground.material as THREE.Material).dispose();
    ground.material = new THREE.MeshBasicMaterial({
      color: "#eef0eb",
      toneMapped: false,
    });
    const shared = s.connectedView && isSharedBuilding(building.id);
    const members = shared ? connectedBuildings(building) : [building];
    const level = shared ? sharedLevel(building.id, s.floor) : s.floor;
    for (const member of members) {
      const exact = shared ? floorAtLevel(member, level) : member.floors.find(f => f.level === level);
      const reference = exact ?? floorAtLevel(member, level, true)!;
      const floors = (s.stacked ? member.floors : [reference]).map(f => shared ? displayFloor(member.id, f) : f);
      this.buildWing({ ...s, floor: level }, { ...member, floors }, floors, !s.stacked && !exact);
      {
        const floor = shared ? displayFloor(member.id, reference) : reference;
        const xs = floor.outline.map(p => p[0]), zs = floor.outline.map(p => p[1]);
        const position: Point = member.id === "P" ? [Math.min(...xs)-10,(Math.min(...zs)+Math.max(...zs))/2] : [(Math.min(...xs)+Math.max(...xs))/2, Math.max(...zs)+8];
        const suffix = !exact && !s.stacked ? ` · Floor ${reference.level} ${sharedLevel(member.id,reference.level)>level ? "above" : "below"}` : s.stacked ? "" : ` · Floor ${reference.level}`;
        this.label((member.id === "DAWB" ? "DAWB · Dr. Alvin Woods" : isSharedBuilding(member.id) ? mapBuildingName(member.id) : member.name)+suffix, position, s.stacked ? (level-1)*this.floorSpacing()+2 : 2, `building-scene-label ${!exact && !s.stacked ? "reference" : ""}`, `building:${member.id}`, undefined, 8);
        if (member.id === "ARTS" && reference.level === 1 && !s.stacked) {
          this.label("Concourse", shared ? displayPoint(member.id, [0,-25], 1) : [0,-25], 1.5, "concourse-scene-label", undefined, undefined, 6);
        }
      }
    }
    if (shared) {
      for (const link of indoorConnections.filter(c => c.status === "source-shown")) {
        const from = members.find(b => b.id === link.fromBuilding), to = members.find(b => b.id === link.toBuilding);
        const fromFloor = from?.floors.find(f => f.rooms.some(r => r.id === link.fromRoom));
        const toFloor = to?.floors.find(f => f.rooms.some(r => r.id === link.toRoom));
        if (!fromFloor || !toFloor) continue;
        const linkLevel = sharedLevel(link.fromBuilding, fromFloor.level);
        if (!s.stacked && linkLevel !== level) continue;
        const a = displayPoint(link.fromBuilding, fromFloor.rooms.find(r => r.id === link.fromRoom)!.door, fromFloor.level);
        const b = displayPoint(link.toBuilding, toFloor.rooms.find(r => r.id === link.toRoom)!.door, toFloor.level);
        const y = s.stacked ? (linkLevel-1)*this.floorSpacing()+.68 : .68;
        // Dashed lines communicate a known link, not a traced or measured connecting corridor.
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([vec(a,y),vec(b,y)]), new THREE.LineDashedMaterial({color:"#9c83b4",dashSize:2,gapSize:1.4}));
        line.computeLineDistances();
        this.content.add(line);
        if (!s.stacked || linkLevel === level) this.label(link.id === "arts-peters" ? "Arts 2 ↔ Peters 1" : link.id === "science-bricker" ? "Science ↔ Bricker · Floor 1 portal" : `Peters ${fromFloor.level} ↔ Schlegel ${toFloor.level}`, [(a[0]+b[0])/2,(a[1]+b[1])/2], y+1, "connection-scene-label", undefined, undefined, 7);
      }
    }
    const renderState = { ...s, floor: level, building: { ...building, id: shared ? "connected-complex" : building.id } };
    const location = s.indoorLocation;
    if (location && members.some(b => b.id === location.buildingId) && (s.stacked || (shared ? sharedLevel(location.buildingId,location.floor) : location.floor) === level)) {
      this.blueDot(shared ? displayPoint(location.buildingId, location.point, location.floor) : location.point, this.routeY(shared ? sharedLevel(location.buildingId,location.floor) : location.floor)+.35, s.route ? "Start" : "Starting point · set by you", 2.5);
    }
    if (s.route) {
      const route = { ...s.route, nodes: shared ? s.route.nodes.map(displayNode) : s.route.nodes };
      this.drawRoute(route, true, renderState);
      const first = route.nodes[0], last = route.nodes.at(-1)!;
      if ((shared || first.buildingId === building.id) && (s.stacked || first.floor === level)) this.marker(first.point,this.routeY(first.floor)+.2,"#279476",shared ? 1 : .55);
      if ((shared || last.buildingId === building.id) && (s.stacked || last.floor === level)) this.marker(last.point,this.routeY(last.floor)+.2,"#7643ae",shared ? 1.2 : .65);
    }
  }
  private buildWing(s: MapState, building: IndoorBuilding, floors: Floor[], reference: boolean) {
    for (const floor of floors) {
      const y = s.stacked ? (floor.level - 1) * this.floorSpacing() : 0,
        active = floor.level === s.floor;
      const slab = this.polygon(
        floor.outline,
        0.45,
        active ? "#fffdf8" : "#ece8e1",
        y,
        floor.holes ?? [],
        active ? 1 : 0.3,
      );
      (slab.material as THREE.Material).toneMapped = false;
      const edge = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(
          [...floor.outline, floor.outline[0]].map((p) => vec(p, y + 0.46)),
        ),
        new THREE.LineBasicMaterial({ color: "#c8c2b8" }),
      );
      this.content.add(edge);
      if (reference) continue;
      for (const wall of floor.walls ?? []) {
        for (let i=1;i<wall.length;i++) this.segment(wall[i-1],wall[i],.22,1.05,"#e7e1d6",y+.46);
      }
      for (const hole of floor.holes ?? []) this.path([...hole,hole[0]],.2,"#cbc3b7",y+.55);
      for (const room of floor.rooms) {
        const selected = room.id === s.selected;
        const color = selected ? "#8a58c1" : colors[room.kind];
        const mesh = this.polygon(
          room.polygon,
          0.12,
          color,
          y + 0.46,
          room.holes ?? [],
          active ? 1 : 0.64,
        );
        mesh.userData.id = room.id;
        this.pickables.push(mesh);
        if (room.kind === "stairs") {
          const xs = room.polygon.map((p) => p[0]),
            zs = room.polygon.map((p) => p[1]);
          const x1 = Math.min(...xs) + 0.5,
            x2 = Math.max(...xs) - 0.5,
            z1 = Math.min(...zs) + 0.45,
            z2 = Math.max(...zs) - 0.45;
          for (let i = 0; i < 7; i++) {
            const z = z1 + ((z2 - z1) * i) / 7;
            this.segment(
              [x1, z],
              [x2, z],
              (z2 - z1) / 7,
              0.09,
              "#ddc292",
              y + 0.59 + i * 0.095,
              active ? 1 : 0.55,
            );
          }
        }
        if (room.kind === "elevator") {
          const [x, z] = room.center;
          this.segment(
            [x - 1, z],
            [x + 1, z],
            1.2,
            1.3,
            "#c9dce2",
            y + 0.6,
            active ? 1 : 0.5,
          );
          this.segment(
            [x - 0.04, z + 0.65],
            [x + 0.04, z + 0.65],
            0.04,
            1.25,
            "#7397aa",
            y + 0.6,
            active ? 1 : 0.5,
          );
        }
        if (room.kind === "lecture" && room.id === "LH1001") {
          for (let row = 0; row < 7; row++) {
            const r = 20 + row * 1.2;
            const points: Point[] = [];
            for (let j = 0; j <= 22; j++) {
              const a = -1.04 + (j * 2.08) / 22;
              const p: Point = [-49 + r * Math.cos(a), 1 + r * Math.sin(a)];
              if (inside(p, room.polygon)) points.push(p);
            }
            this.path(
              points,
              0.23,
              "#9a87b3",
              y + 0.61 + row * 0.025,
              active ? 0.8 : 0.4,
            );
          }
        }
        const border = room.polygon;
        const nearest = border.map(
          (a, i) =>
            projectToSegment(room.door, a, border[(i + 1) % border.length])
              .distance,
        );
        const doorEdge = nearest.indexOf(Math.min(...nearest));
        for (let i = 0; !room.open && i < border.length; i++) {
          const a = border[i],
            b = border[(i + 1) % border.length];
          if (i === doorEdge) {
            const proj = projectToSegment(room.door, a, b);
            const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
            const delta = Math.min(0.18, 0.7 / (len || 1));
            const point = (t: number): Point => [
              a[0] + t * (b[0] - a[0]),
              a[1] + t * (b[1] - a[1]),
            ];
            this.segment(
              a,
              point(Math.max(0, proj.t - delta)),
              0.18,
              0.65,
              "#fffcf5",
              y + 0.58,
            );
            this.segment(
              point(Math.min(1, proj.t + delta)),
              b,
              0.18,
              0.65,
              "#fffcf5",
              y + 0.58,
            );
          } else this.segment(a, b, 0.18, 0.65, "#fffcf5", y + 0.58);
        }
        if (!active) continue;
        const amenity = icons[room.kind];
        if (amenity && s.showAmenities)
          this.label(
            room.name,
            room.center,
            y + (room.kind === "elevator" ? 2.1 : 1.4),
            `amenity-label amenity-${room.kind} ${selected ? "is-selected route-building-label" : ""}`,
            room.id,
            amenity,
            selected ? 7 : 3,
          );
        else if (!amenity && (room.name !== "Office" || selected))
          this.label(
            room.name === "Unverified room label" ? "?" : building.id === "LH" && !selected && /^LH \d{4}$/.test(room.name) ? room.name.slice(3) : building.id === "LIB" && !selected && /^[1-7]-/.test(room.name) ? room.name.split(" · ")[0] : room.name,
            room.center,
            y + 1,
            `room-label ${selected ? "is-selected route-building-label" : building.id === "LH" && /^LH \d{4}$/.test(room.name) ? "room-number-label route-building-label" : ""}`,
            room.id,
            undefined,
            selected ? 7 : room.id === "P107" ? 6 : room.kind === "food" ? 5 : building.id === "LH" && /^LH \d{4}$/.test(room.name) ? 2 : 1,
          );
        if (this.labels.at(-1)?.element.classList.contains("room-label")) {
          this.labels.at(-1)!.element.title = room.name;
          this.labels.at(-1)!.element.setAttribute("aria-label", room.name);
        }
      }
      if (active) {
        for (const item of floor.furniture ?? []) {
          const [x,z] = item.point;
          const angle = item.angle ?? 0;
          const dx = Math.cos(angle) * item.width / 2;
          const dz = Math.sin(angle) * item.width / 2;
          const height = item.kind === "shelf" ? 1.35 : item.kind === "bench" ? 0.4 : item.kind === "counter" ? 1 : 0.65;
          const color = item.kind === "shelf" ? "#bdad91" : item.kind === "bench" ? "#aa93c2" : item.kind === "counter" ? "#758779" : "#e0c9a6";
          this.segment([x-dx,z-dz],[x+dx,z+dz],item.depth,height,color,y+0.6);
          if (item.kind === "shelf") {
            this.segment([x-dx,z-dz],[x+dx,z+dz],item.depth+0.08,0.09,"#948674",y+1.91);
          } else if (item.kind === "table" || item.kind === "desk") {
            for (const side of [-1,1]) {
              this.segment([x-dx*.65,z-dz*.65+side*(item.depth/2+.4)], [x+dx*.65,z+dz*.65+side*(item.depth/2+.4)],0.55,0.35,"#879b94",y+0.6);
            }
          }
        }
      }
      if (s.stacked)
        this.label(
          isSharedBuilding(building.id) ? `${building.id} · ${floor.label.split(" · ")[0]}` : floor.label,
          isSharedBuilding(building.id)
            ? [(Math.min(...floor.outline.map(p => p[0]))+Math.max(...floor.outline.map(p => p[0])))/2, Math.min(...floor.outline.map(p => p[1]))+7]
            : [Math.min(...floor.outline.map(p => p[0])) - 7, Math.max(...floor.outline.map(p => p[1])) + 4],
          y + 1,
          `floor-scene-label ${active ? "active" : ""}`,
          undefined,
          undefined,
          5,
        );
    }
  }
  private floorSpacing() { return this.state?.connectedView && isSharedBuilding(this.state?.building?.id) ? 6 : 15; }
  private routeY(floor: number) {
    return this.state?.stacked ? (floor - 1) * this.floorSpacing() + 0.72 : 0.72;
  }
  private blueDot(point: Point, y: number, text: string, radius: number) {
    const halo = new THREE.Mesh(new THREE.CircleGeometry(Math.max(radius,1.6),48), new THREE.MeshBasicMaterial({ color: "#007aff", transparent:true, opacity:0.12, depthWrite:false, toneMapped:false }));
    halo.rotation.x=-Math.PI/2;
    halo.position.copy(vec(point,y-.08));
    this.content.add(halo);
    this.label(text,point,y,"blue-location-dot",undefined,undefined,10);
  }
  private marker(p: Point, y: number, color: string, radius: number) {
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 16, 12),
      this.material(color),
    );
    dot.position.copy(vec(p, y));
    this.content.add(dot);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(radius * 1.4, radius * 1.7, 32),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }),
    );
    ring.position.copy(vec(p, y - radius * 0.4));
    ring.rotation.x = -Math.PI / 2;
    this.content.add(ring);
  }
  private drawRoute(route: Route | null, indoor: boolean, state = this.state!) {
    if (!route) return;
    for (let i = 1; i < route.nodes.length; i++) {
      const a = route.nodes[i - 1],
        b = route.nodes[i];
      if (!indoor && route.edges[i - 1].kind === "indoor") {
        const height = (node: RouteNode) => (campus.places.find(p => p.id === node.placeId)?.height ?? 0) + .5;
        const length = Math.hypot(a.point[0] - b.point[0], a.point[1] - b.point[1]);
        const point = (t: number): Point => [a.point[0] + (b.point[0] - a.point[0]) * t, a.point[1] + (b.point[1] - a.point[1]) * t];
        // Thick dashed overview links stay legible above the campus roofs.
        for (let d = 0; d < length; d += 3) {
          this.path([point(d / length), point(Math.min(d + 1.8, length) / length)], .85, "#367b98", Math.max(height(a), height(b)));
        }
        continue;
      }
      if (indoor && state.building?.id !== "connected-complex" && (a.buildingId !== state.building?.id || b.buildingId !== state.building?.id)) continue;
      if (
        indoor &&
        !state.stacked &&
        (a.floor !== state.floor || b.floor !== state.floor)
      )
        continue;
      if (a.floor === b.floor)
        this.path(
          [a.point, b.point],
          indoor ? state.building?.id === "connected-complex" ? 0.9 : 0.42 : 0.6,
          "#7849b0",
          indoor ? this.routeY(a.floor) : 0.4,
        );
      else if (state.stacked) {
        const points = [
          vec(a.point, this.routeY(a.floor)),
          vec(b.point, this.routeY(b.floor)),
        ];
        this.content.add(
          new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(points),
            new THREE.LineBasicMaterial({
              color:
                route.edges[i - 1].kind === "elevator" ? "#367b98" : "#bf873d",
            }),
          ),
        );
      }
    }
  }
  reset() {
    const indoor = !!this.state?.building,
      flat = this.state?.flat,
      stack = this.state?.stacked;
    const { width, height } = this.container.getBoundingClientRect();
    // Leave room for the existing floor selector and map tools on wider traces.
    const usableAspect = indoor ? Math.max(180, width - (width > 600 ? 145 : 90)) / Math.max(height, 1) : this.camera.aspect;
    const fit = Math.max(1, 1.3 / usableAspect);
    const building = this.state?.building;
    const shared = !!this.state?.connectedView && isSharedBuilding(building?.id);
    const floorCount = building && shared ? Math.max(...connectedBuildings(building).flatMap(b => b.floors.map(f => sharedLevel(b.id,f.level)))) : building?.floors.length ?? 3;
    const points = building ? (shared ? connectedBuildings(building) : [building]).flatMap(b => (stack ? b.floors : [shared ? floorAtLevel(b,sharedLevel(building.id,this.state!.floor),true)! : b.floors.find(f => f.level === this.state!.floor)!]).flatMap(f => shared ? displayFloor(b.id,f).outline : f.outline)) : [];
    const bounds = points.length ? new THREE.Box3().setFromPoints(points.map(p => vec(p))) : null;
    const center = bounds?.getCenter(new THREE.Vector3()) ?? new THREE.Vector3();
    const size = bounds?.getSize(new THREE.Vector3()) ?? new THREE.Vector3(110,0,70);
    const scale = Math.max(1, size.x/110, size.z/80);
    const target = indoor
      ? new THREE.Vector3(center.x + size.x * (width > 600 ? .08 : .06), stack ? (floorCount-1)*this.floorSpacing()/2 : 0, center.z - (building && shared ? size.z*.08 : 0))
      : new THREE.Vector3(-15, 0, -10);
    const offset = indoor
      ? flat
        ? new THREE.Vector3(0, 160, 0.1)
        : new THREE.Vector3(18, 110 + (stack ? floorCount*this.floorSpacing() : 0), 123 + (stack ? 30 : 0))
      : flat
        ? new THREE.Vector3(0, 240, 0.1)
        : new THREE.Vector3(55, 150, 150);
    if (building && shared) {
      // Reserve space for building-name badges beyond the floor outlines.
      size.x += 24; size.z += 16;
      const tangent = Math.tan(THREE.MathUtils.degToRad(this.camera.fov/2));
      const availableWidth = Math.max(width*.65,width-(width <= 650 ? 90 : 145));
      const availableHeight = Math.max(height*.55,height-280);
      const stackHeight = stack ? (floorCount-1)*this.floorSpacing() : 0;
      const distance = Math.max(size.x/(2*tangent*this.camera.aspect*availableWidth/width), (size.z*(flat ? 1 : .78)+stackHeight)/(2*tangent*availableHeight/height))*1.08;
      offset.set(flat ? 0 : .06,flat ? 1 : .78,flat ? .001 : .62).normalize().multiplyScalar(distance);
    } else offset.multiplyScalar(fit * (indoor ? scale : 1));
    this.fly(target.clone().add(offset), target, 350);
    this.controls.enableRotate = !flat;
  }
  zoom(amount: number) {
    const target = this.controls.target.clone();
    const offset = this.camera.position
      .clone()
      .sub(target)
      .multiplyScalar(amount);
    offset.clampLength(18, 1800);
    this.fly(target.clone().add(offset), target, 180);
  }
  rotate() {
    const target = this.controls.target.clone();
    const offset = this.camera.position
      .clone()
      .sub(target)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 6);
    this.fly(target.clone().add(offset), target, 240);
  }
  locate(point: Point) {
    const target = vec(this.state?.building && this.state.connectedView && isSharedBuilding(this.state.building.id) ? displayPoint(this.state.building.id,point,this.state.floor) : point);
    this.fly(target.clone().add(new THREE.Vector3(20, 65, 65)), target, 300);
  }
  private tick = () => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.tick);
    if (this.animation) {
      const a = this.animation;
      const t = Math.min(1, (performance.now() - a.start) / a.duration);
      const k = 1 - Math.pow(1 - t, 3);
      this.camera.position.lerpVectors(a.from, a.to, k);
      this.controls.target.lerpVectors(a.targetFrom, a.targetTo, k);
      if (t === 1) {
        this.animation = null;
        a.after?.();
      }
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    if (this.northNeedle) {
      const angle=(this.state?.connectedView && isSharedBuilding(this.state?.building?.id) ? sharedNorthAngle : this.state?.building?.northAngle ?? 0)*Math.PI/180;
      const origin=this.controls.target.clone().project(this.camera);
      const north=this.controls.target.clone().add(new THREE.Vector3(Math.sin(angle)*10,0,-Math.cos(angle)*10)).project(this.camera);
      const heading=Math.atan2((north.x-origin.x)*this.camera.aspect,north.y-origin.y)*180/Math.PI;
      this.northNeedle.style.transform=`rotate(${heading}deg)`;
    }
    const { width, height } = this.container.getBoundingClientRect();
    const containerRect=this.container.getBoundingClientRect();
    const occupied: { x: number; y: number; w: number; h: number }[] = [...this.container.parentElement!.querySelectorAll<HTMLElement>(".map-top,.floor-controls,.map-tools,.map-bottom,.indoor-caption,.live-tracking")].map(el=>{
      const r=el.getBoundingClientRect();return {x:r.left-containerRect.left+r.width/2,y:r.top-containerRect.top+r.height/2,w:r.width,h:r.height};
    });
    for (const label of [...this.labels].sort(
      (a, b) => b.priority - a.priority,
    )) {
      if (label.roadSegments) {
        const textWidth = label.element.offsetWidth || 100, textHeight = label.element.offsetHeight || 16;
        const candidates = label.roadSegments.map(({a,b}) => {
          const start = vec(a, .3).project(this.camera), end = vec(b, .3).project(this.camera);
          const point = vec([(a[0]+b[0])/2, (a[1]+b[1])/2], .3).project(this.camera);
          let angle = Math.atan2(-(end.y-start.y)*height, (end.x-start.x)*width);
          // Keep text upright while following the street's projected direction.
          if (angle > Math.PI/2) angle -= Math.PI;
          if (angle < -Math.PI/2) angle += Math.PI;
          const w = Math.abs(Math.cos(angle))*textWidth + Math.abs(Math.sin(angle))*textHeight;
          const h = Math.abs(Math.sin(angle))*textWidth + Math.abs(Math.cos(angle))*textHeight;
          return { x:(point.x+1)/2*width, y:(1-point.y)/2*height, z:point.z, angle, w, h };
        }).filter(p => p.z > -1 && p.z < 1 && p.x > p.w/2+8 && p.x < width-p.w/2-8 && p.y > p.h/2+8 && p.y < height-p.h/2-8)
          .sort((a,b) => Math.hypot(a.x-width/2,a.y-height/2)-Math.hypot(b.x-width/2,b.y-height/2));
        const anchor = candidates.find(p => !occupied.some(r => Math.abs(p.x-r.x) < (p.w+r.w)/2+4 && Math.abs(p.y-r.y) < (p.h+r.h)/2+4));
        label.element.style.visibility = anchor ? "visible" : "hidden";
        if (anchor) {
          occupied.push(anchor);
          label.element.style.transform = `translate(${anchor.x}px,${anchor.y}px) translate(-50%,-50%) rotate(${anchor.angle}rad)`;
        }
        continue;
      }
      const point = label.position.clone().project(this.camera);
      let x = ((point.x + 1) / 2) * width,
        y = ((1 - point.y) / 2) * height;
      const anchorX = x, anchorY = y;
      let visible =
        point.z < 1 &&
        point.z > -1 &&
        x > 8 &&
        x < width - 8 &&
        y > 8 &&
        y < height - 8;
      const w = label.element.offsetWidth || 70,
        h = label.element.offsetHeight || 22;
      if (visible && (label.element.classList.contains("building-scene-label") || label.element.classList.contains("route-building-label"))) {
        x=Math.max(w/2+8,Math.min(width-w/2-8,x));
        const overlaps=(cx:number,cy:number)=>occupied.some(r=>Math.abs(cx-r.x)<(w+r.w)/2+5&&Math.abs(cy-r.y)<(h+r.h)/2+5);
        if(overlaps(x,y)) {
          const candidates=occupied.flatMap(r=>[[r.x-(r.w+w)/2-8,y],[r.x+(r.w+w)/2+8,y],[x,r.y-(r.h+h)/2-8],[x,r.y+(r.h+h)/2+8]]);
          const nearest=candidates.filter(([cx,cy])=>cx>w/2+8&&cx<width-w/2-8&&cy>h/2+8&&cy<height-h/2-8&&!overlaps(cx,cy)).sort((a,b)=>Math.hypot(a[0]-x,a[1]-y)-Math.hypot(b[0]-x,b[1]-y))[0];
          if(nearest) [x,y]=nearest;
        }
      }
      if (
        label.priority < 8 &&
        occupied.some(
          (r) =>
            Math.abs(x - r.x) < (w + r.w) / 2 + 3 &&
            Math.abs(y - r.y) < (h + r.h) / 2 + 3,
        )
      )
        visible = false;
      if (visible) occupied.push({ x, y, w, h });
      if (label.leader) {
        label.leader.style.visibility = visible && Math.hypot(x - anchorX, y - anchorY) > 5 ? "visible" : "hidden";
        label.leader.setAttribute("x1", String(anchorX));
        label.leader.setAttribute("y1", String(anchorY));
        label.leader.setAttribute("x2", String(x));
        label.leader.setAttribute("y2", String(y));
      }
      label.element.style.visibility = visible ? "visible" : "hidden";
      label.element.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`;
    }
  };
  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    this.controls.dispose();
    this.clear();
    for (const mesh of [this.liveHalo, this.liveCone]) { mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); }
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.labelLayer.remove();
  }
}
