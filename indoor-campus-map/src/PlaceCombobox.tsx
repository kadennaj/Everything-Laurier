import { useEffect, useId, useRef, useState } from "react";
import { MapPin, Search, X } from "lucide-react";
import { matchingPlaces } from "./place-search";
import type { PlaceOption } from "./place-search";

export function PlaceCombobox({ label, value, options, onSelect, placeholder = "Search a building or place" }: {
  label: string; value: string; options: PlaceOption[]; onSelect: (id: string) => void; placeholder?: string;
}) {
  const id = useId();
  const [query, setQuery] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const list = useRef<HTMLUListElement>(null);
  const selected = options.find(option => option.id === value);
  const matches = matchingPlaces(options, query ?? "");
  useEffect(() => {
    if (open && active >= 0) list.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active, open]);
  const close = () => { setQuery(null); setOpen(false); setActive(-1); };
  const choose = (id: string) => {
    if (id !== value) onSelect(id);
    close();
  };
  return <div className="place-combobox" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) close();
  }}>
    <div className="place-search-input">
      <Search size={17} aria-hidden="true" />
      <input role="combobox" aria-label={label} aria-autocomplete="list" aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined} aria-activedescendant={open && matches[active] ? `${id}-${active}` : undefined}
        autoComplete="off" placeholder={placeholder} value={query ?? selected?.label ?? ""}
        onFocus={() => setOpen(true)}
        onChange={event => { setQuery(event.target.value); setOpen(true); setActive(-1); }}
        onKeyDown={event => {
          if (event.key === "Escape" && open) { event.preventDefault(); close(); }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault(); setOpen(true);
            setActive(index => event.key === "ArrowDown"
              ? Math.min(matches.length - 1, index + 1)
              : index < 0 ? matches.length - 1 : Math.max(0, index - 1));
          }
          if (event.key === "Enter" && open) {
            event.preventDefault();
            const option = matches[active < 0 ? 0 : active];
            if (option) choose(option.id);
          }
        }} />
      {(value || query) && <button type="button" aria-label={`Clear ${label.toLowerCase()}`} onClick={() => { choose(""); setQuery(""); }}><X size={16} /></button>}
    </div>
    {open && <ul ref={list} id={`${id}-list`} className="place-suggestions" role="listbox" aria-label={`${label} suggestions`}>
      {matches.map((option, index) => <li key={option.id} id={`${id}-${index}`} role="option" aria-selected={index === active}>
        <button type="button" tabIndex={-1} onClick={() => choose(option.id)}>
          <MapPin size={16} aria-hidden="true" /><span><strong>{option.label}</strong>{option.detail && <small>{option.detail}</small>}</span>
        </button>
      </li>)}
      {!matches.length && <li className="no-place-matches" role="presentation">No matching places. Try a building name.</li>}
    </ul>}
  </div>;
}
