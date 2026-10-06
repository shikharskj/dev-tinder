import {
  Archive,
  ArrowLeft,
  BadgeCheck,
  Bell,
  BellOff,
  Flag,
  MoreVertical,
  Shield,
  ShieldOff,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatLastActive } from "../utils/helpers";

export default function ChatHeader({
  target,
  presence,
  socketConnected,
  readOnly,
  muted,
  archived,
  blockedByMe,
  typing,
  onOpenContact,
  reportSubmitted,
  savingSettings,
  onMuteToggle,
  onArchiveToggle,
  onBlockToggle,
  onReportToggle,
  children,
}) {
  const [reconnectDelayed, setReconnectDelayed] = useState(false);

  // Avoid flashing "Reconnecting…" during the initial socket handshake.
  useEffect(() => {
    if (socketConnected || readOnly) return undefined;
    const timer = setTimeout(() => setReconnectDelayed(true), 2000);
    return () => {
      clearTimeout(timer);
      setReconnectDelayed(false);
    };
  }, [socketConnected, readOnly]);
  const showReconnecting = reconnectDelayed && !socketConnected && !readOnly;

  const targetInitials =
    `${target?.firstName?.[0] || ""}${target?.lastName?.[0] || ""}`.toUpperCase();

  return (
    <header className="chat-header">
      <Link
        to="/connections"
        className="btn btn-ghost btn-square btn-sm"
        aria-label="Back to connections"
      >
        <ArrowLeft size={19} aria-hidden="true" />
      </Link>
      <div className="chat-header__profile">
        <button
          type="button"
          className="avatar placeholder shrink-0"
          onClick={onOpenContact}
          aria-label={`Open ${target?.firstName || "contact"} info`}
        >
          <div className="size-11 overflow-hidden rounded-full bg-secondary text-secondary-content">
            {target?.photoUrl ? (
              <img
                src={target.photoUrl}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              <span aria-hidden="true">
                {targetInitials || <UserRound size={18} />}
              </span>
            )}
          </div>
        </button>
        <div className="chat-header__identity text-left">
          <h1 id="chat-title">
            <button
              type="button"
              className="chat-header__name"
              onClick={onOpenContact}
            >
              {target?.firstName} {target?.lastName}
            </button>
            {target?.usagePlan === "Elite" && (
              <BadgeCheck
                className="ml-1 inline text-amber-600"
                size={15}
                aria-label="Elite member"
              />
            )}
          </h1>
          <p
            className={`chat-presence${presence.online ? " is-online" : ""}${typing ? " is-typing" : ""}`}
            aria-live="polite"
          >
            {typing
              ? "typing…"
              : presence.hidden
                ? "Activity hidden"
                : presence.online
                  ? "Online"
                  : formatLastActive(presence.lastActiveAt)}
            {showReconnecting ? " · Reconnecting…" : ""}
          </p>
        </div>
      </div>
      <details className="dropdown dropdown-end chat-header__menu">
        <summary
          className="btn btn-ghost btn-square btn-sm"
          aria-label="Conversation options"
        >
          <MoreVertical size={19} aria-hidden="true" />
        </summary>
        <div className="dropdown-content z-40 w-64 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg">
          <ul className="menu p-0">
            <li>
              <button
                type="button"
                disabled={savingSettings}
                onClick={onMuteToggle}
                aria-pressed={muted}
              >
                {muted ? <BellOff size={16} /> : <Bell size={16} />}
                {muted ? "Unmute" : "Mute"}
              </button>
            </li>
            <li>
              <button
                type="button"
                disabled={savingSettings}
                onClick={onArchiveToggle}
                aria-pressed={archived}
              >
                <Archive size={16} />
                {archived ? "Unarchive" : "Archive"}
              </button>
            </li>
            <li>
              <button type="button" onClick={onBlockToggle}>
                {blockedByMe ? <ShieldOff size={16} /> : <Shield size={16} />}
                {blockedByMe ? "Unblock" : "Block"}
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={onReportToggle}
                disabled={reportSubmitted}
              >
                <Flag size={16} />
                {reportSubmitted ? "Reported" : "Report"}
              </button>
            </li>
          </ul>
          {children}
        </div>
      </details>
    </header>
  );
}
