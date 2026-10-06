import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export default function ImageLightbox({ src, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (src && !dialog.open) dialog.showModal();
    if (!src && dialog.open) dialog.close();
  }, [src]);

  return (
    <dialog ref={ref} className="lightbox" onClose={onClose} aria-label="Image">
      <button
        className="btn btn-circle btn-sm lightbox__close"
        type="button"
        onClick={onClose}
        aria-label="Close image"
      >
        <X size={18} aria-hidden="true" />
      </button>
      {src && <img src={src} alt="Shared in chat" />}
    </dialog>
  );
}
