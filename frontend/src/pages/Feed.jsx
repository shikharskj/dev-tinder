import { useEffect, useRef, useState } from "react";
import { Heart, MapPin, RotateCw, X } from "lucide-react";
import { api } from "../api";

const PAGE_SIZE = 10;
const SWIPE_THRESHOLD = 96;
const FLICK_THRESHOLD = 0.65;
const MIN_FLICK_DISTANCE = 40;
const VELOCITY_WINDOW = 120;
const EXIT_DURATION = 240;
const PROMOTION_DURATION = 240;

const Feed = () => {
  const [people, setPeople] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exitDirection, setExitDirection] = useState(0);
  const [pendingDirection, setPendingDirection] = useState(0);
  const [promoting, setPromoting] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const seenIds = useRef(new Set());
  const gesture = useRef(null);
  const exitTimer = useRef(null);
  const promotionTimer = useRef(null);

  useEffect(() => {
    let active = true;

    api
      .get(`/feed?page=1&limit=${PAGE_SIZE}`)
      .then(({ data }) => {
        if (!active) return;
        const results = Array.isArray(data) ? data : [];
        const freshPeople = results.filter((person) => {
          const personId = String(person._id);
          if (seenIds.current.has(personId)) return false;
          seenIds.current.add(personId);
          return true;
        });

        setPeople((current) => [...current, ...freshPeople]);
        setHasMore(results.length === PAGE_SIZE && freshPeople.length > 0);
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

  useEffect(
    () => () => {
      window.clearTimeout(exitTimer.current);
      window.clearTimeout(promotionTimer.current);
    },
    [],
  );

  async function sendRequest(status) {
    const activePerson = people[0];
    if (!activePerson || busy) return;

    const direction = status === "interested" ? 1 : -1;
    setBusy(true);
    setPendingDirection(direction);
    setOffsetX(0);
    setError("");

    try {
      await api.post(`/request/send/${status}/${activePerson._id}`);
      try {
        if (typeof navigator.vibrate === "function") navigator.vibrate(12);
      } catch {
        // Haptics are optional and must never block the swipe action.
      }
      setAnnouncement(
        status === "interested"
          ? `You connected with ${activePerson.firstName}.`
          : `Passed on ${activePerson.firstName}.`,
      );
      setPendingDirection(0);
      setExitDirection(direction);
      setOffsetX(direction * (window.innerWidth + 320));

      exitTimer.current = window.setTimeout(() => {
        setPeople((current) => current.slice(1));
        setOffsetX(0);
        setExitDirection(0);
        setBusy(false);
        setPromoting(true);
        promotionTimer.current = window.setTimeout(
          () => setPromoting(false),
          PROMOTION_DURATION,
        );

        if (people.length === 1 && hasMore) {
          setLoading(true);
          setReloadKey((value) => value + 1);
        }
      }, EXIT_DURATION);
    } catch (requestError) {
      setError(requestError.message);
      setOffsetX(0);
      setExitDirection(0);
      setPendingDirection(0);
      setBusy(false);
    }
  }

  function refreshFeed() {
    seenIds.current.clear();
    setPeople([]);
    setHasMore(false);
    setError("");
    setLoading(true);
    setReloadKey((value) => value + 1);
  }

  function handlePointerDown(event) {
    if (busy || event.button !== 0 || event.target.closest("button, a")) return;

    gesture.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      samples: [{ x: event.clientX, time: event.timeStamp }],
      cancelled: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function handlePointerMove(event) {
    if (
      !gesture.current ||
      gesture.current.pointerId !== event.pointerId ||
      gesture.current.cancelled
    )
      return;

    const deltaX = event.clientX - gesture.current.startX;
    const deltaY = event.clientY - gesture.current.startY;
    if (Math.abs(deltaY) > Math.abs(deltaX) * 1.15) {
      gesture.current.cancelled = true;
      return;
    }

    gesture.current.samples = gesture.current.samples
      .filter((sample) => event.timeStamp - sample.time <= VELOCITY_WINDOW)
      .concat({ x: event.clientX, time: event.timeStamp });
    setOffsetX(deltaX);
  }

  function finishGesture(event) {
    if (!gesture.current || gesture.current.pointerId !== event.pointerId)
      return;

    const deltaX = event.clientX - gesture.current.startX;
    const deltaY = event.clientY - gesture.current.startY;
    const samples = gesture.current.samples.filter(
      (sample) => event.timeStamp - sample.time <= VELOCITY_WINDOW,
    );
    const firstSample = samples[0];
    const lastSample = { x: event.clientX, time: event.timeStamp };
    const elapsed = firstSample
      ? Math.max(1, lastSample.time - firstSample.time)
      : 1;
    const velocityX = firstSample
      ? (lastSample.x - firstSample.x) / elapsed
      : 0;
    const wasCancelled = gesture.current.cancelled;
    gesture.current = null;
    setDragging(false);

    if (
      !wasCancelled &&
      Math.abs(deltaX) > Math.abs(deltaY) * 1.15 &&
      (Math.abs(deltaX) >= SWIPE_THRESHOLD ||
        (Math.abs(deltaX) >= MIN_FLICK_DISTANCE &&
          Math.abs(velocityX) >= FLICK_THRESHOLD))
    ) {
      sendRequest(deltaX > 0 ? "interested" : "ignored");
    } else {
      setOffsetX(0);
    }
  }

  function cancelGesture() {
    gesture.current = null;
    setDragging(false);
    setOffsetX(0);
  }

  function handleCardKeyDown(event) {
    if (event.target.closest("button, a, input, select, textarea")) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      sendRequest("interested");
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      sendRequest("ignored");
    }
  }

  const activePerson = people[0];
  const swipeStrength = Math.min(Math.abs(offsetX) / SWIPE_THRESHOLD, 1);
  const activeDirection =
    pendingDirection || exitDirection || (offsetX >= 0 ? 1 : -1);
  const initials = activePerson
    ? `${activePerson.firstName?.[0] || ""}${activePerson.lastName?.[0] || ""}`.toUpperCase()
    : "";

  return (
    <section className="page-content" aria-labelledby="feed-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Your next collaborator</p>
          <h1 id="feed-title">Discover</h1>
          <p>Find someone whose curiosity matches yours.</p>
        </div>
        <button
          className="btn btn-ghost btn-square"
          type="button"
          onClick={refreshFeed}
          aria-label="Refresh feed"
          title="Refresh feed"
          disabled={loading || busy}
        >
          <RotateCw size={19} aria-hidden="true" />
        </button>
      </div>

      {error && (
        <div className="alert alert-error mb-5" role="alert">
          {error}
          {!activePerson && !loading && (
            <button className="btn btn-ghost btn-sm" onClick={refreshFeed}>
              Try again
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="swipe-loading" aria-label="Loading profiles">
          <div className="card candidate-card swipe-loading-card">
            <div className="skeleton aspect-3/2 w-full" />
            <div className="card-body gap-3">
              <div className="skeleton h-5 w-2/3" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-12 w-full" />
            </div>
          </div>
        </div>
      ) : !activePerson ? (
        <div className="empty-state">
          <div className="empty-state__icon">
            <Heart size={24} aria-hidden="true" />
          </div>
          <h2>You’re all caught up.</h2>
          <p>Check back soon for more developers to meet.</p>
        </div>
      ) : (
        <>
          <div className="swipe-progress" aria-live="polite">
            <span>
              {people.length} {people.length === 1 ? "profile" : "profiles"} in
              this batch
            </span>
            <span>{hasMore ? "More profiles available" : ""}</span>
          </div>
          <div className={`swipe-deck${dragging ? " is-dragging" : ""}`}>
            {people.length > 1 && (
              <div
                className="swipe-card-back"
                style={{
                  "--stack-scale": 0.94 + swipeStrength * 0.06,
                  "--stack-y": `${10 * (1 - swipeStrength)}px`,
                  "--stack-opacity": 0.72 + swipeStrength * 0.28,
                }}
                aria-hidden="true"
              />
            )}
            <article
              key={activePerson._id}
              className={`card candidate-card swipe-card${dragging ? " is-dragging" : ""}${exitDirection ? " is-exiting" : ""}${promoting ? " is-promoting" : ""}${busy ? " is-pending" : ""}`}
              style={{
                "--swipe-x": `${offsetX}px`,
                "--swipe-rotation": `${Math.max(-18, Math.min(18, offsetX / 18))}deg`,
              }}
              tabIndex={0}
              aria-busy={busy}
              aria-label={`${activePerson.firstName} ${activePerson.lastName}. Use left arrow to pass or right arrow to connect.`}
              onKeyDown={handleCardKeyDown}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={finishGesture}
              onPointerCancel={cancelGesture}
            >
              <span
                className={`swipe-stamp ${activeDirection > 0 ? "swipe-stamp--connect" : "swipe-stamp--pass"}${busy ? " swipe-stamp--pending" : ""}`}
                style={{ opacity: busy || exitDirection ? 1 : swipeStrength }}
                aria-hidden="true"
              >
                {activeDirection > 0 ? (
                  <Heart
                    size={44}
                    strokeWidth={2.5}
                    fill={
                      pendingDirection > 0 || exitDirection > 0
                        ? "currentColor"
                        : "none"
                    }
                  />
                ) : (
                  <X size={46} strokeWidth={2.7} />
                )}
              </span>
              <figure className="candidate-photo">
                {activePerson.photoUrl ? (
                  <img
                    src={activePerson.photoUrl}
                    alt={`${activePerson.firstName} ${activePerson.lastName}`}
                    draggable="false"
                  />
                ) : (
                  <div
                    className="candidate-photo__placeholder"
                    aria-hidden="true"
                  >
                    {initials}
                  </div>
                )}
              </figure>
              <div className="card-body gap-3 p-5 sm:p-6">
                <div>
                  <h2 className="card-title text-2xl">
                    {activePerson.firstName} {activePerson.lastName}
                  </h2>
                  <p className="mt-1 flex items-center gap-1 text-sm text-base-content/65">
                    <MapPin size={15} aria-hidden="true" />
                    {activePerson.location}
                    {activePerson.age ? ` · ${activePerson.age}` : ""}
                  </p>
                </div>
                {activePerson.bio && (
                  <p className="text-sm leading-relaxed">{activePerson.bio}</p>
                )}
                {!!activePerson.skills?.length && (
                  <div className="flex flex-wrap gap-2">
                    {activePerson.skills.map((skill) => (
                      <span className="badge badge-outline" key={skill}>
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
                {!!activePerson.interests?.length && (
                  <p className="text-xs text-base-content/65">
                    Into {activePerson.interests.slice(0, 3).join(" · ")}
                  </p>
                )}
              </div>
            </article>
          </div>

          <div className="swipe-actions" aria-label="Profile actions">
            <button
              className="btn btn-outline btn-circle swipe-action swipe-action--pass"
              type="button"
              onClick={() => sendRequest("ignored")}
              disabled={busy}
              aria-label="Pass on this profile"
              title="Pass"
            >
              {busy ? (
                <span
                  className="loading loading-spinner"
                  aria-label="Sending choice"
                />
              ) : (
                <X size={24} aria-hidden="true" />
              )}
            </button>
            <button
              className="btn btn-primary btn-circle swipe-action swipe-action--connect"
              type="button"
              onClick={() => sendRequest("interested")}
              disabled={busy}
              aria-label="Connect with this profile"
              title="Connect"
            >
              {busy ? (
                <span
                  className="loading loading-spinner"
                  aria-label="Sending choice"
                />
              ) : (
                <Heart size={24} aria-hidden="true" />
              )}
            </button>
          </div>
        </>
      )}
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </section>
  );
};

export default Feed;
