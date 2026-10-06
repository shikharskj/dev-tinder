import { useEffect, useState } from "react";
import { api } from "../utils/api";

const EMPTY_PRESENCE = {
  online: false,
  lastActiveAt: null,
  hidden: false,
};

export default function useConversationData(targetUserId, userId) {
  const [chat, setChat] = useState(null);
  const [presence, setPresence] = useState(EMPTY_PRESENCE);
  const [loading, setLoading] = useState(true);
  const [loadedTargetId, setLoadedTargetId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadConversation() {
      setLoading(true);
      setLoadedTargetId(null);
      setChat(null);
      setError("");

      try {
        const { data } = await api.get(
          `/chat/conversations/with/${targetUserId}`,
        );

        if (!active) return;

        setChat(data);
        setPresence(data.presence || EMPTY_PRESENCE);
        setLoadedTargetId(targetUserId);
      } catch (requestError) {
        if (active) {
          setChat(null);
          setError(requestError.message);
          setLoadedTargetId(targetUserId);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadConversation();

    return () => {
      active = false;
    };
  }, [targetUserId, userId]);

  return {
    chat,
    setChat,
    presence,
    setPresence,
    loading,
    loadedTargetId,
    error,
    setError,
  };
}
