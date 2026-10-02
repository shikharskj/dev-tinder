import { useEffect, useState } from "react";
import { MapPin, RefreshCw, Search, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api";
import PeopleToolbar, { SkillFilterButtons } from "../components/PeopleToolbar";
import { usePeopleFilters } from "../peopleFilters";

function connectionPerson(item) {
  return item.user;
}

function connectionDate(item) {
  return item.connectedAt;
}

const SORT_OPTIONS = [
  { value: "recent", label: "Most recent" },
  { value: "oldest", label: "Oldest" },
  { value: "name", label: "Name" },
];

export default function Connections() {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [failedPhotos, setFailedPhotos] = useState(() => new Set());
  const filters = usePeopleFilters(
    connections,
    connectionPerson,
    connectionDate,
  );

  useEffect(() => {
    let active = true;

    api
      .get("/api/user/connections")
      .then(({ data }) => {
        if (active) {
          setConnections(Array.isArray(data) ? data : []);
          setError("");
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  function retry() {
    setError("");
    setLoading(true);
    setReloadKey((current) => current + 1);
  }

  function handlePhotoError(userId) {
    setFailedPhotos((current) => new Set(current).add(userId));
  }

  function formatConnectedDate(value) {
    if (!value || Number.isNaN(new Date(value).getTime())) return null;
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  }

  const resultSummary = filters.hasFilters
    ? `Showing ${filters.visibleItems.length} of ${filters.totalCount}`
    : "";

  return (
    <section className="page-content" aria-labelledby="connections-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Your growing circle</p>
          <h1 id="connections-title">Connections</h1>
          <p>People who are ready to build a conversation with you.</p>
        </div>
        {!loading && !error && (
          <span
            className="badge badge-secondary badge-lg"
            aria-label={`${filters.totalCount} connections`}
          >
            {filters.totalCount}
          </span>
        )}
      </div>

      {error && (
        <div className="alert alert-error mb-5" role="alert">
          <span>{error}</span>
          <button
            className="btn btn-ghost btn-sm ml-auto"
            type="button"
            onClick={retry}
          >
            <RefreshCw size={16} aria-hidden="true" /> Retry
          </button>
        </div>
      )}

      {loading ? (
        <div
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          aria-label="Loading connections"
        >
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="skeleton h-40 w-full rounded-lg" />
          ))}
        </div>
      ) : filters.totalCount === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">
            <UsersRound size={24} aria-hidden="true" />
          </div>
          <h2>Your circle starts with one hello.</h2>
          <p>When a request is accepted, you’ll see your connection here.</p>
          <Link className="btn btn-primary mt-2" to="/feed">
            Discover developers
          </Link>
        </div>
      ) : (
        <>
          <PeopleToolbar
            query={filters.query}
            onQueryChange={filters.setQuery}
            skills={filters.skills}
            onSkillsChange={filters.setSkills}
            skillOptions={filters.skillOptions}
            location={filters.location}
            onLocationChange={filters.setLocation}
            locationOptions={filters.locationOptions}
            gender={filters.gender}
            onGenderChange={filters.setGender}
            sort={filters.sort}
            onSortChange={filters.setSort}
            sortOptions={SORT_OPTIONS}
            onClear={filters.clearFilters}
            resultSummary={resultSummary}
            searchLabel="Search connections"
          />

          {filters.visibleItems.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <Search size={23} aria-hidden="true" />
              </div>
              <h2>No connections match those filters.</h2>
              <p>Try a different name, location, or skill.</p>
              <button
                className="btn btn-ghost mt-2"
                type="button"
                onClick={filters.clearFilters}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {filters.visibleItems.map(({ requestId, connectedAt, user }) => {
                const initials =
                  `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase();
                const connectedDate = formatConnectedDate(connectedAt);
                const photoFailed = failedPhotos.has(user._id);

                return (
                  <article className="connection-card" key={requestId}>
                    <div className="avatar placeholder shrink-0">
                      <div className="size-14 overflow-hidden rounded-full bg-secondary text-secondary-content">
                        {user.photoUrl && !photoFailed ? (
                          <img
                            src={user.photoUrl}
                            alt={`${user.firstName} ${user.lastName}`}
                            loading="lazy"
                            onError={() => handlePhotoError(user._id)}
                          />
                        ) : (
                          <span aria-hidden="true">{initials || "?"}</span>
                        )}
                      </div>
                    </div>
                    <div className="connection-card__body">
                      <h2 className="truncate text-lg font-bold">
                        {user.firstName} {user.lastName}
                      </h2>
                      <p className="mt-1 flex items-center gap-1 text-sm text-base-content/65">
                        <MapPin size={14} aria-hidden="true" />
                        {user.location}
                        {user.age ? ` · ${user.age}` : ""}
                      </p>
                      {user.bio && (
                        <p className="connection-card__bio">{user.bio}</p>
                      )}
                      <SkillFilterButtons
                        skills={user.skills}
                        selectedSkills={filters.skills}
                        onToggle={filters.toggleSelectedSkill}
                      />
                      {!!user.interests?.length && (
                        <p className="connection-card__interests">
                          Interests: {user.interests.slice(0, 3).join(" · ")}
                        </p>
                      )}
                      {connectedDate && (
                        <time
                          className="connection-card__date"
                          dateTime={connectedAt}
                        >
                          Connected {connectedDate}
                        </time>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}
