const PROFILE_FIELDS = [
  { key: "photoUrl", label: "Add a profile photo" },
  { key: "bio", label: "Write a short introduction" },
  { key: "skills", label: "Add your skills" },
  { key: "interests", label: "Share your interests" },
];

const DEFAULT_PROFILE_BIO =
  "This is my bio. I am a passionate individual who loves to learn and grow. I am always looking for new opportunities to challenge myself and expand my horizons.";
const DEFAULT_PROFILE_PHOTO =
  "https://i.pinimg.com/1200x/0b/97/6f/0b976f0a7aa1aa43870e1812eee5a55d.jpg";

export function hasMemberWrittenBio(profile = {}) {
  return Boolean(
    profile.bio?.trim() && profile.bio.trim() !== DEFAULT_PROFILE_BIO,
  );
}

export function hasMemberAddedPhoto(profile = {}) {
  return Boolean(profile.photoUrl && profile.photoUrl !== DEFAULT_PROFILE_PHOTO);
}

function hasProfileDetail(profile, key) {
  if (key === "photoUrl") return hasMemberAddedPhoto(profile);
  if (key === "bio") return hasMemberWrittenBio(profile);
  return Array.isArray(profile[key])
    ? profile[key].length > 0
    : Boolean(profile[key]?.trim());
}

export function getProfileCompletion(profile = {}) {
  const completed = PROFILE_FIELDS.filter(({ key }) =>
    hasProfileDetail(profile, key),
  );

  return {
    completedCount: completed.length,
    totalCount: PROFILE_FIELDS.length,
    percent: Math.round((completed.length / PROFILE_FIELDS.length) * 100),
    missing: PROFILE_FIELDS.filter(
      ({ key }) => !hasProfileDetail(profile, key),
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
      const key = `${field}:${normalized}`;
      if (candidateValues.has(normalized) && !seen.has(key)) {
        matches.push({ field, value });
        seen.add(key);
      }
    }
  }

  return matches.slice(0, 3);
}
