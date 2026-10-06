import { useEffect, useId, useRef, useState } from "react";
import {
  Archive,
  Check,
  ChevronDown,
  MoreVertical,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  GENDER_OPTIONS,
  activeFacetCount,
  isSkillSelected,
  toggleSkill,
} from "../utils/peopleFilters";

function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timeoutId);
  }, [value, delay]);

  return debounced;
}

function SkillChoices({ labelId, options, selected, onChange }) {
  if (!options.length) {
    return <p className="people-filter-empty">No skills to filter yet.</p>;
  }

  return (
    <div className="people-skill-list" role="group" aria-labelledby={labelId}>
      {options.map((option) => (
        <label key={option.key} className="people-skill-option">
          <input
            className="checkbox checkbox-sm checkbox-primary"
            type="checkbox"
            checked={isSkillSelected(selected, option.label)}
            onChange={() => onChange(toggleSkill(selected, option.label))}
          />
          <span>
            {option.label} · {option.count}
          </span>
        </label>
      ))}
    </div>
  );
}

function LocationSelect({ id, value, options, onChange }) {
  return (
    <select
      id={id}
      className="select select-bordered min-h-11 w-full"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label="Filter by location"
    >
      <option value="">All locations</option>
      {options.map((option) => (
        <option key={option.key} value={option.label}>
          {option.label} · {option.count}
        </option>
      ))}
    </select>
  );
}

function GenderSelect({ id, value, onChange }) {
  return (
    <select
      id={id}
      className="select select-bordered min-h-11 w-full"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label="Filter by gender"
    >
      <option value="">All genders</option>
      {GENDER_OPTIONS.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function SortSelect({ value, options, onChange }) {
  return (
    <select
      className="select select-bordered min-h-11 w-full"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label="Sort"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function FilterChip({ label, onRemove }) {
  return (
    <button type="button" className="people-chip" onClick={onRemove}>
      <span aria-hidden="true">{label}</span>
      <X size={15} aria-hidden="true" />
      <span className="sr-only">Remove {label} filter</span>
    </button>
  );
}

function SkillDropdown({ options, selected, onChange }) {
  const detailsRef = useRef(null);
  const labelId = useId();

  useEffect(() => {
    function closeOnOutsidePointer(event) {
      const details = detailsRef.current;
      if (!details?.open || details.contains(event.target)) return;
      details.open = false;
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, []);

  const summary =
    selected.length > 0 ? `Skills · ${selected.length}` : "All skills";

  return (
    <details ref={detailsRef} className="people-skill-dropdown">
      <summary aria-label="Filter by skill">
        <span id={labelId}>{summary}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </summary>
      <div className="people-skill-dropdown__menu">
        <SkillChoices
          labelId={labelId}
          options={options}
          selected={selected}
          onChange={onChange}
        />
      </div>
    </details>
  );
}

export function SkillFilterButtons({ skills, selectedSkills, onToggle }) {
  if (!skills?.length) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {skills.slice(0, 3).map((skill) => {
        const pressed = isSkillSelected(selectedSkills, skill);
        return (
          <button
            key={skill}
            type="button"
            className="badge badge-outline badge-sm skill-toggle"
            aria-pressed={pressed}
            onClick={() => onToggle(skill)}
          >
            {skill}
          </button>
        );
      })}
      {skills.length > 3 && (
        <span className="badge badge-ghost badge-sm">+{skills.length - 3}</span>
      )}
    </div>
  );
}

export default function PeopleToolbar({
  query,
  onQueryChange,
  skills,
  onSkillsChange,
  skillOptions,
  location,
  onLocationChange,
  locationOptions,
  gender,
  onGenderChange,
  sort,
  onSortChange,
  sortOptions,
  onClear,
  resultSummary,
  searchLabel,
  archivedCount = 0,
  showArchived = false,
  onToggleArchived,
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const sortLabelId = useId();
  const panelRef = useRef(null);
  const panelId = useId();
  const titleId = useId();
  const skillsLabelId = useId();
  const locationLabelId = useId();
  const genderLabelId = useId();
  const debouncedSummary = useDebouncedValue(resultSummary, 300);
  const facetCount = activeFacetCount({ skills, location, gender });
  const showClear = Boolean(
    query.trim() || skills.length || location || gender,
  );

  const sortChanged = sort !== sortOptions[0]?.value;
  const menuActive = facetCount > 0 || sortChanged || showArchived;
  const sortLabel = sortOptions.find((option) => option.value === sort)?.label;

  function closeMenu() {
    if (menuRef.current) menuRef.current.open = false;
  }

  useEffect(() => {
    function closeOnOutside(event) {
      const menu = menuRef.current;
      if (menu?.open && !menu.contains(event.target)) menu.open = false;
    }
    function closeOnEscape(event) {
      if (event.key === "Escape" && menuRef.current?.open) {
        menuRef.current.open = false;
        menuRef.current.querySelector("summary")?.focus();
      }
    }
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 640px)");
    function closeOnWideLayout() {
      if (media.matches) setOpen(false);
    }
    media.addEventListener("change", closeOnWideLayout);
    return () => media.removeEventListener("change", closeOnWideLayout);
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const restoreTarget = menuRef.current?.querySelector("summary");
    panelRef.current?.focus();

    function onKeyDown(event) {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = [
        ...panelRef.current.querySelectorAll("button, input, select"),
      ].filter((element) => !element.disabled);
      if (!focusable.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === panelRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (active === last || active === panelRef.current)
      ) {
        event.preventDefault();
        first.focus();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      restoreTarget?.focus();
    };
  }, [open]);

  const panel = (
    <>
      {open && (
        <button
          type="button"
          className="people-filters-backdrop"
          aria-label="Close filters"
          onClick={() => setOpen(false)}
        />
      )}
      <div
        id={panelId}
        ref={panelRef}
        className={`people-filters-panel${open ? " is-open" : ""}`}
        role="dialog"
        aria-modal={open}
        aria-hidden={!open}
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="people-filters-panel__header">
          <h2 id={titleId}>Filters</h2>
        </div>
        <div>
          <p id={skillsLabelId} className="people-filter-label">
            Skills
          </p>
          <SkillChoices
            labelId={skillsLabelId}
            options={skillOptions}
            selected={skills}
            onChange={onSkillsChange}
          />
        </div>
        <div>
          <label className="people-filter-label" htmlFor={locationLabelId}>
            Location
          </label>
          <LocationSelect
            id={locationLabelId}
            value={location}
            options={locationOptions}
            onChange={onLocationChange}
          />
        </div>
        <div>
          <label className="people-filter-label" htmlFor={genderLabelId}>
            Gender
          </label>
          <GenderSelect
            id={genderLabelId}
            value={gender}
            onChange={onGenderChange}
          />
        </div>
        <button
          type="button"
          className="btn btn-primary people-filters-panel__done min-h-11"
          onClick={() => setOpen(false)}
        >
          Done
        </button>
      </div>
    </>
  );

  return (
    <div className="people-toolbar">
      <div className="people-toolbar__bar">
        <div className="people-toolbar__row">
        <label className="input input-bordered people-toolbar__search min-h-11 w-full">
          <Search
            size={18}
            className="text-base-content/50"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={searchLabel}
            aria-label={searchLabel}
          />
          {query && (
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-circle"
              onClick={() => onQueryChange("")}
              aria-label="Clear search"
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </label>

        <details
          ref={menuRef}
          className="dropdown dropdown-end people-toolbar__menu"
        >
          <summary
            className="btn btn-ghost btn-square min-h-11 min-w-11"
            aria-label={
              menuActive ? "Filters and sort, active" : "Filters and sort"
            }
          >
            <MoreVertical size={20} aria-hidden="true" />
            {menuActive && <span className="people-toolbar__dot" />}
          </summary>
          <div className="dropdown-content z-40 w-60 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg">
            <ul className="menu w-full p-0">
              <li>
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => {
                    closeMenu();
                    setOpen(true);
                  }}
                >
                  <SlidersHorizontal size={16} aria-hidden="true" />
                  Filters
                  {facetCount > 0 && (
                    <span className="badge badge-primary badge-sm ml-auto">
                      {facetCount}
                    </span>
                  )}
                </button>
              </li>
              {onToggleArchived && (archivedCount > 0 || showArchived) && (
                <li>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showArchived}
                    onClick={() => {
                      onToggleArchived();
                      closeMenu();
                    }}
                  >
                    <Archive size={16} aria-hidden="true" />
                    Show archived
                    <span className="badge badge-sm ml-auto">
                      {showArchived ? "On" : archivedCount}
                    </span>
                  </button>
                </li>
              )}
            </ul>
            <p className="people-toolbar__menu-title" id={sortLabelId}>
              Sort by
            </p>
            <ul className="menu w-full p-0" role="radiogroup" aria-labelledby={sortLabelId}>
              {sortOptions.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={sort === option.value}
                    onClick={() => {
                      onSortChange(option.value);
                      closeMenu();
                    }}
                  >
                    <span className="people-toolbar__check">
                      {sort === option.value && (
                        <Check size={16} aria-hidden="true" />
                      )}
                    </span>
                    {option.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </details>
      </div>

        <div className="people-toolbar__desktop-filters">
          {onToggleArchived && (archivedCount > 0 || showArchived) && (
            <button
              type="button"
              className="btn btn-ghost min-h-11"
              aria-pressed={showArchived}
              onClick={onToggleArchived}
            >
              <Archive size={16} aria-hidden="true" />
              {showArchived ? "Hide archived" : `Archived (${archivedCount})`}
            </button>
          )}
          <SkillDropdown
            options={skillOptions}
            selected={skills}
            onChange={onSkillsChange}
          />
          <LocationSelect
            value={location}
            options={locationOptions}
            onChange={onLocationChange}
          />
          <GenderSelect value={gender} onChange={onGenderChange} />
          <SortSelect
            value={sort}
            options={sortOptions}
            onChange={onSortChange}
          />
        </div>
      </div>

      {showClear && (
        <div className="people-toolbar__chips">
          {skills.map((skill) => (
            <FilterChip
              key={skill}
              label={skill}
              onRemove={() => onSkillsChange(toggleSkill(skills, skill))}
            />
          ))}
          {location && (
            <FilterChip
              label={location}
              onRemove={() => onLocationChange("")}
            />
          )}
          {gender && (
            <FilterChip label={gender} onRemove={() => onGenderChange("")} />
          )}
          <button
            type="button"
            className="btn btn-ghost min-h-11"
            onClick={onClear}
          >
            Clear filters
          </button>
        </div>
      )}

      {sortChanged && sortLabel && (
        <p className="people-toolbar__sorted">Sorted by {sortLabel}</p>
      )}

      {resultSummary && (
        <p className="people-toolbar__count" aria-hidden="true">
          {resultSummary}
        </p>
      )}
      <p className="sr-only" aria-live="polite">
        {debouncedSummary}
      </p>

      {panel}
    </div>
  );
}
