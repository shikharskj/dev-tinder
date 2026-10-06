import { useCallback, useEffect, useState } from "react";
import { api } from "../utils/api";
import { createClientMessageId, mergeMessage } from "../utils/helpers";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

// Downscales large photos before upload to keep mobile data use low.
async function prepareImage(file) {
  if (!TYPES.includes(file.type)) {
    throw new Error("Only JPEG, PNG or WebP images can be sent.");
  }
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= MAX_BYTES) {
    bitmap.close?.();
    return file;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85),
  );
  if (!blob || blob.size > MAX_BYTES) {
    throw new Error("That image is too large. Choose one under 5 MB.");
  }
  return blob;
}

export default function useImageUpload({
  chat,
  userId,
  replyTo,
  setReplyTo,
  setMessages,
  setError,
  shouldScrollToBottomRef,
}) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get("/chat/capabilities")
      .then(({ data }) => {
        if (active) setEnabled(Boolean(data?.imageUploads));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const sendImage = useCallback(
    async (file) => {
      if (!file || !chat?.conversationId || chat.readOnly) return;
      const clientMessageId = createClientMessageId();
      const replyTarget = replyTo;
      let previewUrl;

      try {
        const prepared = await prepareImage(file);
        previewUrl = URL.createObjectURL(prepared);
        setReplyTo(null);
        shouldScrollToBottomRef.current = true;
        setMessages((current) =>
          mergeMessage(current, {
            _id: clientMessageId,
            senderId: userId,
            clientMessageId,
            text: "",
            attachment: { url: previewUrl, contentType: prepared.type },
            ...(replyTarget ? { replyTo: replyTarget } : {}),
            createdAt: new Date().toISOString(),
            pending: true,
          }),
        );

        const { data: target } = await api.post(
          `/chat/conversations/${chat.conversationId}/attachments`,
          { contentType: prepared.type, size: prepared.size },
        );
        const upload = await fetch(target.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": prepared.type },
          body: prepared,
        });
        if (!upload.ok) throw new Error("Image upload failed. Try again.");

        const { data: saved } = await api.post(
          `/chat/conversations/${chat.conversationId}/messages`,
          {
            clientMessageId,
            text: "",
            attachmentKey: target.key,
            replyToId: replyTarget?._id,
          },
        );
        setMessages((current) =>
          mergeMessage(current, { ...saved, pending: false }),
        );
        setError("");
      } catch (error) {
        setMessages((current) =>
          current.filter(
            (message) => message.clientMessageId !== clientMessageId,
          ),
        );
        setError(error.message);
      } finally {
        if (previewUrl)
          window.setTimeout(() => URL.revokeObjectURL(previewUrl), 10_000);
      }
    },
    [
      chat,
      replyTo,
      setReplyTo,
      setMessages,
      setError,
      shouldScrollToBottomRef,
      userId,
    ],
  );

  return { imageUploadsEnabled: enabled, sendImage };
}
