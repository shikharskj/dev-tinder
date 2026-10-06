import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../utils/api";
import { mergeMessage } from "../utils/helpers";
import { createSocketConnection } from "../utils/socketClient";

export default function useChatSocket({
  chat,
  targetUserId,
  userId,
  enabled,
  setChat,
  setPresence,
  setMessages,
  setHasMore,
  setNextCursor,
  messagesContainerRef,
  shouldScrollToBottomRef,
  markRead,
  setError,
  socketRef,
  socketConnectedRef,
  socketActionsRef,
  setDraft,
}) {
  const [socketConnected, setSocketConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const typingTimerRef = useRef(null);
  const typingActiveRef = useRef(false);
  const remoteTypingTimerRef = useRef(null);
  const conversationId = chat?.conversationId;
  const readOnly = chat?.readOnly;

  const stopTyping = useCallback(() => {
    window.clearTimeout(typingTimerRef.current);
    if (typingActiveRef.current && conversationId) {
      socketRef.current?.emit("typing:stop", { conversationId });
      typingActiveRef.current = false;
    }
  }, [conversationId, socketRef]);

  useEffect(() => {
    const actions = socketActionsRef.current;
    actions.stopTyping = stopTyping;
    return () => {
      delete actions.stopTyping;
    };
  }, [socketActionsRef, stopTyping]);

  useEffect(() => {
    if (!enabled || !conversationId || readOnly) {
      return undefined;
    }

    const socket = createSocketConnection();
    socketRef.current = socket;

    const joinConversation = () => {
      socket.emit("conversation:join", { conversationId }, (result) => {
        const joined = Boolean(result?.ok);
        socketConnectedRef.current = joined;
        setSocketConnected(joined);

        if (result && !result.ok) {
          setChat((current) =>
            current
              ? { ...current, readOnly: Boolean(result.readOnly) }
              : current,
          );

          if (result.message) setError(result.message);
        } else if (result?.ok) {
          void api
            .get(`/chat/conversations/${conversationId}/messages`)
            .then(({ data }) => {
              setMessages((current) =>
                data.messages.reduce(
                  (merged, message) => mergeMessage(merged, message),
                  current,
                ),
              );
              setHasMore(Boolean(data.hasMore));
              setNextCursor(data.nextCursor || null);
              const container = messagesContainerRef.current;
              if (
                !container ||
                container.scrollHeight -
                  container.scrollTop -
                  container.clientHeight <
                  120
              ) {
                void markRead(conversationId);
              }
            })
            .catch((requestError) => setError(requestError.message));
        }
      });
    };

    const onMessage = ({
      conversationId: eventConversationId,
      message,
    } = {}) => {
      if (String(eventConversationId) !== String(conversationId) || !message) {
        return;
      }
      const container = messagesContainerRef.current;
      const isNearBottom =
        !container ||
        container.scrollHeight - container.scrollTop - container.clientHeight <
          120;
      shouldScrollToBottomRef.current =
        String(message.senderId) === String(userId) || isNearBottom;
      setMessages((current) => mergeMessage(current, message));

      if (
        String(message.senderId) !== String(userId) &&
        isNearBottom &&
        document.visibilityState === "visible"
      ) {
        void markRead(conversationId);
      }
    };

    const onRead = ({ conversationId: eventConversationId, readAt } = {}) => {
      if (String(eventConversationId) !== String(conversationId)) return;
      const readBoundary = new Date(readAt).getTime();
      setMessages((current) =>
        current.map((message) =>
          String(message.senderId) === String(userId) &&
          new Date(message.createdAt).getTime() <= readBoundary
            ? { ...message, readAt }
            : message,
        ),
      );
    };

    const onUpdated = ({
      conversationId: eventConversationId,
      message,
    } = {}) => {
      if (String(eventConversationId) !== String(conversationId) || !message) {
        return;
      }
      setMessages((current) =>
        current.map((item) =>
          String(item._id) === String(message._id)
            ? {
                ...item,
                ...message,
                reactions: message.reactions || [],
                readAt: item.readAt,
                deliveredAt: item.deliveredAt || message.deliveredAt,
              }
            : item,
        ),
      );
    };

    const onDelivered = ({
      conversationId: eventConversationId,
      deliveredAt,
    } = {}) => {
      if (String(eventConversationId) !== String(conversationId)) return;
      const boundary = new Date(deliveredAt).getTime();
      setMessages((current) =>
        current.map((message) =>
          String(message.senderId) === String(userId) &&
          !message.deliveredAt &&
          new Date(message.createdAt).getTime() <= boundary
            ? { ...message, deliveredAt }
            : message,
        ),
      );
    };

    const onTyping = ({
      conversationId: eventConversationId,
      userId: senderId,
      typing: isTyping,
    } = {}) => {
      if (
        String(eventConversationId) === String(conversationId) &&
        String(senderId) === String(targetUserId)
      ) {
        setTyping(Boolean(isTyping));
        window.clearTimeout(remoteTypingTimerRef.current);
        if (isTyping) {
          remoteTypingTimerRef.current = window.setTimeout(
            () => setTyping(false),
            4000,
          );
        }
      }
    };

    const onPresence = (update = {}) => {
      if (String(update.userId) !== String(targetUserId)) return;

      setPresence({
        online: Boolean(update.online),
        lastActiveAt: update.lastActiveAt || null,
        hidden: Boolean(update.hidden),
      });
    };

    const onBlocked = ({ byUserId } = {}) => {
      const blockedByMe = String(byUserId) === String(userId);
      setChat((current) =>
        current
          ? { ...current, readOnly: true, blocked: true, blockedByMe }
          : current,
      );
      if (!blockedByMe) {
        setError("This person has blocked this conversation.");
      }
    };

    const onUnblocked = async ({ byUserId } = {}) => {
      if (String(byUserId) !== String(targetUserId)) return;
      try {
        const { data } = await api.get(
          `/chat/conversations/with/${targetUserId}`,
        );
        setChat(data);
        setError("");
      } catch (requestError) {
        setError(requestError.message);
      }
    };

    const onConnectError = () => {
      socketConnectedRef.current = false;
      setSocketConnected(false);
    };
    const onDisconnect = () => {
      socketConnectedRef.current = false;
      setSocketConnected(false);
    };

    socket.on("connect", joinConversation);
    socket.on("connect_error", onConnectError);
    socket.on("disconnect", onDisconnect);
    socket.on("message:new", onMessage);
    socket.on("message:read", onRead);
    socket.on("message:delivered", onDelivered);
    socket.on("message:updated", onUpdated);
    socket.on("typing:update", onTyping);
    socket.on("presence:update", onPresence);
    socket.on("chat:blocked", onBlocked);
    socket.on("chat:unblocked", onUnblocked);

    if (socket.connected) joinConversation();

    return () => {
      stopTyping();
      window.clearTimeout(remoteTypingTimerRef.current);
      socket.emit("conversation:leave", { conversationId });
      socket.off("connect", joinConversation);
      socket.off("connect_error", onConnectError);
      socket.off("disconnect", onDisconnect);
      socket.off("message:new", onMessage);
      socket.off("message:read", onRead);
      socket.off("message:delivered", onDelivered);
      socket.off("message:updated", onUpdated);
      socket.off("typing:update", onTyping);
      socket.off("presence:update", onPresence);
      socket.off("chat:blocked", onBlocked);
      socket.off("chat:unblocked", onUnblocked);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [
    conversationId,
    enabled,
    markRead,
    messagesContainerRef,
    readOnly,
    setChat,
    setError,
    setHasMore,
    setMessages,
    setNextCursor,
    setPresence,
    shouldScrollToBottomRef,
    socketConnectedRef,
    socketRef,
    stopTyping,
    targetUserId,
    userId,
  ]);

  useEffect(() => {
    socketConnectedRef.current = enabled && !readOnly && socketConnected;
  }, [enabled, readOnly, socketConnected, socketConnectedRef]);

  function handleDraftChange(event) {
    const value = event.target.value;
    setDraft(value);

    if (!conversationId || readOnly || !socketConnected) return;

    if (!typingActiveRef.current) {
      socketRef.current?.emit("typing:start", { conversationId });
      typingActiveRef.current = true;
    }

    window.clearTimeout(typingTimerRef.current);
    typingTimerRef.current = window.setTimeout(stopTyping, 900);
  }

  return {
    socketConnected: enabled && !readOnly && socketConnected,
    typing,
    handleDraftChange,
  };
}
