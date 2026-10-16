// Building locations confirmed by the user. Only mark an indoor counter when
// its space is identified on a supplied floor plan.
export const foodLocations: Record<string, {
  locationBuildingId: string;
  locationRoomId?: string;
  locationNote: string;
}> = {
  "FOOD-2938254270": {
    locationBuildingId: "ARTS-E",
    locationRoomId: "ARTS1-starbucks",
    locationNote: "Starbucks is in the Concourse, on Arts Floor 1.",
  },
  "FOOD-5037259930": {
    locationBuildingId: "SCI",
    locationNote: "Tim Hortons is in Science Building. Its exact counter position is not marked on the supplied plan.",
  },
  "FOOD-5037259931": {
    locationBuildingId: "LH",
    locationRoomId: "LH1-South lobby",
    locationNote: "Byte 75 restaurant is on Lazaridis Hall Floor 1.",
  },
};
