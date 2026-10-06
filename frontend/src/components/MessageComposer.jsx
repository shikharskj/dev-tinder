import { useLayoutEffect, useRef } from "react";
import { ImagePlus, Send, ShieldOff, X } from "lucide-react";

export default function MessageComposer({
  readOnly,
  blockedByMe,
  draft,
  maxMessageLength,
  onDraftChange,
  onDraftKeyDown,
  onSend,
  onUnblock,
  imageUploadsEnabled,
  onPickImage,
  replyTo,
  replyAuthor,
  onCancelReply,
}) {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // Grow with content up to ~5 lines, then scroll.
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, [draft, readOnly]);

  if (readOnly) {
    return (
      <div className="chat-composer">
        {blockedByMe && (
          <button
            className="btn btn-outline btn-sm"
            type="button"
            onClick={onUnblock}
          >
            <ShieldOff size={16} aria-hidden="true" /> Unblock to message
          </button>
        )}
        <span className="text-sm text-base-content/60">
          Messaging is unavailable for this conversation.
        </span>
      </div>
    );
  }

  return (
    <div className="chat-composer-wrap">
      {replyTo && (
        <div className="chat-replybar">
          <div className="chat-replybar__body">
            <span className="chat-quote__author">{replyAuthor}</span>
            <span className="chat-quote__text">
              {replyTo.text || "This message was deleted"}
            </span>
          </div>
          <button
            className="btn btn-ghost btn-circle btn-xs"
            type="button"
            onClick={onCancelReply}
            aria-label="Cancel reply"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}
      <form
        className="chat-composer"
        onSubmit={(event) => {
          event.preventDefault();
          onSend();
        }}
      >
        {imageUploadsEnabled && (
          <>
            <input
              ref={fileInputRef}
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(event) => {
                const [file] = event.target.files;
                event.target.value = "";
                if (file) onPickImage(file);
              }}
            />
            <button
              className="btn btn-ghost btn-circle chat-composer__attach"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Send an image"
            >
              <ImagePlus size={20} aria-hidden="true" />
            </button>
          </>
        )}
        <textarea
          ref={textareaRef}
          rows={1}
          enterKeyHint="enter"
          className="chat-composer__input"
          value={draft}
          maxLength={maxMessageLength}
          onChange={onDraftChange}
          onKeyDown={onDraftKeyDown}
          placeholder="Write a message…"
          aria-label="Message"
        />
        <button
          className="btn btn-primary btn-circle chat-composer__send"
          type="submit"
          disabled={!draft.trim() || draft.length > maxMessageLength}
          aria-label="Send message"
        >
          <Send size={18} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
