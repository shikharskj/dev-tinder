import { useEffect, useState } from "react";
import { RefreshCw, Search, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../utils/api";
import { useAuth } from "../utils/auth";
import ConnectionRow from "../components/ConnectionRow";
import PeopleToolbar from "../components/PeopleToolbar";
import { usePeopleFilters } from "../utils/peopleFilters";
import { createSocketConnection } from "../utils/socketClient";

function connectionPerson(item) {
  return item.user;
}

function connectionDate(item) {
  return item.chat?.lastMessage?.createdAt || item.connectedAt;
}

const SORT_OPTIONS = [
  { value: "recent", label: "Latest activity" },
  { value: "oldest", label: "Oldest" },
  { value: "name", label: "Name" },
];

export default function Connections() {
  const { user: currentUser } = useAuth();
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [failedPhotos, setFailedPhotos] = useState(() => new Set());
  const [showArchived, setShowArchived] = useState(false);
  const filters = usePeopleFilters(
    connections,
    connectionPerson,
    connectionDate,
  );

  useEffect(() => {
    let active = true;

    api
      .get("/user/connections")
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

  useEffect(() => {
    const socket = createSocketConnection();
    const refreshConnections = () => setReloadKey((current) => current + 1);
    const updatePresence = ({
      userId,
      online,
      lastActiveAt,
      hidden = false,
    } = {}) => {
      setConnections((current) =>
        current.map((connection) =>
          String(connection.user?._id) === String(userId)
            ? {
                ...connection,
                presence: { online, lastActiveAt, hidden },
              }
            : connection,
        ),
      );
    };
    socket.on("chat:inbox-updated", refreshConnections);
    socket.on("presence:update", updatePresence);
    socket.on("chat:blocked", refreshConnections);
    socket.on("chat:unblocked", refreshConnections);
    return () => socket.disconnect();
  }, []);

  function retry() {
    setError("");
    setLoading(true);
    setReloadKey((current) => current + 1);
  }

  function handlePhotoError(userId) {
    setFailedPhotos((current) => new Set(current).add(userId));
  }

  async function updateChat(connection, updates) {
    const conversationId = connection.chat?.conversationId;
    if (!conversationId) return;
    const previous = connection.chat;
    const apply = (chat) =>
      setConnections((current) =>
        current.map((item) =>
          item.requestId === connection.requestId ? { ...item, chat } : item,
        ),
      );
    apply({ ...previous, ...updates });
    try {
      await api.patch(
        `/chat/conversations/${conversationId}/settings`,
        updates,
      );
    } catch (requestError) {
      apply(previous);
      setError(requestError.message);
    }
  }

  const resultSummary = filters.hasFilters
    ? `Showing ${filters.visibleItems.length} of ${filters.totalCount}`
    : "";
  const archivedCount = connections.filter(
    (connection) => connection.chat?.archived,
  ).length;
  const visibleConnections = filters.visibleItems.filter(
    (connection) => Boolean(connection.chat?.archived) === showArchived,
  );

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
            archivedCount={archivedCount}
            showArchived={showArchived}
            onToggleArchived={() => setShowArchived((current) => !current)}
          />

          {visibleConnections.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <Search size={23} aria-hidden="true" />
              </div>
              <h2>
                {showArchived
                  ? "No archived chats."
                  : "No connections match those filters."}
              </h2>
              <p>
                {showArchived
                  ? "Archived conversations will appear here."
                  : "Try a different name, location, or skill."}
              </p>
              <button
                className="btn btn-ghost mt-2"
                type="button"
                onClick={
                  showArchived
                    ? () => setShowArchived(false)
                    : filters.clearFilters
                }
              >
                {showArchived ? "Show connections" : "Clear filters"}
              </button>
            </div>
          ) : (
            <ul className="chat-list">
              {visibleConnections.map((connection) => (
                <ConnectionRow
                  key={connection.requestId}
                  connection={connection}
                  currentUserId={currentUser?._id}
                  photoFailed={failedPhotos.has(connection.user._id)}
                  onPhotoError={handlePhotoError}
                  onToggleMute={() =>
                    void updateChat(connection, {
                      muted: !connection.chat?.muted,
                    })
                  }
                  onToggleArchive={() =>
                    void updateChat(connection, {
                      archived: !connection.chat?.archived,
                    })
                  }
                />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
