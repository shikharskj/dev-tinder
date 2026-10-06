import { useEffect, useRef } from "react";
import { Copy, Reply, Trash2, UserRoundX } from "lucide-react";
import { DELETE_FOR_EVERYONE_WINDOW_MS } from "../hooks/useMessageActions";

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export default function MessageActionSheet({
  message,
  own,
  currentUserId,
  readOnly,
  onClose,
  onReply,
  onCopy,
  onReact,
  onDelete,
}) {
  const dialogRef = useRef(null);
  const open = Boolean(message);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const deleted = Boolean(message?.deleted);
  const canDeleteForEveryone =
    own &&
    !deleted &&
    !readOnly &&
    (message?.openedAt || 0) - new Date(message?.createdAt || 0).getTime() <
      DELETE_FOR_EVERYONE_WINDOW_MS;
  const myReaction = message?.reactions?.find(
    (reaction) => String(reaction.userId) === String(currentUserId),
  )?.emoji;

  return (
    <dialog
      ref={dialogRef}
      className="modal modal-bottom sm:modal-middle"
      onClose={onClose}
      aria-label="Message actions"
    >
      <div className="modal-box action-sheet">
        {!deleted && !readOnly && (
          <div
            className="action-sheet__reactions"
            role="group"
            aria-label="React"
          >
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className={`action-sheet__emoji${myReaction === emoji ? " is-active" : ""}`}
                aria-pressed={myReaction === emoji}
                onClick={() => onReact(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
        <ul className="menu w-full p-0">
          {!deleted && !readOnly && (
            <li>
              <button type="button" onClick={onReply}>
                <Reply size={18} aria-hidden="true" /> Reply
              </button>
            </li>
          )}
          {!deleted && message?.text && (
            <li>
              <button type="button" onClick={onCopy}>
                <Copy size={18} aria-hidden="true" /> Copy
              </button>
            </li>
          )}
          <li>
            <button type="button" onClick={() => onDelete("me")}>
              <UserRoundX size={18} aria-hidden="true" /> Delete for me
            </button>
          </li>
          {canDeleteForEveryone && (
            <li>
              <button
                type="button"
                className="text-error"
                onClick={() => onDelete("everyone")}
              >
                <Trash2 size={18} aria-hidden="true" /> Delete for everyone
              </button>
            </li>
          )}
        </ul>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="submit" aria-label="Close">
          close
        </button>
      </form>
    </dialog>
  );
}
