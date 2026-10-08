import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { api } from "../utils/api";
import { createClientMessageId, mergeMessage } from "../utils/helpers";

const MAX_MESSAGE_LENGTH = 4000;

export default function useChatMessages({
  chat,
  targetUserId,
  userId,
  setError,
  socketRef,
  socketActionsRef,
  socketConnectedRef,
}) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const messagesContainerRef = useRef(null);
  const shouldScrollToBottomRef = useRef(true);
  const isAtBottomRef = useRef(true);
  const pendingReadConversationsRef = useRef(new Set());
  const queuedReadConversationsRef = useRef(new Set());

  const markRead = useCallback(
    async (conversationId) => {
      if (pendingReadConversationsRef.current.has(conversationId)) {
        queuedReadConversationsRef.current.add(conversationId);
        return;
      }

      pendingReadConversationsRef.current.add(conversationId);

      try {
        do {
          queuedReadConversationsRef.current.delete(conversationId);
          const socket = socketRef.current;

          if (!socket?.connected || !socketConnectedRef.current) {
            await api.post(`/chat/conversations/${conversationId}/read`, {});
            continue;
          }

          try {
            const result = await new Promise((resolve, reject) => {
              socket
                .timeout(10_000)
                .emit(
                  "conversation:read",
                  { conversationId },
                  (timeout, ack) => {
                    if (timeout) {
                      const error = new Error("Read update timed out.");
                      error.code = "SOCKET_TIMEOUT";
                      reject(error);
                    } else {
                      resolve(ack);
                    }
                  },
                );
            });

            if (!result?.ok) {
              const error = new Error(
                result?.message || "Unable to mark messages read.",
              );

              error.acknowledged = true;
              throw error;
            }
          } catch (requestError) {
            if (
              requestError.acknowledged ||
              (requestError.code !== "SOCKET_TIMEOUT" && socket.connected)
            ) {
              throw requestError;
            }

            await api.post(`/chat/conversations/${conversationId}/read`, {});
          }
        } while (queuedReadConversationsRef.current.has(conversationId));
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        pendingReadConversationsRef.current.delete(conversationId);
        queuedReadConversationsRef.current.delete(conversationId);
      }
    },
    [setError, socketConnectedRef, socketRef],
  );

  const hasChat = Boolean(chat);

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      if (!chat?.conversationId) {
        setMessages([]);
        // Keep loading until the conversation arrives to avoid an empty-chat flash.
        if (hasChat) setLoadingHistory(false);

        return;
      }

      setLoadingHistory(true);
      setMessages([]);
      setHasMore(false);
      setNextCursor(null);

      try {
        const { data } = await api.get(
          `/chat/conversations/${chat.conversationId}/messages`,
        );

        if (!active) return;

        setMessages(data.messages || []);
        setHasMore(Boolean(data.hasMore));
        setNextCursor(data.nextCursor || null);
        shouldScrollToBottomRef.current = true;

        if (chat.readOnly) {
          void api
            .post(`/chat/conversations/${chat.conversationId}/read`, {})
            .catch((requestError) => {
              if (active) setError(requestError.message);
            });
        }
      } catch (requestError) {
        if (active) {
          setMessages([]);
          setError(requestError.message);
        }
      } finally {
        if (active) setLoadingHistory(false);
      }
    }

    void loadHistory();

    return () => {
      active = false;
    };
  }, [
    chat?.conversationId,
    chat?.readOnly,
    hasChat,
    setError,
    targetUserId,
    userId,
  ]);

  useLayoutEffect(() => {
    const container = messagesContainerRef.current;

    if (container && shouldScrollToBottomRef.current) {
      container.scrollTop = container.scrollHeight;
      shouldScrollToBottomRef.current = false;
      isAtBottomRef.current = true;
    }
  }, [messages]);

  const loadOlderMessages = useCallback(async () => {
    if (!chat?.conversationId || !nextCursor || loadingOlder) return;

    const container = messagesContainerRef.current;
    const previousHeight = container?.scrollHeight || 0;
    const previousTop = container?.scrollTop || 0;

    setLoadingOlder(true);

    try {
      const { data } = await api.get(
        `/chat/conversations/${chat.conversationId}/messages?before=${encodeURIComponent(nextCursor)}`,
      );

      setMessages((current) => [...data.messages, ...current]);
      setHasMore(Boolean(data.hasMore));
      setNextCursor(data.nextCursor || null);

      requestAnimationFrame(() => {
        if (!container) return;

        container.scrollTop =
          container.scrollHeight - previousHeight + previousTop;
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoadingOlder(false);
    }
  }, [chat, loadingOlder, nextCursor, setError]);

  const sendMessage = useCallback(
    async (messageToRetry = null) => {
      const text = (messageToRetry?.text ?? draft).trim();

      if (
        !chat?.conversationId ||
        chat.readOnly ||
        !text ||
        text.length > MAX_MESSAGE_LENGTH
      ) {
        return;
      }

      socketActionsRef.current.stopTyping?.();

      const clientMessageId =
        messageToRetry?.clientMessageId || createClientMessageId();

      const replyTarget = messageToRetry ? messageToRetry.replyTo : replyTo;
      const replyToId = replyTarget?._id || undefined;

      const outgoing = {
        conversationId: chat.conversationId,
        clientMessageId,
        text,
        replyToId,
      };

      if (!messageToRetry) {
        setDraft("");
        setReplyTo(null);
        
        setMessages((current) =>
          mergeMessage(current, {
            _id: clientMessageId,
            senderId: userId,
            clientMessageId,
            text,
            ...(replyTarget ? { replyTo: replyTarget } : {}),
            createdAt: new Date().toISOString(),
            pending: true,
          }),
        );
      } else {
        setMessages((current) =>
          current.map((message) =>
            message.clientMessageId === clientMessageId
              ? { ...message, failed: false, pending: true }
              : message,
          ),
        );
      }

      shouldScrollToBottomRef.current = true;

      try {
        let savedMessage;
        const socket = socketRef.current;

        if (socket?.connected && socketConnectedRef.current) {
          try {
            savedMessage = await new Promise((resolve, reject) => {
              socket
                .timeout(10_000)
                .emit("message:send", outgoing, (timeout, result) => {
                  if (timeout) {
                    reject(new Error("Message delivery timed out."));
                  } else if (!result?.ok) {
                    reject(
                      new Error(result?.message || "Unable to send message."),
                    );
                  } else {
                    resolve(result.message);
                  }
                });
            });
          } catch {
            const { data } = await api.post(
              `/chat/conversations/${chat.conversationId}/messages`,
              { clientMessageId, text, replyToId },
            );

            savedMessage = data;
          }
        } else {
          const { data } = await api.post(
            `/chat/conversations/${chat.conversationId}/messages`,
            { clientMessageId, text, replyToId },
          );

          savedMessage = data;
        }

        setMessages((current) =>
          mergeMessage(current, { ...savedMessage, pending: false }),
        );

        shouldScrollToBottomRef.current = true;
        setError("");
        
        void markRead(chat.conversationId);
      } catch (requestError) {
        setMessages((current) =>
          current.map((message) =>
            message.clientMessageId === clientMessageId
              ? { ...message, pending: false, failed: true }
              : message,
          ),
        );
        setError(requestError.message);
      }
    },
    [
      chat,
      draft,
      replyTo,
      markRead,
      setError,
      socketActionsRef,
      socketRef,
      socketConnectedRef,
      userId,
    ],
  );

  return {
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
  };
}
