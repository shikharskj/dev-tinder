import { useEffect, useState } from "react";
import {
  Check,
  CheckCircle2,
  Clock3,
  Inbox,
  MapPin,
  RefreshCw,
  Search,
  Send,
  X,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api";
import PeopleToolbar, { SkillFilterButtons } from "../components/PeopleToolbar";
import { usePeopleFilters } from "../peopleFilters";

function requestPerson(item) {
  return item.fromUserId;
}

function requestDate(item) {
  return item.createdAt;
}

const SORT_OPTIONS = [
  { value: "recent", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Name" },
];

export default function Requests() {
  const [requests, setRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sentLoading, setSentLoading] = useState(true);
  const [sentLoadError, setSentLoadError] = useState("");
  const [activeTab, setActiveTab] = useState("incoming");
  const [pendingActions, setPendingActions] = useState({});
  const [reviewErrors, setReviewErrors] = useState({});
  const [reviewNotice, setReviewNotice] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [failedPhotos, setFailedPhotos] = useState(() => new Set());
  const filters = usePeopleFilters(requests, requestPerson, requestDate);

  useEffect(() => {
    let active = true;

    api
      .get("/user/requests")
      .then(({ data }) => {
        if (active) {
          setRequests(Array.isArray(data) ? data : []);
          setLoadError("");
        }
      })
      .catch((requestError) => {
        if (active) setLoadError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    let active = true;

    api
      .get("/user/requests/sent")
      .then(({ data }) => {
        if (active) {
          setSentRequests(Array.isArray(data) ? data : []);
          setSentLoadError("");
        }
      })
      .catch((requestError) => {
        if (active) setSentLoadError(requestError.message);
      })
      .finally(() => {
        if (active) setSentLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  function retryLoading() {
    setLoadError("");
    setLoading(true);
    setReloadKey((current) => current + 1);
  }

  async function reviewRequest(requestId, status) {
    setPendingActions((current) => ({ ...current, [requestId]: status }));
    setReviewErrors((current) => ({ ...current, [requestId]: undefined }));
    setReviewNotice(null);

    try {
      await api.post(`/request/review/${status}/${requestId}`);
      const reviewedRequest = requests.find(
        (request) => request._id === requestId,
      );
      const firstName = reviewedRequest?.fromUserId?.firstName || "Request";
      setReviewNotice({ firstName, status });
      setRequests((current) =>
        current.filter((request) => request._id !== requestId),
      );
      setAnnouncement(
        status === "accepted"
          ? `Accepted request from ${firstName}. You’re now connected.`
          : `Declined request from ${firstName}.`,
      );
    } catch (requestError) {
      setReviewErrors((current) => ({
        ...current,
        [requestId]: { status, message: requestError.message },
      }));
    } finally {
      setPendingActions((current) => {
        const next = { ...current };
        delete next[requestId];
        return next;
      });
    }
  }

  function formatRequestDate(value) {
    if (!value || Number.isNaN(new Date(value).getTime())) return null;
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  }

  function handlePhotoError(userId) {
    setFailedPhotos((current) => new Set(current).add(userId));
  }

  const resultSummary = filters.hasFilters
    ? `Showing ${filters.visibleItems.length} of ${filters.totalCount}`
    : "";

  return (
    <section className="page-content" aria-labelledby="requests-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">People want to connect</p>
          <h1 id="requests-title">Requests</h1>
          <p>Take a look at the developers who reached out.</p>
        </div>
        {!loading && !loadError && (
          <span
            className="badge badge-secondary badge-lg"
            aria-label={`${filters.totalCount} incoming requests`}
          >
            {filters.totalCount}
          </span>
        )}
      </div>

      <div className="request-tabs" role="group" aria-label="Connection requests">
        <button
          className={`request-tabs__tab${activeTab === "incoming" ? " is-active" : ""}`}
          type="button"
          aria-pressed={activeTab === "incoming"}
          onClick={() => setActiveTab("incoming")}
        >
          <Inbox size={16} aria-hidden="true" />
          Received
          {!loading && <span className="badge badge-sm">{requests.length}</span>}
        </button>
        <button
          className={`request-tabs__tab${activeTab === "sent" ? " is-active" : ""}`}
          type="button"
          aria-pressed={activeTab === "sent"}
          onClick={() => setActiveTab("sent")}
        >
          <Send size={16} aria-hidden="true" />
          Sent
          {!sentLoading && (
            <span className="badge badge-sm">{sentRequests.length}</span>
          )}
        </button>
      </div>

      {activeTab === "incoming" && loadError && (
        <div className="alert alert-error mb-5" role="alert">
          <span>{loadError}</span>
          <button
            className="btn btn-ghost btn-sm ml-auto"
            type="button"
            onClick={retryLoading}
          >
            <RefreshCw size={16} aria-hidden="true" /> Retry
          </button>
        </div>
      )}

      {activeTab === "incoming" && reviewNotice && (
        <div className="alert alert-success mb-4" role="status">
          <span>
            {reviewNotice.status === "accepted"
              ? `You’re now connected with ${reviewNotice.firstName}.`
              : `You declined ${reviewNotice.firstName}’s request.`}
          </span>
          {reviewNotice.status === "accepted" && (
            <Link className="btn btn-ghost btn-sm ml-auto" to="/connections">
              View connection
            </Link>
          )}
        </div>
      )}

      {activeTab === "incoming" ? (
        <div
          id="incoming-requests-panel"
          aria-label="Received connection requests"
        >
      {loading ? (
        <div className="grid gap-3" aria-label="Loading requests">
          {[0, 1].map((item) => (
            <div key={item} className="skeleton h-36 w-full rounded-lg" />
          ))}
        </div>
      ) : filters.totalCount === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">
            <Inbox size={24} aria-hidden="true" />
          </div>
          <h2>No new requests yet.</h2>
          <p>
            When someone is interested in connecting, you’ll find them here.
          </p>
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
            searchLabel="Search requests"
          />

          {filters.visibleItems.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <Search size={23} aria-hidden="true" />
              </div>
              <h2>No requests match those filters.</h2>
              <p>Try another name, location, or skill.</p>
              <button
                className="btn btn-ghost mt-2"
                type="button"
                onClick={filters.clearFilters}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              {filters.visibleItems.map((request) => {
                const person = request.fromUserId;
                const pendingStatus = pendingActions[request._id];
                const reviewError = reviewErrors[request._id];
                const initials =
                  `${person.firstName?.[0] || ""}${person.lastName?.[0] || ""}`.toUpperCase();
                const requestedDate = formatRequestDate(request.createdAt);

                return (
                  <article
                    className="request-row"
                    key={request._id}
                    aria-busy={Boolean(pendingStatus)}
                  >
                    <div className="avatar placeholder shrink-0">
                      <div className="size-14 overflow-hidden rounded-full bg-secondary text-secondary-content sm:size-16">
                        {person.photoUrl && !failedPhotos.has(person._id) ? (
                          <img
                            src={person.photoUrl}
                            alt={`${person.firstName} ${person.lastName}`}
                            loading="lazy"
                            onError={() => handlePhotoError(person._id)}
                          />
                        ) : (
                          <span aria-hidden="true">{initials || "?"}</span>
                        )}
                      </div>
                    </div>
                    <div className="request-row__body">
                      <h2 className="truncate text-lg font-bold">
                        {person.firstName} {person.lastName}
                      </h2>
                      <p className="mt-1 flex items-center gap-1 text-sm text-base-content/65">
                        <MapPin size={14} aria-hidden="true" />
                        {person.location}
                        {person.age ? ` · ${person.age}` : ""}
                      </p>
                      {requestedDate && (
                        <time
                          className="request-row__date"
                          dateTime={request.createdAt}
                        >
                          Requested {requestedDate}
                        </time>
                      )}
                      {person.bio && (
                        <p className="mt-2 line-clamp-2 text-sm leading-relaxed">
                          {person.bio}
                        </p>
                      )}
                      <SkillFilterButtons
                        skills={person.skills}
                        selectedSkills={filters.skills}
                        onToggle={filters.toggleSelectedSkill}
                      />
                      {!!person.interests?.length && (
                        <p className="request-row__interests">
                          Interests: {person.interests.slice(0, 3).join(" · ")}
                        </p>
                      )}
                      {reviewError && (
                        <div className="alert alert-error mt-3" role="alert">
                          <span>{reviewError.message}</span>
                          <button
                            className="btn btn-ghost btn-xs ml-auto"
                            type="button"
                            onClick={() =>
                              reviewRequest(request._id, reviewError.status)
                            }
                          >
                            Retry
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="request-actions">
                      <button
                        className="btn btn-ghost btn-square min-h-11"
                        type="button"
                        onClick={() => reviewRequest(request._id, "rejected")}
                        disabled={Boolean(pendingStatus)}
                        aria-label={`Decline ${person.firstName}'s request`}
                        title="Decline"
                      >
                        {pendingStatus === "rejected" ? (
                          <span
                            className="loading loading-spinner"
                            aria-label="Declining request"
                          />
                        ) : (
                          <X size={20} aria-hidden="true" />
                        )}
                      </button>
                      <button
                        className="btn btn-primary btn-square min-h-11"
                        type="button"
                        onClick={() => reviewRequest(request._id, "accepted")}
                        disabled={Boolean(pendingStatus)}
                        aria-label={`Accept ${person.firstName}'s request`}
                        title="Accept"
                      >
                        {pendingStatus === "accepted" ? (
                          <span
                            className="loading loading-spinner"
                            aria-label="Accepting request"
                          />
                        ) : (
                          <Check size={20} aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
        </div>
      ) : (
        <div
          id="sent-requests-panel"
          aria-label="Sent connection requests"
        >
          {sentLoading ? (
            <div className="grid gap-3" aria-label="Loading sent requests">
              {[0, 1].map((item) => (
                <div key={item} className="skeleton h-28 w-full rounded-lg" />
              ))}
            </div>
          ) : sentLoadError ? (
            <div className="alert alert-error" role="alert">
              <span>{sentLoadError}</span>
              <button
                className="btn btn-ghost btn-sm ml-auto"
                type="button"
                onClick={() => {
                  setSentLoadError("");
                  setSentLoading(true);
                  setReloadKey((current) => current + 1);
                }}
              >
                <RefreshCw size={16} aria-hidden="true" /> Retry
              </button>
            </div>
          ) : sentRequests.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <Send size={23} aria-hidden="true" />
              </div>
              <h2>No sent requests yet.</h2>
              <p>When you reach out to someone, their response will show here.</p>
              <Link className="btn btn-primary mt-2" to="/feed">
                Discover developers
              </Link>
            </div>
          ) : (
            <div className="grid gap-3">
              {sentRequests.map((request) => {
                const person = request.toUserId;
                const initials =
                  `${person?.firstName?.[0] || ""}${person?.lastName?.[0] || ""}`.toUpperCase();
                const status = {
                  interested: {
                    label: "Awaiting response",
                    Icon: Clock3,
                    className: "request-status--pending",
                  },
                  accepted: {
                    label: "Accepted · you’re connected",
                    Icon: CheckCircle2,
                    className: "request-status--accepted",
                  },
                  rejected: {
                    label: "Declined",
                    Icon: XCircle,
                    className: "request-status--declined",
                  },
                }[request.status];
                const StatusIcon = status.Icon;

                return (
                  <article className="request-row sent-request-row" key={request._id}>
                    <div className="avatar placeholder shrink-0">
                      <div className="size-14 overflow-hidden rounded-full bg-secondary text-secondary-content">
                        {person?.photoUrl && !failedPhotos.has(person._id) ? (
                          <img
                            src={person.photoUrl}
                            alt={`${person.firstName} ${person.lastName}`}
                            loading="lazy"
                            onError={() => handlePhotoError(person._id)}
                          />
                        ) : (
                          <span aria-hidden="true">{initials || "?"}</span>
                        )}
                      </div>
                    </div>
                    <div className="request-row__body">
                      <h2 className="truncate text-lg font-bold">
                        {person?.firstName} {person?.lastName}
                      </h2>
                      <p className={`request-status ${status.className}`}>
                        <StatusIcon size={16} aria-hidden="true" />
                        {status.label}
                      </p>
                    </div>
                    {request.status === "accepted" && (
                      <Link className="btn btn-outline btn-sm" to="/connections">
                        View connection
                      </Link>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </section>
  );
}
