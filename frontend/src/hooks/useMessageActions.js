import { useCallback } from "react";
import { api } from "../utils/api";

export const DELETE_FOR_EVERYONE_WINDOW_MS = 60 * 60 * 1000;

export default function useMessageActions({
  conversationId,
  setMessages,
  setError,
}) {
  const reactToMessage = useCallback(
    async (message, emoji) => {
      try {
        const { data } = await api.put(
          `/chat/conversations/${conversationId}/messages/${message._id}/reaction`,
          { emoji },
        );
        setMessages((current) =>
          current.map((item) =>
            String(item._id) === String(data._id)
              ? { ...item, reactions: data.reactions || [] }
              : item,
          ),
        );
      } catch (requestError) {
        setError(requestError.message);
      }
    },
    [conversationId, setMessages, setError],
  );

  const deleteMessage = useCallback(
    async (message, scope) => {
      try {
        const { data } = await api.delete(
          `/chat/conversations/${conversationId}/messages/${message._id}?scope=${scope}`,
        );
        setMessages((current) =>
          scope === "me"
            ? current.filter((item) => String(item._id) !== String(message._id))
            : current.map((item) =>
                String(item._id) === String(message._id)
                  ? {
                      ...item,
                      text: "",
                      deleted: true,
                      reactions: [],
                      ...(data?.message || {}),
                      readAt: item.readAt,
                    }
                  : item,
              ),
        );
      } catch (requestError) {
        setError(requestError.message);
      }
    },
    [conversationId, setMessages, setError],
  );

  return { reactToMessage, deleteMessage };
}
