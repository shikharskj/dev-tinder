import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, LockKeyhole } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import ChatHeader from "../components/ChatHeader";
import ChatSettings from "../components/ChatSettings";
import ContactSheet from "../components/ContactSheet";
import MediaViewer from "../components/MediaViewer";
import MessageActionSheet from "../components/MessageActionSheet";
import useMediaUpload from "../hooks/useMediaUpload";
import useMessageActions, {
  DELETE_FOR_EVERYONE_WINDOW_MS,
} from "../hooks/useMessageActions";
import MessageComposer from "../components/MessageComposer";
import MessageList from "../components/MessageList";
import ReportForm from "../components/ReportForm";
import useChatMessages from "../hooks/useChatMessages";
import useChatSocket from "../hooks/useChatSocket";
import useConversationActions from "../hooks/useConversationActions";
import useConversationData from "../hooks/useConversationData";
import useVisualViewportHeight from "../hooks/useVisualViewportHeight";
import { useAuth } from "../utils/auth";

const MAX_MESSAGE_LENGTH = 4000;

export default function ChatRoom() {
  const { targetUserId } = useParams();
  const { user } = useAuth();
  const userId = user?._id;
  const conversation = useConversationData(targetUserId, userId);
  const socketRef = useRef(null);
  const socketConnectedRef = useRef(false);
  const socketActionsRef = useRef({});
  const {
    messages,
    setMessages,
    draft,
    setDraft,
    replyTo,
    setReplyTo,
    loadingHistory,
    loadingOlder,
    hasMore,
    setHasMore,
    setNextCursor,
    messagesContainerRef,
    shouldScrollToBottomRef,
    isAtBottomRef,
    markRead,
    loadOlderMessages,
    sendMessage,
  } = useChatMessages({
    chat: conversation.chat,
    targetUserId,
    userId,
    setError: conversation.setError,
    socketRef,
    socketActionsRef,
    socketConnectedRef,
  });
  const [reportOpen, setReportOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  const [viewerMedia, setViewerMedia] = useState(null);
  const [showJump, setShowJump] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const [firstUnreadId, setFirstUnreadId] = useState(null);
  const lastMessageKeyRef = useRef(null);
  const unreadCapturedForRef = useRef(null);
  const conversationId = conversation.chat?.conversationId;
  const lastReadAt = conversation.chat?.lastReadAt;
  const [reportReason, setReportReason] = useState("other");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const {
    savingSettings,
    updateConversationSettings,
    updatePreferences,
    toggleBlock,
    submitReport,
  } = useConversationActions({
    chat: conversation.chat,
    setChat: conversation.setChat,
    targetUserId,
    setPresence: conversation.setPresence,
    setError: conversation.setError,
  });

  const { socketConnected, typing, handleDraftChange } = useChatSocket({
    chat: conversation.chat,
    targetUserId,
    userId,
    enabled:
      !conversation.loading &&
      !loadingHistory &&
      conversation.loadedTargetId === targetUserId,
    setChat: conversation.setChat,
    setPresence: conversation.setPresence,
    setMessages,
    setHasMore,
    setNextCursor,
    messagesContainerRef,
    shouldScrollToBottomRef,
    markRead,
    setError: conversation.setError,
    socketRef,
    socketConnectedRef,
    socketActionsRef,
    setDraft,
  });

  const { reactToMessage, deleteMessage } = useMessageActions({
    conversationId,
    setMessages,
    setError: conversation.setError,
  });

  const { mediaUploadsEnabled, sendMedia, cancelUpload } = useMediaUpload({
    chat: conversation.chat,
    userId,
    replyTo,
    setReplyTo,
    draft,
    setDraft,
    setMessages,
    setError: conversation.setError,
    shouldScrollToBottomRef,
  });

  function startReply(message) {
    if (message.deleted || conversation.chat?.readOnly) return;
    setReplyTo({
      _id: message._id,
      senderId: message.senderId,
      text:
        message.text ||
        (message.attachment
          ? message.attachment.kind === "video"
            ? "🎥 Video"
            : "📷 Photo"
          : ""),
    });
    document.querySelector(".chat-composer__input")?.focus();
  }

  function jumpToMessage(messageId) {
    const element = document.getElementById(`msg-${messageId}`);

    if (!element) {
      conversation.setError(
        "That message is older than what’s loaded. Load older messages first.",
      );

      return;
    }

    element.scrollIntoView({ block: "center", behavior: "smooth" });
    element.classList.add("is-flash");
    window.setTimeout(() => element.classList.remove("is-flash"), 1400);
  }

  async function copyMessage(message) {
    if (!message.text) return;

    try {
      await navigator.clipboard.writeText(message.text);
    } catch {
      conversation.setError("Couldn’t copy the message.");
    }
  }

  const keepPinnedToBottom = useCallback(() => {
    const container = messagesContainerRef.current;

    if (container && isAtBottomRef.current) {
      container.scrollTop = container.scrollHeight;
    }

  }, [messagesContainerRef, isAtBottomRef]);
  useVisualViewportHeight(keepPinnedToBottom);

  // Remember where unread messages began when the conversation first opened.
  useEffect(() => {
    if (loadingHistory || !conversationId) return;
    if (unreadCapturedForRef.current === conversationId) return;

    unreadCapturedForRef.current = conversationId;

    const boundary = lastReadAt ? new Date(lastReadAt).getTime() : 0;

    const firstUnread = messages.find(
      (message) =>
        String(message.senderId) !== String(userId) &&
        new Date(message.createdAt).getTime() > boundary,
    );

    setFirstUnreadId(firstUnread?._id || null);
  }, [loadingHistory, conversationId, lastReadAt, messages, userId]);

  // The divider has done its job once the user has had time to read or has replied.
  useEffect(() => {
    if (!firstUnreadId) return undefined;

    const timer = setTimeout(() => setFirstUnreadId(null), 5000);

    return () => clearTimeout(timer);
  }, [firstUnreadId]);

  const repliedSinceOpen =
    String(messages[messages.length - 1]?.senderId) === String(userId);

  // Count incoming messages that arrive while scrolled away from the bottom.
  useEffect(() => {
    const last = messages[messages.length - 1];
    const key = last?._id || last?.clientMessageId;

    if (
      lastMessageKeyRef.current &&
      key &&
      key !== lastMessageKeyRef.current &&
      String(last.senderId) !== String(userId) &&
      !isAtBottomRef.current
    ) {
      setNewCount((count) => count + 1);
    }

    lastMessageKeyRef.current = key || null;
  }, [messages, userId, isAtBottomRef]);

  function scrollToLatest() {
    const container = messagesContainerRef.current;

    container?.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    setNewCount(0);

    if (conversationId) void markRead(conversationId);
  }

  function handleMessagesScroll(event) {
    const container = event.currentTarget;

    const distance =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    const atBottom = distance < 40;
    setShowJump(distance > 160);

    if (atBottom) setNewCount(0);

    const reachedBottom = atBottom && !isAtBottomRef.current;
    isAtBottomRef.current = atBottom;

    if (
      reachedBottom &&
      document.visibilityState === "visible" &&
      conversation.chat?.conversationId
    ) {
      void markRead(conversation.chat.conversationId);
    }
    
    if (container.scrollTop < 50 && hasMore && !loadingOlder) {
      void loadOlderMessages();
    }
  }

  function handleDraftKeyDown(event) {
    // On touch devices Enter inserts a newline; the send button sends.
    const touchInput = window.matchMedia?.("(pointer: coarse)").matches;
    if (event.key === "Enter" && !event.shiftKey && !touchInput) {
      event.preventDefault();
      void sendMessage();
    }
  }

  async function handleReportSubmit(event) {
    event.preventDefault();
    const succeeded = await submitReport(reportReason, reportDetails);
    if (succeeded) {
      setReportSubmitted(true);
      setReportOpen(false);
    }
  }

  if (
    conversation.loading ||
    conversation.loadedTargetId !== targetUserId ||
    (conversation.chat && loadingHistory)
  ) {
    return (
      <section
        className="page-content"
        aria-label="Loading conversation"
        aria-busy="true"
      >
        <div className="chat-layout" role="status">
          <span className="sr-only">Loading conversation…</span>
          <div className="chat-header" aria-hidden="true">
            <div className="skeleton size-10 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3.5 w-32 rounded" />
              <div className="skeleton h-3 w-20 rounded" />
            </div>
          </div>
          <div
            className="chat-skeleton__messages flex min-h-0 flex-1 flex-col justify-end gap-3 p-4"
            aria-hidden="true"
          >
            <div className="skeleton h-10 w-3/5 rounded-2xl" />
            <div className="skeleton ml-auto h-10 w-2/5 rounded-2xl" />
            <div className="skeleton h-14 w-1/2 rounded-2xl" />
            <div className="skeleton ml-auto h-10 w-3/5 rounded-2xl" />
          </div>
          <div className="chat-skeleton__composer p-3" aria-hidden="true">
            <div className="skeleton h-11 w-full rounded-full" />
          </div>
        </div>
      </section>
    );
  }

  if (conversation.error && !conversation.chat) {
    return (
      <section className="page-content">
        <div className="alert alert-error" role="alert">
          <span>{conversation.error}</span>
          <button
            className="btn btn-ghost btn-sm"
            type="button"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
          <Link className="btn btn-ghost btn-sm" to="/connections">
            Back to connections
          </Link>
        </div>
      </section>
    );
  }

  if (!conversation.chat) return null;

  const { chat, presence, error, setError } = conversation;
  const target = chat.targetUser;

  return (
    <section className="page-content" aria-labelledby="chat-title">
      {error && (
        <div className="alert alert-error mb-3" role="alert">
          <span>{error}</span>
          <button
            className="btn btn-ghost btn-xs ml-auto"
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss chat error"
          >
            Dismiss
          </button>
        </div>
      )}
      {chat.readOnly && (
        <div className="alert alert-warning mb-3" role="status">
          <LockKeyhole size={18} aria-hidden="true" />
          <span>
            {chat.blocked
              ? "This conversation is blocked. Message history remains available."
              : "This conversation is read-only because you are no longer connected."}
          </span>
        </div>
      )}
      <div className="chat-layout">
        <ChatHeader
          target={target}
          presence={presence}
          socketConnected={socketConnected}
          readOnly={chat.readOnly}
          muted={chat.muted}
          archived={chat.archived}
          blockedByMe={chat.blockedByMe}
          typing={typing}
          onOpenContact={() => setContactOpen(true)}
          reportSubmitted={reportSubmitted}
          savingSettings={savingSettings}
          onMuteToggle={() =>
            void updateConversationSettings({ muted: !chat.muted })
          }
          onArchiveToggle={() =>
            void updateConversationSettings({ archived: !chat.archived })
          }
          onBlockToggle={() => void toggleBlock()}
          onReportToggle={() => setReportOpen((current) => !current)}
        >
          <ChatSettings
            preferences={chat.preferences}
            onPreferenceChange={(updates) => void updatePreferences(updates)}
          />
        </ChatHeader>

        {reportOpen && (
          <ReportForm
            reason={reportReason}
            details={reportDetails}
            onReasonChange={setReportReason}
            onDetailsChange={setReportDetails}
            onCancel={() => setReportOpen(false)}
            onSubmit={handleReportSubmit}
          />
        )}

        <div className="chat-messages-wrap">
          <MessageList
            targetName={target?.firstName}
            targetPhotoUrl={target?.photoUrl}
            targetInitials={`${target?.firstName?.[0] || ""}${target?.lastName?.[0] || ""}`.toUpperCase()}
            messages={messages}
            currentUserId={userId}
            firstUnreadId={repliedSinceOpen ? null : firstUnreadId}
            historyLimited={chat.historyLimited}
            historyWindowDays={chat.historyWindowDays}
            hasMore={hasMore}
            loadingOlder={loadingOlder}
            messagesContainerRef={messagesContainerRef}
            onScroll={handleMessagesScroll}
            onLoadOlder={() => void loadOlderMessages()}
            onRetry={(message) => void sendMessage(message)}
            onOpenActions={(message) =>
              setActionMessage({ ...message, openedAt: Date.now() })
            }
            onReply={startReply}
            onReact={(message, emoji) => void reactToMessage(message, emoji)}
            onJumpTo={jumpToMessage}
            onOpenMedia={(attachment, message) =>
              setViewerMedia({
                ...attachment,
                message,
                canDelete:
                  String(message.senderId) === String(userId) &&
                  Date.now() - new Date(message.createdAt).getTime() <
                    DELETE_FOR_EVERYONE_WINDOW_MS,
              })
            }
            onCancelUpload={cancelUpload}
          />
          {showJump && (
            <button
              className="chat-jump btn btn-circle btn-sm"
              type="button"
              onClick={scrollToLatest}
              aria-label={
                newCount
                  ? `Scroll to latest, ${newCount} new messages`
                  : "Scroll to latest message"
              }
            >
              <ArrowDown size={18} aria-hidden="true" />
              {newCount > 0 && (
                <span className="chat-jump__count">{newCount}</span>
              )}
            </button>
          )}
        </div>

        <MessageComposer
          readOnly={chat.readOnly}
          blockedByMe={chat.blockedByMe}
          draft={draft}
          maxMessageLength={MAX_MESSAGE_LENGTH}
          onDraftChange={handleDraftChange}
          onDraftKeyDown={handleDraftKeyDown}
          onSend={() => {
            navigator.vibrate?.(10);
            void sendMessage();
          }}
          onUnblock={() => void toggleBlock()}
          mediaUploadsEnabled={mediaUploadsEnabled}
          onPickMedia={(file) => void sendMedia(file)}
          replyTo={replyTo}
          replyAuthor={
            replyTo && String(replyTo.senderId) === String(userId)
              ? "You"
              : target?.firstName
          }
          onCancelReply={() => setReplyTo(null)}
        />
      </div>
      <MessageActionSheet
        message={actionMessage}
        own={String(actionMessage?.senderId) === String(userId)}
        currentUserId={userId}
        readOnly={chat.readOnly}
        onClose={() => setActionMessage(null)}
        onReply={() => {
          startReply(actionMessage);
          setActionMessage(null);
        }}
        onCopy={() => {
          void copyMessage(actionMessage);
          setActionMessage(null);
        }}
        onReact={(emoji) => {
          void reactToMessage(actionMessage, emoji);
          setActionMessage(null);
        }}
        onDelete={(scope) => {
          void deleteMessage(actionMessage, scope);
          setActionMessage(null);
        }}
      />
      <MediaViewer
        media={viewerMedia}
        onClose={() => setViewerMedia(null)}
        onDelete={
          viewerMedia?.canDelete && !chat.readOnly
            ? () => {
                if (
                  window.confirm(
                    `Delete this ${viewerMedia.kind === "video" ? "video" : "photo"} for everyone? This can’t be undone.`,
                  )
                ) {
                  void deleteMessage(viewerMedia.message, "everyone");
                  setViewerMedia(null);
                }
              }
            : undefined
        }
      />
      <ContactSheet
        open={contactOpen}
        target={target}
        onClose={() => setContactOpen(false)}
      />
      {reportSubmitted && (
        <p className="mt-3 text-sm text-success" role="status">
          Your report was submitted for review.
        </p>
      )}
    </section>
  );
}
