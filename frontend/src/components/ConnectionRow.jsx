import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Archive,
  ArchiveRestore,
  Bell,
  BellOff,
  MoreVertical,
} from "lucide-react";
import { formatListTime } from "../utils/chatView";

export default function ConnectionRow({
  connection,
  currentUserId,
  photoFailed,
  onPhotoError,
  onToggleMute,
  onToggleArchive,
}) {
  const { user, chat, presence, connectedAt } = connection;
  const menuRef = useRef(null);

  const initials =
    `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase();
  const last = chat?.lastMessage;
  const hasLast = Boolean(last?.text);
  const unread = chat?.unreadCount || 0;
  const own = hasLast && String(last.senderId) === String(currentUserId);
  const when = formatListTime(hasLast ? last.createdAt : connectedAt);

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

  function runAction(action) {
    if (menuRef.current) menuRef.current.open = false;
    action();
  }

  return (
    <li className="chat-row">
      <Link
        className="chat-row__content"
        to={`/chat/${user._id}`}
        draggable={false}
      >
        <span className="chat-row__avatar">
          <span className="avatar placeholder">
            <span className="size-12 overflow-hidden rounded-full bg-secondary text-secondary-content">
              {user.photoUrl && !photoFailed ? (
                <img
                  src={user.photoUrl}
                  alt=""
                  loading="lazy"
                  draggable={false}
                  onError={() => onPhotoError(user._id)}
                />
              ) : (
                <span aria-hidden="true">{initials || "?"}</span>
              )}
            </span>
          </span>
          {presence?.online && !presence?.hidden && (
            <span className="chat-row__online" aria-label="Online" />
          )}
        </span>
        <span className="chat-row__body">
          <span className="chat-row__top">
            <span className="chat-row__name">
              {user.firstName} {user.lastName}
            </span>
            <time
              className={`chat-row__time${unread ? " is-unread" : ""}`}
              dateTime={hasLast ? last.createdAt : connectedAt}
            >
              {when}
            </time>
          </span>
          <span className="chat-row__bottom">
            <span className={`chat-row__preview${unread ? " is-unread" : ""}`}>
              {chat?.blocked
                ? chat.blockedByMe
                  ? "Blocked by you"
                  : "Unavailable"
                : hasLast
                  ? `${own ? "You: " : ""}${last.text}`
                  : "Say hello 👋"}
            </span>
            {chat?.muted && (
              <BellOff
                className="chat-row__muted"
                size={14}
                aria-label="Muted"
              />
            )}
            {unread > 0 && (
              <span
                className="chat-row__badge"
                aria-label={`${unread} unread messages`}
              >
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </span>
        </span>
      </Link>
      <details className="dropdown dropdown-end chat-row__menu" ref={menuRef}>
        <summary
          className="btn btn-ghost btn-circle btn-sm"
          aria-label={`Options for ${user.firstName} ${user.lastName}`}
        >
          <MoreVertical size={18} aria-hidden="true" />
        </summary>
        <ul className="dropdown-content menu z-40 w-44 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg">
          <li>
            <button
              type="button"
              onClick={() => runAction(onToggleMute)}
              disabled={!chat?.conversationId}
            >
              {chat?.muted ? (
                <Bell size={16} aria-hidden="true" />
              ) : (
                <BellOff size={16} aria-hidden="true" />
              )}
              {chat?.muted ? "Unmute" : "Mute"}
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => runAction(onToggleArchive)}
              disabled={!chat?.conversationId}
            >
              {chat?.archived ? (
                <ArchiveRestore size={16} aria-hidden="true" />
              ) : (
                <Archive size={16} aria-hidden="true" />
              )}
              {chat?.archived ? "Unarchive" : "Archive"}
            </button>
          </li>
        </ul>
      </details>
    </li>
  );
}
