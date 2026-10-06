import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Plus, Send, ShieldOff, X } from "lucide-react";

export default function MessageComposer({
  readOnly,
  blockedByMe,
  draft,
  maxMessageLength,
  onDraftChange,
  onDraftKeyDown,
  onSend,
  onUnblock,
  mediaUploadsEnabled,
  onPickMedia,
  replyTo,
  replyAuthor,
  onCancelReply,
}) {
  const textareaRef = useRef(null);
  const libraryInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const attachRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (event) => {
      if (event.type === "keydown" && event.key !== "Escape") return;
      if (
        event.type === "pointerdown" &&
        attachRef.current?.contains(event.target)
      )
        return;
      setMenuOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [menuOpen]);

  const handleFile = (event) => {
    const [file] = event.target.files;
    event.target.value = "";
    setMenuOpen(false);
    if (file) onPickMedia(file);
  };

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
        {mediaUploadsEnabled && (
          <div className="chat-attach" ref={attachRef}>
            <input
              ref={libraryInputRef}
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
              tabIndex={-1}
              aria-hidden="true"
              onChange={handleFile}
            />
            <input
              ref={cameraInputRef}
              className="sr-only"
              type="file"
              accept="image/*,video/*"
              capture="environment"
              tabIndex={-1}
              aria-hidden="true"
              onChange={handleFile}
            />
            <button
              className={`btn btn-ghost btn-circle chat-composer__attach${menuOpen ? " is-open" : ""}`}
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Attach photo or video"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <Plus size={22} aria-hidden="true" />
            </button>
            {menuOpen && (
              <div className="chat-attach__menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  autoFocus
                  onClick={() => libraryInputRef.current?.click()}
                >
                  <ImagePlus size={18} aria-hidden="true" /> Photo or video
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera size={18} aria-hidden="true" /> Camera
                </button>
              </div>
            )}
          </div>
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
