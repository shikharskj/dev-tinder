import { useEffect, useRef } from "react";
import { BadgeCheck, UserRound, X } from "lucide-react";

export default function ContactSheet({ open, target, onClose }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const initials =
    `${target?.firstName?.[0] || ""}${target?.lastName?.[0] || ""}`.toUpperCase();
  const tags = [...(target?.skills || []), ...(target?.interests || [])];

  return (
    <dialog
      ref={dialogRef}
      className="modal modal-bottom sm:modal-middle"
      onClose={onClose}
      aria-label="Contact info"
    >
      <div className="modal-box contact-sheet">
        <button
          className="btn btn-ghost btn-sm btn-circle absolute right-3 top-3"
          type="button"
          onClick={onClose}
          aria-label="Close contact info"
        >
          <X size={18} aria-hidden="true" />
        </button>
        <div className="contact-sheet__hero">
          <div className="avatar placeholder">
            <div className="size-28 overflow-hidden rounded-full bg-secondary text-secondary-content">
              {target?.photoUrl ? (
                <img
                  src={target.photoUrl}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <span aria-hidden="true" className="text-3xl">
                  {initials || <UserRound size={32} />}
                </span>
              )}
            </div>
          </div>
          <h2>
            {target?.firstName} {target?.lastName}
            {target?.usagePlan === "Elite" && (
              <BadgeCheck
                className="ml-1 inline text-amber-600"
                size={18}
                aria-label="Elite member"
              />
            )}
          </h2>
          {target?.age ? (
            <p className="text-sm opacity-60">{target.age}</p>
          ) : null}
        </div>
        {target?.bio && (
          <section>
            <h3>About</h3>
            <p>{target.bio}</p>
          </section>
        )}
        {tags.length > 0 && (
          <section>
            <h3>Skills and interests</h3>
            <ul className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <li className="badge badge-outline" key={tag}>
                  {tag}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="submit" aria-label="Close">
          close
        </button>
      </form>
    </dialog>
  );
}
