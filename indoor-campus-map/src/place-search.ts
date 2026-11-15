export interface PlaceOption { id: string; label: string; detail?: string }
const normalized = (text: string) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
export function matchingPlaces(options: PlaceOption[], query: string) {
  const words = normalized(query).split(" ").filter(Boolean);
  return options.filter(option => {
    const text = normalized(`${option.label} ${option.id} ${option.detail ?? ""}`);
    return words.every(word => text.includes(word));
  }).sort((a, b) => Number(normalized(b.label).startsWith(normalized(query))) - Number(normalized(a.label).startsWith(normalized(query))) || a.label.localeCompare(b.label));
}
