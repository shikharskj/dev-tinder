const PROFILE_FIELDS = [
  { key: "photoUrl", label: "Add a profile photo" },
  { key: "bio", label: "Write a short introduction" },
  { key: "skills", label: "Add your skills" },
  { key: "interests", label: "Share your interests" },
];

export function getProfileCompletion(profile = {}) {
  const completed = PROFILE_FIELDS.filter(({ key }) =>
    Array.isArray(profile[key])
      ? profile[key].length > 0
      : Boolean(profile[key]?.trim()),
  );

  return {
    completedCount: completed.length,
    totalCount: PROFILE_FIELDS.length,
    percent: Math.round((completed.length / PROFILE_FIELDS.length) * 100),
    missing: PROFILE_FIELDS.filter(
      ({ key }) =>
        !(
          Array.isArray(profile[key])
            ? profile[key].length > 0
            : Boolean(profile[key]?.trim())
        ),
    ),
  };
}

export function getCommonGround(profile = {}, candidate = {}) {
  const matches = [];
  const seen = new Set();

  for (const field of ["skills", "interests"]) {
    const candidateValues = new Set(
      (candidate[field] || []).map((value) => value.trim().toLocaleLowerCase()),
    );

    for (const value of profile[field] || []) {
      const normalized = value.trim().toLocaleLowerCase();
      if (candidateValues.has(normalized) && !seen.has(normalized)) {
        matches.push(value);
        seen.add(normalized);
      }
    }
  }

  return matches.slice(0, 3);
}
