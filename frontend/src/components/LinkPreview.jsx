import { useEffect, useState } from "react";
import { api } from "../utils/api";

const URL_PATTERN = /https?:\/\/[^\s<>"']+/i;
const cache = new Map();

export function firstUrl(text) {
  return text?.match(URL_PATTERN)?.[0]?.replace(/[.,!?)]+$/, "") || null;
}

export default function LinkPreview({ text }) {
  const url = firstUrl(text);
  const [preview, setPreview] = useState(() => (url ? cache.get(url) : null));

  useEffect(() => {
    if (!url || cache.has(url)) return undefined;
    let active = true;
    api
      .get(`/chat/link-preview?url=${encodeURIComponent(url)}`)
      .then(({ data }) => {
        cache.set(url, data || null);
        if (active) setPreview(data || null);
      })
      .catch(() => cache.set(url, null));
    return () => {
      active = false;
    };
  }, [url]);

  if (!preview) return null;

  return (
    <a
      className="chat-link-preview"
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
    >
      {preview.image && (
        <img
          src={preview.image}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      )}
      <span className="chat-link-preview__site">{preview.siteName}</span>
      <span className="chat-link-preview__title">{preview.title}</span>
      {preview.description && (
        <span className="chat-link-preview__desc">{preview.description}</span>
      )}
    </a>
  );
}
