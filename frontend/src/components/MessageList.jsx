import { Archive, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { Fragment, useMemo } from "react";
import { buildTimeline } from "../utils/chatView";
import MessageBubble from "./MessageBubble";

export default function MessageList({
  targetName,
  targetPhotoUrl,
  targetInitials,
  messages,
  currentUserId,
  firstUnreadId,
  historyLimited,
  historyWindowDays,
  hasMore,
  loadingOlder,
  messagesContainerRef,
  onScroll,
  onLoadOlder,
  onRetry,
  onOpenActions,
  onReply,
  onReact,
  onJumpTo,
  onOpenImage,
}) {
  const timeline = useMemo(
    () => buildTimeline(messages, { currentUserId, firstUnreadId }),
    [messages, currentUserId, firstUnreadId],
  );

  const lastOwnId = useMemo(() => {
    const lastOwn = [...messages]
      .reverse()
      .find(
        (message) =>
          String(message.senderId) === String(currentUserId) &&
          !message.deleted &&
          !message.pending &&
          !message.failed,
      );
    return lastOwn?.readAt ? lastOwn._id : null;
  }, [messages, currentUserId]);

  return (
    <div
      className="chat-messages"
      ref={messagesContainerRef}
      role="log"
      aria-label={`Messages with ${targetName || "connection"}`}
      aria-live="polite"
      aria-relevant="additions"
      onScroll={onScroll}
    >
      {hasMore && (
        <button
          className="btn btn-ghost btn-sm chat-messages__older"
          type="button"
          onClick={onLoadOlder}
          disabled={loadingOlder}
        >
          {loadingOlder ? "Loading…" : "Load older messages"}
        </button>
      )}
      {historyLimited && messages.length > 0 && (
        <p className="alert alert-info text-sm">
          Your Basic plan shows the latest {historyWindowDays} days. Upgrade to
          Elite for your full history.
          <Link className="link ml-auto" to="/enroll-premium">
            Explore Elite
          </Link>
        </p>
      )}
      {!messages.length && historyLimited ? (
        <div className="empty-state min-h-48">
          <div className="empty-state__icon">
            <Archive size={22} aria-hidden="true" />
          </div>
          <h2>Older messages are outside your history window.</h2>
          <p>
            Basic includes the latest {historyWindowDays} days of history. Elite
            keeps your full conversation history.
          </p>
          <Link className="btn btn-primary" to="/enroll-premium">
            Explore Elite
          </Link>
        </div>
      ) : !messages.length ? (
        <div className="empty-state min-h-48">
          <div className="empty-state__icon">
            <Send size={22} aria-hidden="true" />
          </div>
          <h2>Start the conversation</h2>
          <p>Say hello and share what you’re excited to build.</p>
        </div>
      ) : null}
      {timeline.map((item) => {
        if (item.type === "date") {
          return (
            <div className="chat-day" key={item.key}>
              <span>{item.label}</span>
            </div>
          );
        }
        if (item.type === "unread") {
          return (
            <div className="chat-unread" key={item.key} role="separator">
              <span>Unread messages</span>
            </div>
          );
        }
        const showSeen =
          lastOwnId && String(item.message._id) === String(lastOwnId);
        return (
          <Fragment key={item.key}>
            {item.own ? (
              <MessageBubble
                message={item.message}
                own={item.own}
                groupStart={item.groupStart}
                groupEnd={item.groupEnd}
                currentUserId={currentUserId}
                senderName={targetName}
                onRetry={onRetry}
                onOpenActions={onOpenActions}
                onReply={onReply}
                onReact={onReact}
                onJumpTo={onJumpTo}
                onOpenImage={onOpenImage}
              />
            ) : (
              <div className="msg-row">
                <span
                  className={`msg-row__avatar${item.groupStart ? "" : " is-spacer"}`}
                  aria-hidden="true"
                >
                  {item.groupStart &&
                    (targetPhotoUrl ? (
                      <img src={targetPhotoUrl} alt="" />
                    ) : (
                      <span>{targetInitials}</span>
                    ))}
                </span>
                <MessageBubble
                  message={item.message}
                  own={item.own}
                  groupStart={item.groupStart}
                  groupEnd={item.groupEnd}
                  currentUserId={currentUserId}
                  senderName={targetName}
                  onRetry={onRetry}
                  onOpenActions={onOpenActions}
                  onReply={onReply}
                  onReact={onReact}
                  onJumpTo={onJumpTo}
                  onOpenImage={onOpenImage}
                />
              </div>
            )}
            {showSeen && (
              <span className="chat-seen" role="status">
                Seen
              </span>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
