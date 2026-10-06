import { useMemo, useState } from "react";

const NAME_COMPARE = { sensitivity: "base" };

export const GENDER_OPTIONS = ["Male", "Female", "Other"];

export function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase();
}

export function personSearchText(person) {
  if (!person) return "";

  return [
    person.firstName,
    person.lastName,
    person.location,
    person.bio,
    ...(person.skills || []),
    ...(person.interests || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
}

export function matchesQuery(person, query) {
  const tokens = normalizeText(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return true;

  const haystack = personSearchText(person);
  return tokens.every((token) => haystack.includes(token));
}

export function collectOptions(values) {
  const byKey = new Map();

  for (const value of values) {
    if (typeof value !== "string") continue;
    const label = value.trim();
    const key = label.toLocaleLowerCase();
    if (!key) continue;

    const existing = byKey.get(key);
    if (existing) existing.count += 1;
    else byKey.set(key, { key, label, count: 1 });
  }

  return [...byKey.values()].sort((left, right) =>
    left.label.localeCompare(right.label, undefined, NAME_COMPARE),
  );
}

export function canonicalLabel(options, value) {
  const key = normalizeText(value);
  return options.find((option) => option.key === key)?.label || String(value ?? "");
}

export function isSkillSelected(selectedSkills, skill) {
  const key = normalizeText(skill);
  return selectedSkills.some((item) => normalizeText(item) === key);
}

export function toggleSkill(selectedSkills, skill) {
  const key = normalizeText(skill);
  if (selectedSkills.some((item) => normalizeText(item) === key)) {
    return selectedSkills.filter((item) => normalizeText(item) !== key);
  }
  return [...selectedSkills, skill];
}

export function matchesSkills(person, selectedSkills) {
  if (!selectedSkills.length) return true;
  const owned = new Set(
    (person.skills || []).map((skill) => normalizeText(skill)),
  );
  return selectedSkills.some((skill) => owned.has(normalizeText(skill)));
}

export function matchesLocation(person, location) {
  if (!location) return true;
  return normalizeText(person.location) === normalizeText(location);
}

export function matchesGender(person, gender) {
  if (!gender) return true;
  return normalizeText(person.gender) === normalizeText(gender);
}

export function personMatchesFilters(person, filters) {
  if (!person) return false;
  return (
    matchesQuery(person, filters.query) &&
    matchesSkills(person, filters.skills) &&
    matchesLocation(person, filters.location) &&
    matchesGender(person, filters.gender)
  );
}

export function compareByName(left, right) {
  const lastName = (left?.lastName || "").localeCompare(
    right?.lastName || "",
    undefined,
    NAME_COMPARE,
  );
  if (lastName !== 0) return lastName;
  return (left?.firstName || "").localeCompare(
    right?.firstName || "",
    undefined,
    NAME_COMPARE,
  );
}

function timeValue(value) {
  const time = new Date(value || 0).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function compareByDate(leftValue, rightValue, direction) {
  const difference = timeValue(leftValue) - timeValue(rightValue);
  return direction === "oldest" ? difference : -difference;
}

export function activeFacetCount({ skills = [], location = "", gender = "" }) {
  return skills.length + (location ? 1 : 0) + (gender ? 1 : 0);
}

export function hasActiveFilters({ query = "", skills = [], location = "", gender = "" }) {
  return Boolean(normalizeText(query) || skills.length || location || gender);
}

export function filterPeople(
  items,
  { getPerson, getDate, query, skills, location, gender, sort },
) {
  const filters = { query, skills, location, gender };
  const visible = items.filter((item) =>
    personMatchesFilters(getPerson(item), filters),
  );

  visible.sort((left, right) => {
    if (sort === "name") {
      return compareByName(getPerson(left), getPerson(right));
    }
    return compareByDate(
      getDate(left),
      getDate(right),
      sort === "oldest" ? "oldest" : "recent",
    );
  });

  return visible;
}

export function usePeopleFilters(items, getPerson, getDate) {
  const [query, setQuery] = useState("");
  const [skills, setSkills] = useState([]);
  const [location, setLocation] = useState("");
  const [gender, setGender] = useState("");
  const [sort, setSort] = useState("recent");

  const people = useMemo(
    () => items.map((item) => getPerson(item)).filter(Boolean),
    [items, getPerson],
  );
  const skillOptions = useMemo(
    () => collectOptions(people.flatMap((person) => person.skills || [])),
    [people],
  );
  const locationOptions = useMemo(
    () => collectOptions(people.map((person) => person.location)),
    [people],
  );
  const optionKey = `${skillOptions.map((option) => option.key).join("\n")}\u0000${locationOptions.map((option) => option.key).join("\n")}`;
  const [seenOptionKey, setSeenOptionKey] = useState(optionKey);

  if (optionKey !== seenOptionKey) {
    setSeenOptionKey(optionKey);
    setSkills((current) => {
      const next = current.filter((skill) =>
        skillOptions.some((option) => option.key === normalizeText(skill)),
      );
      return next.length === current.length ? current : next;
    });
    setLocation((current) => {
      if (!current) return current;
      return locationOptions.some(
        (option) => option.key === normalizeText(current),
      )
        ? current
        : "";
    });
  }

  const visibleItems = useMemo(
    () =>
      filterPeople(items, {
        getPerson,
        getDate,
        query,
        skills,
        location,
        gender,
        sort,
      }),
    [items, getPerson, getDate, query, skills, location, gender, sort],
  );

  function clearFilters() {
    setQuery("");
    setSkills([]);
    setLocation("");
    setGender("");
  }

  function toggleSelectedSkill(skill) {
    const label = canonicalLabel(skillOptions, skill);
    setSkills((current) => toggleSkill(current, label));
  }

  return {
    query,
    setQuery,
    skills,
    setSkills,
    location,
    setLocation,
    gender,
    setGender,
    sort,
    setSort,
    skillOptions,
    locationOptions,
    visibleItems,
    totalCount: people.length,
    hasFilters: hasActiveFilters({ query, skills, location, gender }),
    clearFilters,
    toggleSelectedSkill,
  };
}
