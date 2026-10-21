import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  BookOpen,
  Check,
  Clock3,
  ChevronRight,
  Copy,
  Compass,
  DoorOpen,
  ExternalLink,
  Footprints,
  GraduationCap,
  Info,
  Layers,
  LocateFixed,
  MapPin,
  Maximize,
  Navigation,
  Plus,
  Minus,
  RotateCw,
  Search,
  SlidersHorizontal,
  SquareStack,
  Utensils,
  X,
  Accessibility,
  Building2,
  MoveUp,
  MoveDown,
  ScanLine,
} from "lucide-react";
import { campus, colors, connectedBuildings, geoToPoint, indoorConnections, indoorForPlace, indoors, kindNames } from "./data";
import { floorAtLevel, isSharedBuilding, levelCaption, sharedLevel } from "./connected-layout";
import { FloorPlanImage } from "./FloorPlanImage";
import { MapScene } from "./MapScene";
import { routeJourney } from "./journey-routing";
import { useFloorEstimate } from "./use-floor-estimate";
import { YOUR_LOCATION } from "./campus-directions";
import campusIndoorNetwork from "./data/campus-indoor-links.json";
import type { MapState } from "./MapScene";
import { useLiveLocation } from "./use-live-location";
import type { IndoorBuilding, Room, Route, RouteNode } from "./types";

function entranceOf(building: IndoorBuilding | null) {
  return building?.floors.flatMap(f => f.rooms).find(r => r.kind === "entrance" && r.routeable !== false)?.id ?? "";
}
function readView() {
  const p = new URLSearchParams(location.protocol === 'about:' ? window.__EL_VIEW__ : location.hash.slice(1));
  const building = indoors.find((b) => b.id === p.get("building")) ?? null;
  const requested = Number(p.get("floor"));
  const floor = building?.floors.some((f) => f.level === requested)
    ? requested
    : (building?.defaultFloor ?? 1);
  const room = p.get("room");
  const place = !building ? campus.places.find(candidate => candidate.id === p.get("place")) : null;
  return {
    building,
    floor,
    connectedView: p.get("view") !== "individual",
    selected: building?.floors
      .filter(f => f.level === floor).flatMap((f) => f.rooms)
      .some((r) => r.id === room)
      ? room
      : (place?.id ?? null),
  };
}
const categories = [
  "All places",
  "Academic",
  "Student life",
  "Food",
  "Athletics",
  "Residence",
];
function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}
function travelTimeLabel(seconds?: number) {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return "Time unavailable";
  return `About ${Math.max(1, Math.ceil(seconds / 60))} min`;
}
function travelMode(route: Route) {
  if (route.hasUnmeasuredAccess) return "Indoor + campus walk";
  if (route.indoorOverview) return route.outdoorDistanceMeters ? "Indoor + outdoor walk" : "Indoor walk";
  return route.edges.some(e => e.kind === "elevator") ? "Walk + elevator"
    : route.edges.some(e => e.kind === "stairs") ? "Walk + stairs" : "Walking";
}

function connectorName(node: RouteNode) {
  return node.kind === "elevator" ? "Take the elevator" : "Take the stairs";
}
function routeSteps(
  route: Route,
): { text: string; floor: number; kind: string; buildingId?: string }[] {
  const first = route.nodes[0],
    last = route.nodes.at(-1)!;
  const steps: { text: string; floor: number; kind: string; buildingId?: string }[] = [
    {
      text: `Start at ${first.label ?? "the selected campus path"}`,
      floor: first.floor,
      kind: "start",
      buildingId: first.buildingId,
    },
  ];
  for (let i = 0; i < route.edges.length; i++) {
    const e = route.edges[i];
    if (e.instruction) {
      const target = e.kind === "transfer" ? route.nodes[i+1] : undefined;
      steps.push({ text: e.instruction, floor: target?.floor ?? 0, kind: e.kind, buildingId: target?.buildingId });
    } else if (e.kind === "connection") {
      const destination = route.nodes[i+1];
      const name = indoors.find(b => b.id === destination.buildingId)?.name ?? "the connected building";
      steps.push({ text: `Follow the indoor link into ${name} · Floor ${destination.floor}`, floor: destination.floor, kind: e.kind, buildingId: destination.buildingId });
    } else if (e.kind !== "walk") {
      const start = route.nodes[i];
      while (route.edges[i + 1]?.kind === e.kind) i++;
      const to = route.nodes[i + 1];
      steps.push({
        text: start.buildingId ? `${connectorName(start)} to Floor ${to.floor}` : "Use the outdoor steps along the highlighted path",
        floor: to.floor,
        kind: e.kind,
        buildingId: to.buildingId,
      });
    }
  }
  steps.push({
    text: route.edges.at(-1)?.kind === "indoor" ? `Arrive at ${last.label ?? "your destination"}` : `Follow the highlighted ${last.buildingId ? "corridor" : "walking path"} to ${last.label ?? "the destination path"}`,
    floor: last.floor,
    kind: "walk",
    buildingId: last.buildingId,
  });
  return steps;
}

export default function App() {
  const initial = useMemo(readView, []);
  const [building, setBuilding] = useState<IndoorBuilding | null>(
      initial.building,
    ),
    [floor, setFloor] = useState(initial.floor),
    [selected, setSelected] = useState<string | null>(initial.selected);
  const [connectedView, setConnectedView] = useState(initial.connectedView);
  const [roomBuildingId, setRoomBuildingId] = useState(initial.building?.id ?? "BA");
  const [campusRoutePreference, setCampusRoutePreference] = useState<"fastest" | "indoors">("fastest");
  const [routeFiltersOpen, setRouteFiltersOpen] = useState(false);
  const [indoorLocationId, setIndoorLocationId] = useState("");
  const [locationPicker, setLocationPicker] = useState(false);
  const [locationBuilding, setLocationBuilding] = useState(initial.building?.id ?? "LIB");
  const [locationFloor, setLocationFloor] = useState(initial.floor);
  const [locationRoom, setLocationRoom] = useState("");
  const [floorHeight, setFloorHeight] = useState(3.5);
  const floorEstimate = useFloorEstimate();
  const confirmedAt = useRef(0);
  const [stacked, setStacked] = useState(false),
    [flat, setFlat] = useState(false),
    [showAmenities, setShowAmenities] = useState(true);
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState("All places"),
    [directions, setDirections] = useState(false),
    [stepFree, setStepFree] = useState(false);
  const [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [route, setRoute] = useState<Route | null>(null),
    [routeError, setRouteError] = useState("");
  const [indoorLocation, setIndoorLocation] = useState<MapState["indoorLocation"]>(null);
  const [locationStatus, setLocationStatus] = useState(""),
    [toast, setToast] = useState(""),
    [info, setInfo] = useState(false),
    [blueprint, setBlueprint] = useState(false),
    [webglError, setWebglError] = useState(false);
  const liveLocation = useLiveLocation(!building);
  const locationLoading = liveLocation.loading;
  const locationValue = useMemo(() => {
    if (!liveLocation.fix) return null;
    const point = geoToPoint(liveLocation.fix.latitude, liveLocation.fix.longitude);
    return Math.hypot(...point) <= 175 ? { point, accuracy: liveLocation.fix.accuracy } : null;
  }, [liveLocation.fix]);
  const outsideCampus = !!liveLocation.fix && !locationValue;
  const displayedLocationStatus = locationStatus || (!building ? outsideCampus ? "Your GPS is outside this campus map. Choose a campus place for directions." : liveLocation.message : "");
  const hasRoute = !!route;
  const latestRouteFix = useRef<{ point: [number, number]; timestamp: number } | null>(null);
  const container = useRef<HTMLDivElement>(null),
    scene = useRef<MapScene | null>(null),
    pending = useRef<{ building: string; room: string } | null>(null);
  const callbackRef = useRef<(id: string) => void>(() => {}),
    selectRef = useRef<(id: string) => void>(() => {}),
    browseRef = useRef(() => {});
  browseRef.current = liveLocation.browse;
  const allRooms =
    building?.floors.flatMap((f) =>
      f.rooms.map((room) => ({ ...room, floor: f.level })),
    ) ?? [];
  const directionBuildings = building ? connectedBuildings(building) : [];
  const mappedRooms = indoors.flatMap(b => b.floors.flatMap(f => f.rooms.map(r => ({...r,floor:f.level,buildingId:b.id}))));
  const confirmedRoom = mappedRooms.find(r => r.id === indoorLocationId);
  const pickerBuilding = indoors.find(b => b.id === locationBuilding)!;
  const currentFloor = building?.floors.find((f) => f.level === floor);
  const sharedView = connectedView && isSharedBuilding(building?.id);
  const currentLevel = building ? sharedLevel(building.id, floor) : floor;
  const visibleCaption = sharedView ? levelCaption(directionBuildings, currentLevel) : currentFloor?.label;
  const selectedRoom = allRooms.find((r) => r.id === selected),
    selectedPlace = campus.places.find((p) => p.id === selected);
  const defaultEntrance =
    entranceOf(building);
  const openBuilding = useCallback((id: string) => {
    const food = campus.places.find(p => p.id === id && p.locationBuildingId);
    if (food && !food.locationRoomId) {
      setSelected(id);
      setSearch("");
      setDirections(false);
      setRoute(null);
      const parent = campus.places.find(p => p.id === food.locationBuildingId);
      if (parent) scene.current?.locate(parent.center);
      return;
    }
    const indoor = indoorForPlace(food?.locationBuildingId ?? id);
    if (!indoor) {
      setSelected(id);
      setDirections(false);
      setRoute(null);
      return;
    }
    const roomId =
      food?.locationRoomId ?? (pending.current?.building === id || pending.current?.building === indoor.id ? pending.current.room : null);
    pending.current = null;
    const level =
      indoor.floors.find((f) => f.rooms.some((r) => r.id === roomId))?.level ??
      (indoor.defaultFloor ?? 1);
    setLocationStatus("");
    setBuilding(indoor);
    setRoomBuildingId(indoor.id);
    setFloor(level);
    setSelected(roomId);
    setSearch("");
    setDirections(false);
    setRoute(null);
    setFrom(
      indoorLocationId ? YOUR_LOCATION : entranceOf(indoor),
    );
    setTo(roomId ?? "");
    setStacked(false);
    setBlueprint(false);
  }, [indoorLocationId]);
  callbackRef.current = openBuilding;
  selectRef.current = (id: string) => {
    if (id.startsWith("building:")) {
      enter(id.slice(9));
      return;
    }
    if (!building && campus.places.some(p => p.id === id && p.locationBuildingId)) {
      openBuilding(id);
      return;
    }
    setSelected(id);
    if (building) {
      const owner = directionBuildings.find(b => b.floors.some(f => f.rooms.some(r => r.id === id)));
      const level = owner?.floors.find(f => f.rooms.some(r => r.id === id))?.level;
      if (owner) setBuilding(owner);
      if (level !== undefined) setFloor(level);
      setTo(id);
    } else setTo(id);
  };
  useEffect(() => {
    if (!container.current) return;
    try {
      scene.current = new MapScene(
        container.current,
        (id) => selectRef.current(id),
        (id) => callbackRef.current(id),
        () => browseRef.current(),
      );
    } catch (error) {
      console.error(error);
      setWebglError(true);
    }
    return () => {
      scene.current?.dispose();
      scene.current = null;
    };
  }, []);
  useEffect(() => {
    scene.current?.update({
      building,
      floor,
      stacked,
      flat,
      selected: !building ? selectedPlace?.locationBuildingId ?? selected : selected,
      route,
      location: locationValue,
      heading: liveLocation.compass?.degrees ?? null,
      trackingMode: building ? "free" : liveLocation.mode,
      centerRequest: liveLocation.centerRequest,
      indoorLocation,
      showAmenities,
      connectedView,
    });
  }, [
    building,
    floor,
    stacked,
    flat,
    selected,
    selectedPlace?.locationBuildingId,
    route,
    locationValue,
    liveLocation.compass?.degrees,
    liveLocation.mode,
    liveLocation.centerRequest,
    indoorLocation,
    showAmenities,
    connectedView,
  ]);
  useEffect(() => {
    if (building || indoorLocationId || !directions || !hasRoute || !locationValue || locationValue.accuracy > 50 || (from !== YOUR_LOCATION && to !== YOUR_LOCATION)) return;
    const previous = latestRouteFix.current;
    if (previous && Math.hypot(previous.point[0] - locationValue.point[0], previous.point[1] - locationValue.point[1]) * 4 < Math.max(5, Math.min(locationValue.accuracy, 15))) return;
    // Use a movement threshold rather than debouncing fixes: a continuous GPS
    // stream must not keep postponing the recalculation timer indefinitely.
    const next = routeJourney(campus,campusIndoorNetwork,indoors,indoorConnections,from,to,locationValue.point,stepFree,campusRoutePreference === "indoors");
    latestRouteFix.current = { point: locationValue.point, timestamp: Date.now() };
    if (next) { setRoute(next); setRouteError(""); }
    else setRouteError("Your live location could not be connected to this route. Choose a mapped starting place.");
  }, [building, indoorLocationId, directions, hasRoute, locationValue, from, to, stepFree, campusRoutePreference]);
  useEffect(() => {
    const scroll = document.querySelector<HTMLElement>(".sidebar-scroll");
    if (scroll) scroll.scrollTop = 0;
  }, [building, floor]);
  useEffect(() => {
    if (!route) return;
    const panel = document.querySelector<HTMLElement>(".sidebar-scroll");
    const result = panel?.querySelector<HTMLElement>(".route-result");
    if (!panel || !result) return;
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth";
    if (window.matchMedia("(max-width: 760px)").matches) {
      result.scrollIntoView({ block: "start", behavior });
      return;
    }
    panel.scrollTo({
      top: panel.scrollTop + result.getBoundingClientRect().top - panel.getBoundingClientRect().top - 16,
      behavior,
    });
  }, [route]);
  useEffect(() => {
    const p = new URLSearchParams();
    if (building) {
      p.set("building", building.id);
      p.set("floor", String(floor));
      if (!connectedView) p.set("view", "individual");
      if (selectedRoom?.floor === floor) p.set("room", selectedRoom.id);
    } else if (selectedPlace) {
      p.set("place", selectedPlace.id);
    }
    window.__EL_VIEW__=p.toString();
    if(location.protocol!=='about:') history.replaceState(null, "", p.size ? `#${p}` : location.pathname);
    const message={type:'map-view',params:p.toString()};
    if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(message));
    else if(window.parent!==window)window.parent.postMessage(message,location.origin);
  }, [building, floor, selectedRoom, selectedPlace, connectedView]);
  useEffect(() => {
    const changed = () => {
      const view = readView();
      setLocationStatus("");
      setBuilding(view.building);
      if (view.building) setRoomBuildingId(view.building.id);
      setConnectedView(view.connectedView);
      setFloor(view.floor);
      setSelected(view.selected);
      setRoute(null);
      setDirections(false);
      setFrom(
        entranceOf(view.building),
      );
      setTo(view.selected ?? "");
    };
    window.addEventListener("hashchange", changed);
    return () => window.removeEventListener("hashchange", changed);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(timeout);
  }, [toast]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLocationPicker(false);
        setInfo(false);
        setBlueprint(false);
        setSearch("");
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    if (!info && !blueprint && !locationPicker) return;
    const previous = document.activeElement as HTMLElement | null;
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const elements = [
        ...document.querySelectorAll<HTMLElement>(
          ".modal button,.modal a[href],.modal select,.modal input,.modal summary",
        ),
      ];
      const first = elements[0],
        last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [info, blueprint, locationPicker]);

  const filteredPlaces = campus.places
    .filter(
      (p) =>
        (category === "All places" || p.category === category) &&
        (!search || normalize(p.name + p.id).includes(normalize(search))),
    )
    .sort((a, b) => Number(!!b.indoor) - Number(!!a.indoor));
  const searchRooms = search
    ? indoors
        .flatMap((b) =>
          b.floors.flatMap((f) =>
            f.rooms
              .filter((r) =>
                normalize(r.name + r.id).includes(normalize(search)),
              )
              .map((r) => ({ room: r, building: b, floor: f.level })),
          ),
        )
        .filter((r) => !building || directionBuildings.some(b => b.id === r.building.id))
        .slice(0, 16)
    : [];
  function enter(id: string, roomId?: string) {
    const food = campus.places.find(p => p.id === id && p.locationBuildingId);
    if (food) {
      if (!food.locationRoomId) { openBuilding(id); return; }
      roomId ??= food.locationRoomId;
      id = food.locationBuildingId!;
    }
    const target = indoorForPlace(id);
    if (target?.id !== indoorLocation?.buildingId) floorEstimate.stop();
    if (building && target && sharedView && directionBuildings.some(b => b.id === target.id)) {
      const targetFloor = roomId ? target.floors.find(f => f.rooms.some(r => r.id === roomId)) : floorAtLevel(target,currentLevel,true);
      setBuilding(target);
      setFloor(targetFloor?.level ?? target.defaultFloor ?? 1);
      setSelected(roomId ?? null);
      if (roomId) setTo(roomId);
      setSearch("");
      setBlueprint(false);
      return;
    }
    if (roomId) pending.current = { building: target?.id ?? id, room: roomId };
    if (building?.id === target?.id) {
      if (roomId) {
        selectRef.current(roomId);
        setSearch("");
      }
      return;
    }
    if (scene.current) scene.current.enterBuilding(id);
    else openBuilding(id);
  }
  function back() {
    floorEstimate.stop();
    if (building) setRoomBuildingId(building.id);
    setLocationStatus("");
    setBuilding(null);
    setFloor(1);
    setSelected(null);
    setRoute(null);
    setDirections(false);
    setSearch("");
    setStacked(false);
    setFrom("");
    setTo("");
    setBlueprint(false);
  }
  function chooseRoomBuilding(id: string) {
    if (id !== indoorLocation?.buildingId) floorEstimate.stop();
    const next = indoors.find(b => b.id === id);
    if (!next) return;
    setLocationStatus("");
    setRoomBuildingId(next.id);
    setBuilding(next);
    setFloor(next.defaultFloor ?? next.floors[0].level);
    setSelected(null);
    setSearch("");
    setFrom(indoorLocationId ? YOUR_LOCATION : entranceOf(next));
    setTo("");
    setRoute(null);
    setRouteError("");
    setStacked(false);
    setBlueprint(false);
    setDirections(true);
  }
  function openDirectionsMode(mode: "rooms" | "campus") {
    setSearch("");
    if ((mode === "rooms") === !!building) {
      startDirections();
      return;
    }
    if (mode === "rooms") {
      const destination = selectedPlace ?? campus.places.find(p => p.id === to);
      chooseRoomBuilding(indoorForPlace(destination?.locationBuildingId ?? destination?.id ?? to)?.id ?? roomBuildingId);
      return;
    }
    floorEstimate.stop();
    // Starting campus directions from an indoor view preselects that building.
    if (building) setRoomBuildingId(building.id);
    const campusStart = campus.places.find(p => p.id === building?.id)
      ?? campus.places.find(p => p.id === building?.campusIds?.[0]);
    setLocationStatus("");
    setBuilding(null);
    setFloor(1);
    setSelected(null);
    setFrom(indoorLocationId ? YOUR_LOCATION : campusStart?.id ?? "");
    setTo("");
    setRoute(null);
    setRouteError("");
    setStacked(false);
    setBlueprint(false);
    setDirections(true);
  }
  function selectRoom(room: Room) {
    setSelected(room.id);
    setTo(room.id);
  }
  function startDirections() {
    if (selectedRoom?.routeable === false) {
      setToast(
        "This space is shown for reference. Its access or floor assignment needs verification. Choose a public mapped room or entrance.",
      );
      return;
    }
    setDirections(true);
    setFrom(indoorLocationId ? YOUR_LOCATION : from || defaultEntrance);
    setTo(selectedRoom?.id ?? selectedPlace?.id ?? to);
    setRoute(null);
    setRouteError("");
  }
  function applyRouteFilters(preference: "fastest" | "indoors", avoidStairs: boolean) {
    setCampusRoutePreference(preference);
    setStepFree(avoidStairs);
    setRouteError("");
    if (route) computeRoute({ preference, avoidStairs });
  }
  function computeRoute(options: { preference?: "fastest" | "indoors"; avoidStairs?: boolean } = {}) {
    const avoidStairs = options.avoidStairs ?? stepFree;
    const preference = options.preference ?? campusRoutePreference;
    setRouteError("");
    if (!from || !to) {
      setRoute(null);
      setRouteError("Choose both a starting point and a destination.");
      return;
    }
    const startId = from === YOUR_LOCATION && indoorLocationId ? indoorLocationId : from;
    const endId = to === YOUR_LOCATION && indoorLocationId ? indoorLocationId : to;
    if (building && (startId === YOUR_LOCATION || endId === YOUR_LOCATION)) {
      setRoute(null); setRouteError("Confirm your starting room or entrance first."); openLocationPicker(); return;
    }
    if (startId === endId) {
      setRoute(null);
      setRouteError("Your start and destination are the same place.");
      return;
    }
    if (!building) {
      const start = campus.places.find(p => p.id === startId);
      const end = campus.places.find(p => p.id === endId);
      if (start && end && (start.locationBuildingId ?? start.id) === (end.locationBuildingId ?? end.id)) {
        setRoute(null);
        setRouteError("Both places are in the same building. Open its indoor map to find a mapped room or space.");
        return;
      }
    }
    if ((startId === YOUR_LOCATION || endId === YOUR_LOCATION) && !locationValue) {
      setRoute(null); setRouteError("Allow location access or choose a starting place.");
      if (!locationLoading) requestOutdoorLocation(); return;
    }
    if ((startId === YOUR_LOCATION || endId === YOUR_LOCATION) && locationValue && locationValue.accuracy > 50) {setRoute(null);setRouteError("GPS is too approximate for this route. Move outdoors or choose a mapped starting point.");return;}
    const next = routeJourney(campus,campusIndoorNetwork,indoors,indoorConnections,startId,endId,locationValue?.point ?? null,avoidStairs,preference === "indoors");
    if (!next) {
      setRoute(null);
      setRouteError(
        building
          ? "No connected route was found. Try another room or route preference."
          : "A connected walking path is not available for these points. Try another start, or open external walking directions.",
      );
      return;
    }
    setRoute(next);
    if (!building && locationValue && (from === YOUR_LOCATION || to === YOUR_LOCATION)) latestRouteFix.current = { point: locationValue.point, timestamp: Date.now() };
    if (building) {
      const startBuilding = indoors.find(b => b.id === next.nodes[0].buildingId);
      if (startBuilding) setBuilding(startBuilding);
      setFloor(next.nodes[0].floor);
      setSelected(null);
    }
    setToast(`Route ready · ${travelTimeLabel(next.estimatedSeconds)}`);
  }
  function openLocationPicker(estimatedFloor?: number) {
    const owner = indoors.find(b => b.id === indoorLocation?.buildingId) ?? building ?? indoors.find(b => b.id === "LIB")!;
    setLocationBuilding(owner.id);
    setLocationFloor(estimatedFloor ?? indoorLocation?.floor ?? owner.defaultFloor ?? owner.floors[0].level);
    setLocationRoom(estimatedFloor === undefined ? indoorLocationId : "");
    setLocationPicker(true);
  }
  function locationClick() {
    if (building) openLocationPicker();
    else {setLocationStatus("");liveLocation.start("center");}
  }
  function requestOutdoorLocation() {
    setLocationStatus("");
    liveLocation.start("follow");
  }
  async function share() {
    try {
      if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(JSON.stringify({type:'share',params:window.__EL_VIEW__??''}));return;}
      const url=new URL('/map',location.origin);url.search=window.__EL_VIEW__??'';
      await navigator.clipboard.writeText(url.href);
      setToast("Map link copied");
    } catch {
      setToast("Copy the page address to share this map view.");
    }
  }
  function viewFloor(level: number) {
    setFloor(level);
    setSelected(null);
  }
  function viewRouteStep(buildingId: string | undefined, level: number) {
    const next = indoors.find(b => b.id === buildingId);
    if (next?.id !== indoorLocation?.buildingId) floorEstimate.stop();
    setBuilding(next ?? null);
    setBlueprint(false); setStacked(false);
    viewFloor(level);
  }
  function setStartingPoint(id: string) {
    changeEndpoint(setFrom, id);
  }
  function markIndoorLocation(id: string) {
    const room = mappedRooms.find(r => r.id === id && r.routeable !== false);
    if (!room) return;
    floorEstimate.stop();
    setFrom(YOUR_LOCATION); setRoute(null); setRouteError("");
    const next = indoors.find(b => b.id === room.buildingId)!;
    setBuilding(next); setRoomBuildingId(next.id);
    setIndoorLocation({buildingId:room.buildingId,floor:room.floor,point:room.door});
    confirmedAt.current = Date.now();
    setIndoorLocationId(room.id); setFloor(room.floor); setSelected(null); setLocationPicker(false);
    setLocationStatus(`${room.name} · Floor ${room.floor} · Set by you`);
  }
  function changeEndpoint(setter: (v: string) => void, value: string) {
    setter(value);
    setRoute(null);
    setRouteError("");
    if (value === YOUR_LOCATION && !indoorLocationId && !building && !locationValue) requestOutdoorLocation();
  }
  const listRooms = (currentFloor?.rooms ?? []).filter(
    (r) =>
      (building?.id === "SCI" && r.kind === "stairs" || !["stairs", "elevator", "washroom"].includes(r.kind)) &&
      r.name !== "Office" && r.name !== "Unverified room label",
  );
  const routeFloors = [
    ...new Set(route?.nodes.filter(n => !n.buildingId || n.buildingId === building?.id).map((n) => n.floor) ?? []),
  ].filter((n) => n > 0);
  const selectedDestination = to === YOUR_LOCATION ? "Your location" : mappedRooms.find(r => r.id === to)?.name ?? campus.places.find(p => p.id === to)?.name;
  const externalDestination = campus.places.find(
    (p) => p.id === (to || selected),
  );
  const externalLink = externalDestination
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(externalDestination.name + " Wilfrid Laurier University Waterloo")}&travelmode=walking`
    : "";

  return (
    <div className="app">
      {locationPicker && <div className="modal-scrim" onClick={() => setLocationPicker(false)}><section className="modal location-modal" role="dialog" aria-modal="true" aria-labelledby="location-title" onClick={e => e.stopPropagation()}>
        <div className="section-heading"><h2 id="location-title">Where are you?</h2><button autoFocus className="icon-button" aria-label="Close location" onClick={() => setLocationPicker(false)}><X size={20}/></button></div>
        <p className="small-text">Choose a room or entrance near you. Your blue dot stays there until you update it.</p>
        <label>Building<select value={locationBuilding} onChange={e => {const b=indoors.find(b => b.id === e.target.value)!;setLocationBuilding(b.id);setLocationFloor(b.defaultFloor ?? b.floors[0].level);setLocationRoom("");}}>{indoors.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        <label>Floor<select value={locationFloor} onChange={e => {setLocationFloor(Number(e.target.value));setLocationRoom("");}}>{pickerBuilding.floors.map(f => <option key={f.level} value={f.level}>{f.label}</option>)}</select></label>
        <label>Room or entrance<select value={locationRoom} onChange={e => setLocationRoom(e.target.value)}><option value="">Choose your nearest mapped point</option>{pickerBuilding.floors.find(f => f.level === locationFloor)?.rooms.filter(r => r.routeable !== false && r.name !== 'Office').map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
        <details><summary>About floor estimates</summary><p className="small-text">Your phone can estimate height changes after calibration. Pressure changes and different floor heights can make it wrong. It cannot detect your room. Confirm your location before routing.</p><label>Approximate floor height (m)<input type="number" min="2.5" max="6" step="0.1" value={floorHeight} onChange={e => {floorEstimate.stop();setFloorHeight(Number(e.target.value));}} onBlur={() => {if (floorHeight < 2.5 || floorHeight > 6 || !Number.isFinite(floorHeight)) setFloorHeight(3.5);}}/></label><p className="small-text">Default 3.5 m is an assumption, not a measured building height. Estimates reset after a pause and expire after 10 minutes. Readings stay on your phone.</p></details>
        <button className="primary-button" disabled={!locationRoom} onClick={() => markIndoorLocation(locationRoom)}>Confirm location</button>
        {indoorLocationId && <button className="text-link" onClick={() => {floorEstimate.stop();setIndoorLocationId("");setIndoorLocation(null);setRoute(null);setLocationPicker(false);}}>Clear indoor location</button>}
      </section></div>}

      <main className="main-layout">
        <aside className="sidebar" aria-label="Map explorer">
          <div className="sidebar-top">
            {building ? (
              <>
                <button className="back-link" onClick={back}>
                  <ArrowLeft size={16} /> Campus map
                </button>
                <h1>
                  {building.id === "BA" ? "Bricker Academic" : building.name}
                  </h1>
              </>
            ) : (
              <>
                <h1>
                  Campus map
                </h1>
              </>
            )}
            <div className="location-summary">
              {confirmedRoom ? <>
                <button className="location-summary-button" onClick={() => openLocationPicker()}><LocateFixed size={16}/><span>{indoors.find(b => b.id === confirmedRoom.buildingId)?.name} · Floor {confirmedRoom.floor}<small>{confirmedRoom.name} · Set by you</small></span><ChevronRight size={16}/></button>
                {building?.id === confirmedRoom.buildingId && (floorEstimate.estimate ? <div className="floor-hint" role="status"><span>{floorEstimate.estimate.floor !== null ? `Estimated floor ${floorEstimate.estimate.floor}` : floorEstimate.estimate.status === 'calibrating' ? 'Calibrating height… Stay on this floor' : 'Floor uncertain — confirm your location'}</span><button className="text-link" onClick={() => openLocationPicker(floorEstimate.estimate?.floor ?? undefined)}>Update</button><button className="text-link" onClick={floorEstimate.stop}>Stop</button></div> : <button className="text-link" onClick={() => {if (Date.now()-confirmedAt.current > 60000) {openLocationPicker();setToast("Confirm your floor, then enable estimates");} else floorEstimate.start(confirmedRoom.floor,indoors.find(b => b.id === confirmedRoom.buildingId)!.floors.map(f => f.level),floorHeight);}}>Estimate floor changes</button>)}
                {building?.id === confirmedRoom.buildingId && floorEstimate.message && <p className="small-text" role="status">{floorEstimate.message}</p>}
              </> : <button className="text-link" onClick={() => openLocationPicker()}><LocateFixed size={15}/> Set indoor location</button>}
            </div>
            <label className="searchbox">
              <Search size={18} />
              <input
                aria-label="Search buildings and rooms"
                placeholder={
                  building
                    ? building.id === "LIB" ? "Find a room, collection or café" : building.id === "SCI" ? "Find a room, e.g. N1001 or N1042" : `Find a room, e.g. ${building.id} ${building.id === "LH" ? "3098" : "201"}`
                    : "Search a building, place or room"
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button aria-label="Clear search" onClick={() => setSearch("")}>
                  <X size={16} />
                </button>
              )}
            </label>
            <div className="directions-modes" role="group" aria-label="Directions section">
              <button aria-pressed={directions && !!building} onClick={() => openDirectionsMode("rooms")}>
                <DoorOpen size={16} /> Find a room
              </button>
              <button aria-pressed={directions && !building} onClick={() => openDirectionsMode("campus")}>
                <Footprints size={16} /> Around campus
              </button>
            </div>
            {!building && !search && !directions && (
              <div className="categories" aria-label="Place categories">
                {categories.map((c) => (
                  <button
                    key={c}
                    aria-pressed={category === c}
                    className={category === c ? "active" : ""}
                    onClick={() => setCategory(c)}
                  >
                    {c === "Food" && <Utensils size={13} />} {c}
                  </button>
                ))}
              </div>
            )}
            {building && !search && (
              <div className="building-meta">
                <span>
                  <Layers size={14} /> {building.floors.length} mapped floor{building.floors.length === 1 ? "" : "s"}
                </span>
                <span>
                  <ScanLine size={14} /> Blueprint based
                </span>
              </div>
            )}
          </div>
          <div className="sidebar-scroll">
            {search ? (
              <div className="search-results">
                <div className="section-label">SEARCH RESULTS</div>
                {searchRooms.map((r) => (
                  <button
                    className="place-row"
                    key={r.room.id}
                    onClick={() => enter(r.building.id, r.room.id)}
                  >
                    <span
                      className="place-icon"
                      style={{ background: colors[r.room.kind] }}
                    >
                      <DoorOpen size={18} />
                    </span>
                    <span>
                      <strong>{r.room.name}</strong>
                      <small>
                        {r.building.name} · Floor {r.floor}
                      </small>
                    </span>
                    <ChevronRight size={16} />
                  </button>
                ))}
                {!building &&
                  filteredPlaces.filter(p => !p.locationRoomId || !searchRooms.some(r => r.room.id === p.locationRoomId)).map((p) => (
                    <button
                      className="place-row"
                      key={p.id}
                      onClick={() => {
                        if (p.locationBuildingId) { enter(p.id); return; }
                        setSelected(p.id);
                        setSearch("");
                        scene.current?.locate(p.center);
                      }}
                    >
                      <span className="place-icon">
                        <Building2 size={18} />
                      </span>
                      <span>
                        <strong>{p.name}</strong>
                        <small>{p.locationBuildingId ? campus.places.find(b => b.id === p.locationBuildingId)?.name : p.category}</small>
                      </span>
                      <ChevronRight size={16} />
                    </button>
                  ))}
                {!searchRooms.length &&
                  (building || !filteredPlaces.length) && (
                    <div className="empty-state">
                      <Search size={24} />
                      <strong>No matching places</strong>
                      <p>
                        Try a building name or a room number from the supplied
                        plans.
                      </p>
                    </div>
                  )}
              </div>
            ) : directions ? (
              <div className="directions-panel">
                <div className="section-heading">
                  <h2>{building ? "Find a room" : "Around campus"}</h2>
                  <button
                    className="icon-button"
                    aria-label="Close directions"
                    onClick={() => {
                      setDirections(false);
                      setRoute(null);
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>

                {building && <label className="route-building-picker">
                  BUILDING
                  <select aria-label="Building for room directions" value={building.id} onChange={e => chooseRoomBuilding(e.target.value)}>
                    {indoors.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </label>}
                <div className="route-inputs">
                  <span className="route-dots">
                    <i />
                    <span />
                    <i />
                  </span>
                  <div>
                    <label>
                      FROM
                      <select
                        aria-label="Starting point"
                        value={from}
                        onChange={(e) =>
                          setStartingPoint(e.target.value)
                        }
                      >
                        <option value="">Choose a starting point</option>
                        <option value={YOUR_LOCATION}>Your location</option>
                        {mappedRooms.some(r => r.id === from && !directionBuildings.some(b => b.id === r.buildingId)) && <option value={from}>{mappedRooms.find(r => r.id === from)?.name}</option>}
                        {building ? (
                          directionBuildings.flatMap((b) => b.floors.map((f) => (
                            <optgroup key={`${b.id}-${f.level}`} label={`${b.name} · ${f.label}`}>
                              {f.rooms
                                .filter(
                                  (r) =>
                                    r.routeable !== false &&
                                    (r.kind !== "office" ||
                                      r.name !== "Office"),
                                )
                                .map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {r.name}
                                  </option>
                                ))}
                            </optgroup>
                          )))
                        ) : (
                          <>
                            {campus.places.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </>
                        )}
                      </select>
                    </label>
                    <label>
                      TO
                      <select
                        aria-label="Destination"
                        value={to}
                        onChange={(e) => changeEndpoint(setTo, e.target.value)}
                      >
                        <option value="">Choose a destination</option>
                        <option value={YOUR_LOCATION}>Your location</option>
                        {mappedRooms.some(r => r.id === to && !directionBuildings.some(b => b.id === r.buildingId)) && <option value={to}>{mappedRooms.find(r => r.id === to)?.name}</option>}
                        {building
                          ? directionBuildings.flatMap((b) => b.floors.map((f) => (
                              <optgroup key={`${b.id}-${f.level}`} label={`${b.name} · ${f.label}`}>
                                {f.rooms
                                  .filter(
                                    (r) =>
                                      r.routeable !== false &&
                                      (r.kind !== "office" ||
                                        r.name !== "Office"),
                                  )
                                  .map((r) => (
                                    <option key={r.id} value={r.id}>
                                      {r.name}
                                    </option>
                                  ))}
                              </optgroup>
                            )))
                          : campus.places.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                      </select>
                    </label>
                  </div>
                  <button
                    className="icon-button swap"
                    aria-label="Swap start and destination"
                    onClick={() => {
                      setFrom(to);
                      setTo(from);
                      setRoute(null);
                      setRouteError("");
                    }}
                  >
                    <ArrowUpDown size={17} />
                  </button>
                </div>
                <div className="route-filters">
                  <div className="route-filters-heading">
                    <span>{!building && campusRoutePreference === "indoors" ? "Prefer indoor paths" : "Fastest route"}{stepFree ? building ? " · Prefer elevators" : " · Avoid stairs" : ""}</span>
                    <button className="route-filter-button" aria-expanded={routeFiltersOpen} aria-controls="route-filter-options" onClick={() => setRouteFiltersOpen(!routeFiltersOpen)}>
                      <SlidersHorizontal size={15} /> Filters{(stepFree || (!building && campusRoutePreference === "indoors")) && <span className="filter-count">{Number(stepFree) + Number(!building && campusRoutePreference === "indoors")}</span>}
                    </button>
                  </div>
                  {routeFiltersOpen && <div id="route-filter-options" className="route-filter-options">
                    {!building && <label className="switch-row">
                      <span><Footprints size={18} /><span>Prefer indoor paths<small>Minimize outdoor walking, even if it takes longer.</small></span></span>
                      <input type="checkbox" checked={campusRoutePreference === "indoors"} onChange={e => applyRouteFilters(e.target.checked ? "indoors" : "fastest", stepFree)} />
                    </label>}
                    {(!building || directionBuildings.some(b => b.floors.length > 1)) && <label className="switch-row">
                      <span><Accessibility size={18} /><span>{building ? "Prefer elevators" : "Avoid stairs"}<small>{building ? "Use mapped elevators for floor changes." : "Avoid mapped outdoor steps; use the Arts elevator. Other indoor steps need checking."}</small></span></span>
                      <input type="checkbox" checked={stepFree} onChange={e => applyRouteFilters(campusRoutePreference, e.target.checked)} />
                    </label>}
                    {(stepFree || (!building && campusRoutePreference === "indoors")) && <button className="text-link" onClick={() => applyRouteFilters("fastest", false)}>Clear filters</button>}
                  </div>}
                </div>
                {(from === YOUR_LOCATION || to === YOUR_LOCATION) && (
                  <div className="endpoint-location" role="status">
                    <LocateFixed size={16} aria-hidden="true" />
                    <div>
                      <p>{confirmedRoom ? `${confirmedRoom.name} · Floor ${confirmedRoom.floor} · Set by you` : building ? "Confirm your room or entrance." : displayedLocationStatus || (locationValue ? `GPS · ±${Math.round(locationValue.accuracy)} m` : "Choose GPS or set an indoor starting point.")}</p>
                      <button className="text-link" onClick={() => openLocationPicker()}>Set indoor location</button>
                      {!building && <button className="text-link" onClick={() => {setIndoorLocationId("");setIndoorLocation(null);floorEstimate.stop();requestOutdoorLocation();}} disabled={locationLoading}>{locationLoading ? "Finding location…" : "Use GPS outdoors"}</button>}
                    </div>
                  </div>
                )}
                <button className="primary-button" onClick={() => computeRoute()} disabled={!building && !indoorLocationId && locationLoading && (from === YOUR_LOCATION || to === YOUR_LOCATION)}>
                  <Navigation size={16} /> Show route <ArrowRight size={16} />
                </button>
                {routeError && (
                  <p className="route-error" role="alert">
                    {routeError}
                  </p>
                )}
                {route && (
                  <div className="route-result">
                    <div className="route-time-card" aria-label="Estimated travel time" aria-live="polite">
                      <Clock3 size={24} aria-hidden="true" />
                      <div>
                        <span>Estimated travel time</span>
                        <strong>{travelTimeLabel(route.estimatedSeconds)}</strong>
                        <small>{travelMode(route)}{route.distanceMeters !== undefined ? ` · ~${Math.round(route.distanceMeters)} m` : ""}</small>
                      </div>
                    </div>
                    <div className="route-summary">
                      <span className="route-icon">
                        <Footprints size={22} />
                      </span>
                      <div>
                        <strong>{selectedDestination ?? "Your route"}</strong>
                        <small>
                          {building
                            ? `${new Set(route.nodes.map(n => n.buildingId)).size > 1 ? `${new Set(route.nodes.map(n => n.buildingId)).size} connected buildings` : `${routeFloors.length} floor${routeFloors.length === 1 ? "" : "s"}`} · ${route.edges.some((e) => e.kind === "elevator") ? "Via elevator" : route.edges.some((e) => e.kind === "stairs") ? "Via stairs" : "Corridor route"}`
                            : route.outdoorDistanceMeters !== undefined ? `~${Math.round(route.outdoorDistanceMeters)} m outdoors · ${route.indoorOverview ? "indoor links shown dashed" : "no mapped indoor link used"}` : `Approx. ${Math.round(route.distanceMeters ?? route.distance * 4)} m along mapped paths`}
                        </small>
                      </div>
                      <Check size={17} />
                    </div>
                    {route.hasUnmeasuredAccess && <p className="small-text">Time and distance cover mapped portions. Allow extra time between the entrance and campus path.</p>}
                    <p className="route-estimate" title="Estimated walking at 1.3 m/s; stairs 20 seconds per floor; elevator 25 seconds to board plus 6 seconds per floor. Indoor overview links estimate gaps between building footprints, not surveyed corridors. No live access or queue data.">{route.preference === "indoors" ? "Least outdoor walking, then fastest time" : "Fastest mapped route"}{stepFree ? building ? " using elevators" : " without mapped outdoor stairs" : ""} · {route.indoorOverview ? "rough time estimate" : "approximate time"}{building ? ", including floor changes" : ""}</p>
                    {!building && !indoorLocationId && !locationValue && (from === YOUR_LOCATION || to === YOUR_LOCATION) && <p className="route-error">GPS paused or unavailable. This route uses your last location; start live GPS to update it.</p>}
                    {routeSteps(route).map((step, i) => (
                      <button
                        className="route-step"
                        key={i}
                        onClick={() => viewRouteStep(step.buildingId, step.floor)}
                      >
                        <span>{i + 1}</span>
                        <div>
                          {step.text}
                          {step.floor > 0 && (
                            <small>{indoors.find(b => b.id === step.buildingId)?.name} · Floor {step.floor} · tap to view</small>
                          )}
                        </div>
                        {step.kind === "elevator" ? (
                          <MoveUp size={17} />
                        ) : step.kind === "stairs" ? (
                          <MoveDown size={17} />
                        ) : (
                          <ChevronRight size={15} />
                        )}
                      </button>
                    ))}
                    <div className="route-notice">
                      <Info size={15} />
                      <span>
                        {building
                          ? "Preview follows traced corridors. Confirm doors, access, and elevator service on campus."
                          : route.indoorOverview ? "Indoor links show the building sequence, not exact corridors. Bridgeway exit placement, indoor distances and time are approximate; check current door access."
                          : "Preview ends at nearby mapped paths. Entrances, crossings, and current access need checking."}
                      </span>
                    </div>
                  </div>
                )}
                {!building && externalLink && (
                  <a
                    className="text-link"
                    href={externalLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open external walking directions <ExternalLink size={13} />
                  </a>
                )}
              </div>
            ) : building ? (
              <>
                <div className="floor-card">
                  <span className="floor-number">0{floor}</span>
                  <div>
                    <strong>{currentFloor?.label}</strong>
                    <small>{listRooms.length} named rooms & spaces</small>
                  </div>
                  <span className="floor-card-icon">
                    <Layers size={21} />
                  </span>
                </div>
                {building.coverage && <details className="coverage-note"><summary>Plan coverage</summary><p>{building.coverage}</p></details>}
                {directionBuildings.length > 1 && <div className="connected-card">
                  <div className="section-heading"><h2>Connected indoors</h2><Layers size={16}/></div>
                  <p>{building.id === "SCI" || building.id === "BA" ? "Science and Bricker join through the Floor 1 connection portal." : "Arts Floor 2 joins Peters Floor 1. Peters and Schlegel share floor levels."} Choose a connected map or an individual building view.</p>
                  <div className="connected-tabs">{directionBuildings.map(b => <button key={b.id} className={b.id === building.id ? "active" : ""} aria-pressed={b.id === building.id} onClick={() => enter(b.id)}>{b.id === "ARTS" ? "Arts & Concourse" : b.id === "P" ? "Peters" : b.id === "SC" ? "Schlegel" : b.id === "SCI" ? "Science" : "Bricker"}<ChevronRight size={13}/></button>)}</div>
                  <button className="text-link" onClick={startDirections}><Navigation size={14}/> Plan across connected buildings</button>
                </div>}
                {selectedRoom && (
                  <div className="selection-card">
                    <div className="section-heading">
                      <span className="eyebrow">SELECTED SPACE</span>
                      <button
                        className="icon-button"
                        aria-label="Clear room selection"
                        onClick={() => setSelected(null)}
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <span
                      className="room-kind"
                      style={{ background: colors[selectedRoom.kind] }}
                    >
                      {kindNames[selectedRoom.kind]}
                    </span>
                    <h2>{selectedRoom.name}</h2>
                    <p>
                      {building.name} · Floor {selectedRoom.floor}
                    </p>
                    {selectedRoom.details && <p className="small-text">{selectedRoom.details}</p>}
                    {selectedRoom.routeable === false && <p className="small-text">Access or floor assignment needs verification. Directions are unavailable for this space.</p>}
                    <button
                      className="primary-button"
                      onClick={startDirections}
                      disabled={selectedRoom.routeable === false}
                    >
                      <Navigation size={16} /> Directions here{" "}
                      <ArrowRight size={16} />
                    </button>
                    <button
                      className="text-link"
                      disabled={selectedRoom.routeable === false}
                      onClick={() => {
                        markIndoorLocation(selectedRoom.id);
                        setDirections(true);
                        setRoute(null);
                      }}
                    >
                      Set as your location
                    </button>
                  </div>
                )}
                <div className="section-heading spaces-heading">
                  <h2>On this floor</h2>
                  <span>{listRooms.length}</span>
                </div>
                <div className="room-list">
                  {listRooms.map((r) => (
                    <button
                      className={`place-row ${selected === r.id ? "selected" : ""}`}
                      key={r.id}
                      onClick={() => selectRoom(r)}
                    >
                      <span
                        className="place-icon"
                        style={{ background: colors[r.kind] }}
                      >
                        {r.kind === "entrance" ? (
                          <DoorOpen size={17} />
                        ) : r.kind === "stairs" ? (
                          <MoveUp size={17} />
                        ) : r.kind === "study" ? (
                          <BookOpen size={17} />
                        ) : (
                          <GraduationCap size={18} />
                        )}
                      </span>
                      <span>
                        <strong>{r.name}</strong>
                        <small>{kindNames[r.kind]}</small>
                      </span>
                      <ChevronRight size={15} />
                    </button>
                  ))}
                </div>
                <button
                  className="blueprint-link"
                  onClick={() => setBlueprint(true)}
                >
                  <ScanLine size={17} />
                  <span>
                    Compare with the original plan
                    <small>Floor {floor} blueprint</small>
                  </span>
                  <ArrowRight size={16} />
                </button>
              </>
            ) : (
              <>
                {selectedPlace ? (
                  <div className="selection-card campus-selection">
                    <div className="section-heading">
                      <span className="eyebrow">CAMPUS PLACE</span>
                      <button
                        className="icon-button"
                        aria-label="Clear place selection"
                        onClick={() => setSelected(null)}
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <span className="room-kind">{selectedPlace.category}</span>
                    <h2>{selectedPlace.name}</h2>
                    <p>{selectedPlace.description}</p>
                    {(selectedPlace.indoor || selectedPlace.locationBuildingId) && (
                      <button
                        className="primary-button"
                        onClick={() => enter(selectedPlace.locationBuildingId ?? selectedPlace.id)}
                      >
                        <DoorOpen size={17} /> {selectedPlace.locationBuildingId ? "Explore Science Building" : "Explore inside"}{" "}
                        <ArrowRight size={16} />
                      </button>
                    )}
                    <button
                      className={
                        selectedPlace.indoor || selectedPlace.locationBuildingId
                          ? "secondary-button"
                          : "primary-button"
                      }
                      onClick={startDirections}
                    >
                      <Navigation size={16} /> Directions here
                    </button>
                  </div>
                ) : (
                  <div className="tip-card">
                    <span className="tip-icon">
                      <SquareStack size={23} />
                    </span>
                    <div>
                      <strong>A whole campus to explore.</strong>
                      <p>Tap a purple building to step inside.</p>
                      <span className="tiny-tag">{indoors.length} INDOOR MAPS · {indoors.reduce((n,b)=>n+b.floors.length,0)} FLOORS</span>
                    </div>
                  </div>
                )}
                <div className="section-heading spaces-heading">
                  <h2>
                    {category === "All places" ? "Campus places" : category}
                  </h2>
                  <span>{filteredPlaces.length}</span>
                </div>
                <div className="campus-list">
                  {filteredPlaces.map((p) => (
                    <button
                      className={`place-row ${p.indoor ? "indoor-row" : ""} ${selected === p.id ? "selected" : ""}`}
                      key={p.id}
                      onClick={() =>
                        p.indoor || p.locationRoomId ? enter(p.id) : selectRef.current(p.id)
                      }
                    >
                      <span
                        className={`place-icon ${p.indoor ? "purple" : ""}`}
                      >
                        {p.category === "Food" ? (
                          <Utensils size={18} />
                        ) : p.category === "Athletics" ? (
                          <Footprints size={18} />
                        ) : p.id === "LIB" ? (
                          <BookOpen size={18} />
                        ) : (
                          <Building2 size={18} />
                        )}
                      </span>
                      <span>
                        <strong>{p.name}</strong>
                        <small>
                          {p.locationBuildingId ? campus.places.find(b => b.id === p.locationBuildingId)?.name : p.indoor ? `Indoor map · ${indoorForPlace(p.id)?.floors.length ?? 0} floor${indoorForPlace(p.id)?.floors.length === 1 ? "" : "s"}` : p.category}
                        </small>
                      </span>
                      {p.indoor ? (
                        <span className="indoor-badge">
                          3D <ChevronRight size={13} />
                        </span>
                      ) : (
                        <ChevronRight size={15} />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="sidebar-footer">
            <span className="footer-dot" />
            <span>Made for finding your next class.</span>
            <button aria-label="Map information" onClick={() => setInfo(true)}>
              <Info size={15} />
            </button>
          </div>
        </aside>
        <section
          className="map-area"
          aria-label={
            building ? sharedView ? `${directionBuildings.map(b => b.name).join(", ")} connected indoor map` : `${building.name} indoor map` : "Waterloo campus map"
          }
        >
          <div ref={container} className="map-canvas" />
          {webglError && (
            <div className="webgl-error">
              <Building2 size={30} />
              <h2>3D is unavailable in this browser</h2>
              <p>
                You can still search rooms and plan routes using the explorer.
              </p>
              {building && (
                <button
                  className="primary-button"
                  onClick={() => setBlueprint(true)}
                >
                  View the original floor plan
                </button>
              )}
            </div>
          )}
          <div className="map-top">
            <div className="map-breadcrumb">
              <MapPin size={15} />
              <span>Waterloo</span>
              {building && (
                <>
                  <ChevronRight size={12} />
                  <strong>
                    {building.id === "BA" ? "Bricker Academic" : building.name}
                  </strong>
                </>
              )}
              <span className="map-state-dot" />
            </div>
            {building && directionBuildings.length > 1 && <div className="view-toggle building-view-toggle" aria-label="Building view">
              <button className={connectedView ? "active" : ""} aria-pressed={connectedView} onClick={() => setConnectedView(true)}>Connected</button>
              <button className={!connectedView ? "active" : ""} aria-pressed={!connectedView} onClick={() => setConnectedView(false)}>Individual</button>
            </div>}
            <div className="view-toggle" aria-label="Map perspective">
              <button
                className={!flat ? "active" : ""}
                aria-pressed={!flat}
                onClick={() => setFlat(false)}
              >
                3D
              </button>
              <button
                className={flat ? "active" : ""}
                aria-pressed={flat}
                onClick={() => setFlat(true)}
              >
                2D
              </button>
            </div>
          </div>
          {building && (
            <>
              <div className="floor-controls" aria-label="Floor controls">
                <span>{sharedView ? building.id === "ARTS" ? "ARTS" : building.id === "DAWB" ? "DAWB" : building.id === "P" ? "PETERS" : building.id === "SC" ? "SCHLEGEL" : building.id === "SCI" ? "SCIENCE" : "BRICKER" : "FLOORS"}</span>
                {[...building.floors].reverse().map((f) => (
                  <button
                    key={f.level}
                    className={floor === f.level ? "active" : ""}
                    aria-label={`View Floor ${f.level}`}
                    aria-pressed={floor === f.level}
                    onClick={() => viewFloor(f.level)}
                  >
                    {f.level}
                    <small>
                      {routeFloors.includes(f.level)
                        ? "•"
                        : f.level === (building.defaultFloor ?? 1)
                          ? "G"
                          : ""}
                    </small>
                  </button>
                ))}
                {(sharedView ? directionBuildings.some(b => b.floors.length > 1) : building.floors.length > 1) && <><div className="control-divider" />
                <button
                  className={stacked ? "stack-button active" : "stack-button"}
                  aria-label={
                    stacked ? "Show a single floor" : "Show stacked floors"
                  }
                  aria-pressed={stacked}
                  onClick={() => setStacked(!stacked)}
                >
                  <Layers size={19} />
                </button></>}
              </div>
              <div className="indoor-caption">
                <span className="eyebrow">
                  {stacked ? sharedView ? "CONNECTED OVERVIEW" : "BUILDING OVERVIEW" : sharedView ? "CONNECTED FLOORS" : "FLOOR CUTAWAY"}
                </span>
                <strong>
                  {stacked
                    ? sharedView ? directionBuildings.map(b => b.id === "ARTS" ? "Arts" : b.id === "P" ? "Peters" : b.id === "SC" ? "Schlegel" : b.id === "SCI" ? "Science" : "Bricker").join(" · ") : `${building.floors.length} floors. One building.`
                    : visibleCaption}
                </strong>
                <span>
                  {stacked
                    ? "Select a floor to reveal its spaces."
                    : sharedView ? "Campus-aligned plans · approximate door positions. Faded wings are on another level." : "Tap a room to find your route."}
                </span>
              </div>
            </>
          )}
          {!building && <div className="live-tracking" aria-label="Live GPS controls">
            <div className="tracking-modes" role="group" aria-label="Location tracking mode">
              <button aria-label="Centre on my location" aria-pressed={liveLocation.mode === "center" && liveLocation.active} onClick={() => { setLocationStatus(""); liveLocation.start("center"); }}><LocateFixed size={15} /> Centre</button>
              <button aria-label="Follow my location" aria-pressed={liveLocation.mode === "follow" && liveLocation.active} onClick={() => { setLocationStatus(""); liveLocation.start("follow"); }}><MapPin size={15} /> Follow</button>
              <button aria-label="Follow my heading" aria-pressed={liveLocation.mode === "heading" && liveLocation.active} onClick={() => { setLocationStatus(""); liveLocation.start("heading"); }}><Compass size={15} /> Heading</button>
            </div>
            {liveLocation.active && <div className="tracking-status">
              <span className={`gps-status-dot ${locationValue ? "ready" : ""}`} />
              <span>{locationValue ? `Live GPS · ±${Math.round(locationValue.accuracy)} m` : liveLocation.loading ? "Finding GPS…" : "Waiting for GPS"}{liveLocation.compass ? ` · ${Math.round(liveLocation.compass.degrees)}°` : ""}{liveLocation.mode === "free" ? " · Browsing" : ""}</span>
              <button aria-label="Stop live GPS" onClick={() => liveLocation.stop()}><X size={13} /></button>
            </div>}
            {liveLocation.active && !liveLocation.compass && <p className="compass-status">{liveLocation.compassMessage || "Waiting for a physical compass reading…"}{liveLocation.mode === "heading" && " Following GPS north-up until heading is available."}</p>}
          </div>}
          <div className="map-tools">
            <button
              className="tool-button"
              aria-label="Zoom in"
              onClick={() => scene.current?.zoom(0.8)}
            >
              <Plus size={21} />
            </button>
            <button
              className="tool-button"
              aria-label="Zoom out"
              onClick={() => scene.current?.zoom(1.25)}
            >
              <Minus size={21} />
            </button>
            <div className="tool-gap" />
            <button
              className="tool-button"
              aria-label="Rotate map"
              disabled={flat}
              onClick={() => { liveLocation.browse(); scene.current?.rotate(); }}
            >
              <RotateCw size={19} />
            </button>
            <button
              className="tool-button"
              aria-label="Reset map view"
              onClick={() => { liveLocation.browse(); scene.current?.reset(); }}
            >
              <Maximize size={18} />
            </button>
            <button
              className={`tool-button ${(building ? indoorLocation?.buildingId === building.id : locationValue) ? "location-active" : ""}`}
              aria-label={
                building ? "Set indoor location" : "Use my location"
              }
              onClick={locationClick}
            >
              <LocateFixed size={20} />
            </button>
          </div>
          <div className="north" title={sharedView ? "North · campus-aligned connected plans" : building?.northAngle ? "North · Albert Street is along the west edge" : building ? "Orientation follows the source plan" : "North"}>
            <i className="north-needle" style={{display: building && (!sharedView && !building.northAngle) ? "none" : "block"}} />
            <span>{building && !sharedView && !building.northAngle ? "PLAN" : "N"}</span>
          </div>
          <div className="map-bottom">
            {route ? <div className="map-route-time" aria-label="Route travel time">
              <Clock3 size={20} aria-hidden="true" />
              <div><span>Estimated travel time</span><strong>{travelTimeLabel(route.estimatedSeconds)}</strong><small>{travelMode(route)}</small></div>
            </div> : <div className="legend">
              <span className="legend-title">
                <SlidersHorizontal size={14} /> MAP KEY
              </span>
              {building ? (
                <>
                  <span>
                    <i style={{ background: colors.classroom }} />
                    Rooms
                  </span>
                  <span>
                    <i style={{ background: colors.study }} />
                    Study
                  </span>
                  <button
                    aria-pressed={showAmenities}
                    onClick={() => setShowAmenities(!showAmenities)}
                  >
                    <span className="legend-stairs">↗</span> {building.id === "SCI" ? "Stairwells" : "Stairs & elevators"}{" "}
                    <span
                      className={
                        showAmenities ? "legend-check active" : "legend-check"
                      }
                    >
                      <Check size={11} />
                    </span>
                  </button>
                </>
              ) : (
                <>
                  <span>
                    <i className="purple-dot" />
                    Indoor map
                  </span>
                  <span>
                    <i className="building-dot" />
                    Campus place
                  </span>
                </>
              )}
            </div>}
            <div className="map-bottom-actions">
              <button className="share-button" onClick={share}>
                <Copy size={14} />
                <span>Share view</span>
              </button>
              <button
                className="directions-chip"
                onClick={() => {
                  setDirections(!directions);
                  setRoute(null);
                  setFrom(indoorLocationId ? YOUR_LOCATION : from || defaultEntrance);
                  setTo(to || selected || "");
                }}
              >
                <Navigation size={16} />
                <span>Directions</span>
              </button>
            </div>
          </div>
          <div className="map-attribution">
            <span>
              {building
                ? "Traced blueprint preview · access unverified"
                : "© OpenStreetMap contributors · ODbL"}
            </span>
            <button onClick={() => setInfo(true)}>Map details</button>
          </div>
          {displayedLocationStatus && (
            <div className="location-status" role="status">
              <LocateFixed size={16} />
              {displayedLocationStatus}
              <button
                aria-label="Dismiss location status"
                onClick={() => { setLocationStatus(""); liveLocation.stop(); }}
              >
                <X size={14} />
              </button>
            </div>
          )}
        </section>
      </main>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
          <button aria-label="Dismiss message" onClick={() => setToast("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {(info || blueprint) && (
        <div
          className="modal-scrim"
          onClick={() => {
            setLocationPicker(false);
        setInfo(false);
            setBlueprint(false);
          }}
        >
          <section
            className={`modal ${blueprint ? "blueprint-modal" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <span className="eyebrow">
                  {blueprint ? "SOURCE FLOOR PLAN" : "CAMPUS EXPLORER"}
                </span>
                <h2 id="dialog-title">
                  {blueprint
                    ? `${building?.name} · Floor ${floor}`
                    : "A better way around campus."}
                </h2>
              </div>
              <button
                autoFocus
                className="icon-button"
                aria-label="Close dialog"
                onClick={() => {
                  setLocationPicker(false);
        setInfo(false);
                  setBlueprint(false);
                }}
              >
                <X size={22} />
              </button>
            </div>
            {blueprint ? (
              <>
                {currentFloor && <FloorPlanImage key={currentFloor.blueprint} path={currentFloor.blueprint} description={`${building?.name} Floor ${floor} original plan`} />}
                <p className="small-text">
                  Reference from the supplied floor plans. The 3D model simplifies this
                  drawing; elevations and route connections are provisional.
                </p>

              </>
            ) : (
              <div className="about-content">
                <div className="about-feature">
                  <SquareStack size={24} />
                  <div>
                    <h3>Outside to inside</h3>
                    <p>
                      Explore campus landmarks, then enter any of the eight indoor maps.
                      Single floors keep directions clear; stacked view shows
                      how the building fits together.
                    </p>
                  </div>
                </div>
                <div className="about-feature">
                  <LocateFixed size={24} />
                  <div>
                    <h3>Location</h3>
                    <p>
                      Live outdoor location uses your device’s foreground location permission,
                      with an accuracy radius and device compass when available.
                      Follow heading rotates the map as you turn. Coordinates stay
                      on this device; tracking pauses when the map is hidden. Indoors, set your starting room or entrance;
                      phone GPS does not establish a reliable room or floor. Optional height-change estimates use your phone’s pressure sensor after you confirm a floor. They need confirmation before routing and stop when the app is paused.
                    </p>
                  </div>
                </div>
                <div className="about-feature">
                  <Navigation size={24} />
                  <div>
                    <h3>Routes are previews</h3>
                    <p>
                      The supplied plans and photographs were manually traced into
                      simplified rooms and corridors. Doors, stair connections,
                      elevator service, access hours, and accessible routes need
                      on-campus verification. “Prefer elevators” avoids stairs
                      in the draft graph; it does not certify accessibility.
                    </p>
                  </div>
                </div>
                <div className="about-feature">
                  <ScanLine size={24} />
                  <div>
                    <h3>{indoors.reduce((sum,b) => sum+b.floors.length,0)} floors to explore</h3>
                    <p>
                      Bricker and Lazaridis each include Floors 1–3 from the
                      provided PDFs. Arts & Concourse, Peters, and Schlegel each include three floors; DAWB includes five. Arts, Peters and Schlegel share indoor directions; DAWB remains separate. Science and Bricker connect through their Floor 1 portal. Science includes the supplied Floor 1, with entrance and stairwell markers; ambiguous room labels remain unverified. The library includes Floors 1–7 from your screenshots and Laurier’s floor plans, with its main entrance on Floor 2. The conference annotation
                      “LH3094” also appears on the second-floor source sheet;
                      the Floor 2 oval is shown as an unverified landmark, with LH3094 available on Floor 3.
                    </p>
                  </div>
                </div>
                <div className="source-links">
                  <a href="https://library.wlu.ca/locations/waterloo" target="_blank" rel="noreferrer">Library source floor plans <ExternalLink size={12} /></a>
                  <a
                    href="https://www.wlu.ca/about/campuses-and-locations/index.html"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Laurier’s official campus maps <ExternalLink size={12} />
                  </a>
                  <a
                    href="https://www.openstreetmap.org/copyright"
                    target="_blank"
                    rel="noreferrer"
                  >
                    OpenStreetMap credits & licence <ExternalLink size={12} />
                  </a>
                </div>
                <p className="small-text">
                  Campus footprints and paths: OpenStreetMap snapshot, October
                  12, 2026. Building heights, trees, and indoor elevations are
                  illustrative. This campus map is part of Everything Laurier.
                </p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
