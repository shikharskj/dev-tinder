import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../utils/api";
import { createClientMessageId, mergeMessage } from "../utils/helpers";

const MB = 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const MAX_IMAGE_BYTES = 10 * MB;
const MAX_VIDEO_BYTES = 50 * MB;
const MAX_VIDEO_SECONDS = 60;

function readVideoDuration(file) {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    const done = (value) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    video.preload = "metadata";
    video.onloadedmetadata = () => done(video.duration);
    video.onerror = () => done(null);
    video.src = url;
  });
}

// Downscales large photos before upload to keep mobile data use low.
async function prepareImage(file) {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= MAX_IMAGE_BYTES) {
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
  if (!blob || blob.size > MAX_IMAGE_BYTES) {
    throw new Error("That photo is too large. Choose one under 10 MB.");
  }
  return blob;
}

async function prepareMedia(file) {
  if (IMAGE_TYPES.includes(file.type)) {
    return { kind: "image", blob: await prepareImage(file) };
  }
  if (VIDEO_TYPES.includes(file.type)) {
    if (file.size > MAX_VIDEO_BYTES) {
      throw new Error("Videos must be 50 MB or smaller.");
    }
    const duration = await readVideoDuration(file);
    if (duration && duration > MAX_VIDEO_SECONDS + 0.5) {
      throw new Error("Videos can be up to 60 seconds long.");
    }
    return { kind: "video", blob: file };
  }
  throw new Error(
    "Choose a JPEG, PNG or WebP photo, or an MP4, MOV or WebM video.",
  );
}

function uploadToCloudinary(target, blob, onProgress, controller) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("api_key", target.apiKey);
    form.append("public_id", target.public_id);
    form.append("timestamp", String(target.timestamp));
    form.append("type", target.type);
    form.append("signature", target.signature);
    form.append("file", blob);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", target.uploadUrl);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error("Upload failed. Try again."));
    xhr.onerror = () =>
      reject(new Error("Upload failed. Check your connection."));
    xhr.onabort = () =>
      reject(Object.assign(new Error("Cancelled"), { cancelled: true }));
    controller.abort = () => xhr.abort();
    xhr.send(form);
  });
}

export default function useMediaUpload({
  chat,
  userId,
  replyTo,
  setReplyTo,
  draft,
  setDraft,
  setMessages,
  setError,
  shouldScrollToBottomRef,
}) {
  const [enabled, setEnabled] = useState(false);
  const controllers = useRef(new Map());

  useEffect(() => {
    let active = true;
    api
      .get("/chat/capabilities")
      .then(({ data }) => {
        if (active)
          setEnabled(Boolean(data?.imageUploads || data?.videoUploads));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const cancelUpload = useCallback((clientMessageId) => {
    controllers.current.get(clientMessageId)?.abort?.();
  }, []);

  const sendMedia = useCallback(
    async (file) => {
      if (!file || !chat?.conversationId || chat.readOnly) return;
      const clientMessageId = createClientMessageId();
      const replyTarget = replyTo;
      const caption = draft.trim();
      const controller = {};
      controllers.current.set(clientMessageId, controller);
      let previewUrl;

      const patch = (changes) =>
        setMessages((current) =>
          current.map((message) =>
            message.clientMessageId === clientMessageId
              ? { ...message, ...changes }
              : message,
          ),
        );

      try {
        const { kind, blob } = await prepareMedia(file);
        previewUrl = URL.createObjectURL(blob);
        setReplyTo(null);
        if (caption) setDraft("");
        shouldScrollToBottomRef.current = true;
        setMessages((current) =>
          mergeMessage(current, {
            _id: clientMessageId,
            senderId: userId,
            clientMessageId,
            text: caption,
            attachment: { kind, url: previewUrl, contentType: blob.type },
            ...(replyTarget ? { replyTo: replyTarget } : {}),
            createdAt: new Date().toISOString(),
            pending: true,
            uploadProgress: 0,
          }),
        );

        const { data: target } = await api.post(
          `/chat/conversations/${chat.conversationId}/attachments`,
          { kind, contentType: blob.type, size: blob.size },
        );
        await uploadToCloudinary(
          target,
          blob,
          (fraction) => patch({ uploadProgress: fraction }),
          controller,
        );
        patch({ uploadProgress: 1 });

        const { data: saved } = await api.post(
          `/chat/conversations/${chat.conversationId}/messages`,
          {
            clientMessageId,
            text: caption,
            attachmentPublicId: target.publicId,
            attachmentKind: kind,
            replyToId: replyTarget?._id,
          },
        );
        setMessages((current) =>
          mergeMessage(current, {
            ...saved,
            pending: false,
            uploadProgress: undefined,
          }),
        );
        setError("");
      } catch (error) {
        setMessages((current) =>
          current.filter(
            (message) => message.clientMessageId !== clientMessageId,
          ),
        );
        if (caption) setDraft((current) => current || caption);
        if (!error.cancelled) setError(error.message);
      } finally {
        controllers.current.delete(clientMessageId);
        if (previewUrl)
          window.setTimeout(() => URL.revokeObjectURL(previewUrl), 10_000);
      }
    },
    [
      chat,
      replyTo,
      draft,
      setDraft,
      setReplyTo,
      setMessages,
      setError,
      shouldScrollToBottomRef,
      userId,
    ],
  );

  return { mediaUploadsEnabled: enabled, sendMedia, cancelUpload };
}
