import { useState } from "react";
import { api } from "../utils/api";

export default function useConversationActions({
  chat,
  setChat,
  targetUserId,
  setPresence,
  setError,
}) {
  const [savingSettings, setSavingSettings] = useState(false);

  async function updateConversationSettings(updates) {
    if (!chat?.conversationId) return;

    setSavingSettings(true);

    try {
      const { data } = await api.patch(
        `/chat/conversations/${chat.conversationId}/settings`,
        updates,
      );

      setChat((current) => ({ ...current, ...data }));
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingSettings(false);
    }
  }

  async function updatePreferences(updates) {
    if (!chat) return;

    const previous = chat.preferences;

    setChat((current) => ({
      ...current,
      preferences: { ...current.preferences, ...updates },
    }));

    try {
      const { data } = await api.patch("/chat/preferences", updates);
      setChat((current) => ({ ...current, preferences: data }));
      setError("");
    } catch (requestError) {
      setChat((current) => ({ ...current, preferences: previous }));
      setError(requestError.message);
    }
  }

  async function toggleBlock() {
    if (!targetUserId || !chat) return;

    const currentlyBlocked = chat.blockedByMe;

    if (
      !currentlyBlocked &&
      !window.confirm(
        "Block this connection? They will not be able to send you messages or see your activity.",
      )
    ) {
      return;
    }

    try {
      if (currentlyBlocked) {
        await api.delete(`/chat/blocks/${targetUserId}`);
        const { data } = await api.get(
          `/chat/conversations/with/${targetUserId}`,
        );
        setChat(data);
        setPresence(data.presence);
      } else {
        await api.post(`/chat/blocks/${targetUserId}`, {});

        setChat((current) => ({
          ...current,
          blocked: true,
          blockedByMe: true,
          readOnly: true,
        }));
      }
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function submitReport(reason, details) {
    if (!chat?.conversationId) return;

    try {
      await api.post(`/chat/conversations/${chat.conversationId}/reports`, {
        reason,
        details,
      });
      setError("");
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    }
  }

  return {
    savingSettings,
    updateConversationSettings,
    updatePreferences,
    toggleBlock,
    submitReport,
  };
}
