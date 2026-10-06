import { useEffect, useRef } from "react";
import { Trash2, X } from "lucide-react";

export default function MediaViewer({ media, onClose, onDelete }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (media && !dialog.open) dialog.showModal();
    if (!media && dialog.open) dialog.close();
  }, [media]);

  return (
    <dialog
      ref={ref}
      className="lightbox"
      onClose={onClose}
      onClick={(event) => event.target === ref.current && onClose()}
      aria-label={media?.kind === "video" ? "Video" : "Photo"}
    >
      <button
        className="btn btn-circle btn-sm lightbox__close"
        type="button"
        onClick={onClose}
        aria-label="Close"
      >
        <X size={18} aria-hidden="true" />
      </button>
      {onDelete && (
        <button
          className="btn btn-circle btn-sm lightbox__delete"
          type="button"
          onClick={onDelete}
          aria-label={media?.kind === "video" ? "Delete video" : "Delete photo"}
        >
          <Trash2 size={18} aria-hidden="true" />
        </button>
      )}
      {media?.kind === "video" ? (
        <video
          key={media.url}
          src={media.url}
          poster={media.posterUrl}
          controls
          autoPlay
          playsInline
        />
      ) : (
        media && <img src={media.url} alt="Shared in chat" />
      )}
    </dialog>
  );
}
