import { memo, useMemo, useRef, useState } from "react";
import {
  Ban,
  Check,
  CheckCheck,
  ChevronDown,
  Clock,
  Play,
  X,
} from "lucide-react";
import { formatMessageTime } from "../utils/helpers";
import LinkPreview from "./LinkPreview";

function formatDuration(seconds) {
  if (!seconds) return "";
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function MediaThumb({ attachment, pending, progress, onOpen, onCancel }) {
  const isVideo = attachment.kind === "video";
  const poster = attachment.thumbUrl || attachment.posterUrl;
  const percent = Math.round((progress || 0) * 100);
  const [loaded, setLoaded] = useState(false);
  const [broken, setBroken] = useState(false);
  const ratio =
    attachment.width && attachment.height
      ? Math.min(1.78, Math.max(0.8, attachment.width / attachment.height))
      : 1.33;

  return (
    <div
      className={`chat-media${loaded || broken ? "" : " is-loading"}`}
      style={{ aspectRatio: ratio }}
    >
      <button
        type="button"
        className="chat-media__open"
        onClick={onOpen}
        disabled={pending}
        aria-label={isVideo ? "Play video" : "Open photo"}
      >
        {isVideo && !poster ? (
          <video
            src={`${attachment.url}#t=0.1`}
            preload="metadata"
            muted
            playsInline
            onLoadedData={() => setLoaded(true)}
            onError={() => setBroken(true)}
          />
        ) : (
          <img
            src={poster || attachment.url}
            alt={isVideo ? "Video preview" : "Shared photo"}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => setBroken(true)}
          />
        )}
        {isVideo && !pending && (
          <span className="chat-media__play" aria-hidden="true">
            <Play size={22} fill="currentColor" />
          </span>
        )}
        {isVideo && attachment.duration > 0 && !pending && (
          <span className="chat-media__duration">
            {formatDuration(attachment.duration)}
          </span>
        )}
      </button>
      {broken && <span className="chat-media__broken">Media unavailable</span>}
      {pending && (
        <div className="chat-media__progress" role="status">
          <span className="sr-only">Uploading {percent}%</span>
          <span
            className="radial-progress text-primary-content"
            style={{
              "--value": percent,
              "--size": "2.75rem",
              "--thickness": "3px",
            }}
            aria-hidden="true"
          >
            {percent}
          </span>
          <button
            type="button"
            className="btn btn-circle btn-xs chat-media__cancel"
            onClick={onCancel}
            aria-label="Cancel upload"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

function Linkified({ text }) {
  return text.split(/(https?:\/\/[^\s<>"']+)/gi).map((part, index) =>
    /^https?:\/\//i.test(part) ? (
      <a
        key={index}
        className="chat-link"
        href={part}
        target="_blank"
        rel="noopener noreferrer nofollow"
        onPointerDown={(event) => event.stopPropagation()}
      >
        {part}
      </a>
    ) : (
      part
    ),
  );
}

const LONG_PRESS_MS = 450;
const SWIPE_REPLY_PX = 56;

function groupReactions(reactions = []) {
  const counts = new Map();
  reactions.forEach(({ emoji, userId }) => {
    const entry = counts.get(emoji) || { emoji, count: 0, userIds: [] };
    entry.count += 1;
    entry.userIds.push(String(userId));
    counts.set(emoji, entry);
  });
  return [...counts.values()];
}

function MessageBubble({
  message,
  own,
  currentUserId,
  groupStart,
  groupEnd,
  senderName,
  onRetry,
  onOpenActions,
  onReply,
  onReact,
  onJumpTo,
  onOpenMedia,
  onCancelUpload,
}) {
  const [offset, setOffset] = useState(0);
  const gesture = useRef(null);
  const interactive = !message.pending && !message.failed;
  const reactions = useMemo(
    () => groupReactions(message.reactions),
    [message.reactions],
  );

  function clearPress() {
    window.clearTimeout(gesture.current?.timer);
  }

  function onPointerDown(event) {
    if (!interactive || event.pointerType === "mouse") return;
    gesture.current = {
      x: event.clientX,
      y: event.clientY,
      swiping: false,
      pressed: false,
      timer: window.setTimeout(() => {
        if (!gesture.current || gesture.current.swiping) return;
        gesture.current.pressed = true;
        navigator.vibrate?.(15);
        onOpenActions(message);
      }, LONG_PRESS_MS),
    };
  }

  function onPointerMove(event) {
    const current = gesture.current;
    if (!current || current.pressed) return;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;

    if (!current.swiping) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) clearPress();
      if (dx > 12 && dx > Math.abs(dy) * 1.5 && !message.deleted) {
        current.swiping = true;
      } else {
        return;
      }
    }
    setOffset(Math.min(72, Math.max(0, dx)));
  }

  function onPointerEnd() {
    const current = gesture.current;
    if (!current) return;
    clearPress();
    if (current.swiping && offset >= SWIPE_REPLY_PX) {
      navigator.vibrate?.(10);
      onReply(message);
    }
    gesture.current = null;
    setOffset(0);
  }

  const className = `chat-message${message.pending ? " is-pending" : ""}${own ? " is-own" : ""}${message.failed ? " is-failed" : ""}${groupStart ? " is-group-start" : ""}${groupEnd ? " is-group-end" : ""}${message.deleted ? " is-deleted" : ""}${message.attachment?.url && !message.deleted ? (message.text ? " has-media" : " is-media") : ""}${reactions.length ? " has-reactions" : ""}`;

  return (
    <article
      id={message._id ? `msg-${message._id}` : undefined}
      className={className}
      style={offset ? { transform: `translateX(${offset}px)` } : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onContextMenu={(event) => {
        if (!interactive) return;
        event.preventDefault();
        onOpenActions(message);
      }}
    >
      {interactive && (
        <button
          className="chat-message__menu"
          type="button"
          onClick={() => onOpenActions(message)}
          aria-label="Message options"
        >
          <ChevronDown size={16} aria-hidden="true" />
        </button>
      )}
      {message.replyTo && (
        <button
          type="button"
          className="chat-quote"
          onClick={() => onJumpTo(message.replyTo._id)}
          disabled={message.replyTo.unavailable}
        >
          <span className="chat-quote__author">
            {String(message.replyTo.senderId) === String(currentUserId)
              ? "You"
              : senderName}
          </span>
          <span className="chat-quote__text">
            {message.replyTo.unavailable
              ? "Message unavailable"
              : message.replyTo.deleted
                ? "This message was deleted"
                : message.replyTo.text}
          </span>
        </button>
      )}
      {message.deleted ? (
        <span className="chat-message__text chat-message__deleted">
          <Ban size={14} aria-hidden="true" />
          {own ? "You deleted this message" : "This message was deleted"}
        </span>
      ) : (
        <>
          {message.attachment?.url && (
            <MediaThumb
              attachment={message.attachment}
              pending={message.pending}
              progress={message.uploadProgress}
              onOpen={() => onOpenMedia(message.attachment, message)}
              onCancel={() => onCancelUpload?.(message.clientMessageId)}
            />
          )}
          {message.text && (
            <span className="chat-message__text">
              <Linkified text={message.text} />
            </span>
          )}
          {message.text && !message.pending && (
            <LinkPreview text={message.text} />
          )}
        </>
      )}
      <span className="chat-message__meta">
        <time dateTime={message.createdAt}>
          {formatMessageTime(message.createdAt)}
        </time>
        {own &&
          (message.failed ? (
            <button
              className="chat-message__retry"
              type="button"
              onClick={() => onRetry(message)}
            >
              Failed · Retry
            </button>
          ) : message.pending ? (
            <Clock size={13} aria-label="Sending" />
          ) : message.readAt ? (
            <CheckCheck
              className="chat-tick is-read"
              size={15}
              aria-label="Read"
            />
          ) : message.deliveredAt ? (
            <CheckCheck
              className="chat-tick"
              size={15}
              aria-label="Delivered"
            />
          ) : (
            <Check className="chat-tick" size={15} aria-label="Sent" />
          ))}
      </span>
      {reactions.length > 0 && (
        <span className="chat-reactions">
          {reactions.map(({ emoji, count, userIds }) => (
            <button
              key={emoji}
              type="button"
              className={`chat-reaction${userIds.includes(String(currentUserId)) ? " is-mine" : ""}`}
              onClick={() => onReact(message, emoji)}
              aria-label={`${emoji} ${count}`}
            >
              {emoji}
              {count > 1 && <span>{count}</span>}
            </button>
          ))}
        </span>
      )}
    </article>
  );
}

export default memo(MessageBubble);
