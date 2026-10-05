import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Code2,
  Compass,
  CreditCard,
  Inbox,
  LogOut,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useAuth } from "../auth";

const navigation = [
  { to: "/feed", label: "Discover", Icon: Compass },
  { to: "/requests", label: "Requests", Icon: Inbox },
  {
    to: "/connections",
    label: "Connections",
    mobileLabel: "Connect",
    Icon: UsersRound,
  },
  { to: "/enroll-premium", label: "Premium", Icon: CreditCard },
];

function NavItem({ to, label, mobileLabel = label, Icon, mobile = false }) {
  return (
    <NavLink
      to={to}
      end={to === "/feed"}
      className={({ isActive }) =>
        mobile
          ? `dock-item ${isActive ? "dock-active text-primary font-bold" : ""}`
          : `btn btn-ghost btn-sm ${isActive ? "text-primary font-bold" : "text-base-content/70"}`
      }
      aria-label={label}
    >
      {({ isActive }) => (
        <>
          <Icon
            size={20}
            strokeWidth={isActive ? 2.5 : 1.8}
            aria-hidden="true"
          />
          {mobile ? (
            <span className="dock-label">
              <span className="dock-label-full">{label}</span>
              <span className="dock-label-compact">{mobileLabel}</span>
            </span>
          ) : (
            <span>{label}</span>
          )}
        </>
      )}
    </NavLink>
  );
}

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [logoutError, setLogoutError] = useState("");
  const [logoutConfirmationOpen, setLogoutConfirmationOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const logoutButtonRef = useRef(null);
  const cancelLogoutButtonRef = useRef(null);
  const loggingOutRef = useRef(false);
  const logoutDialogRef = useRef(null);

  useEffect(() => {
    if (!logoutConfirmationOpen) return undefined;

    const logoutTrigger = logoutButtonRef.current;
    cancelLogoutButtonRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !loggingOutRef.current) {
        setLogoutConfirmationOpen(false);
      } else if (event.key === "Tab") {
        const controls = logoutDialogRef.current?.querySelectorAll(
          "button:not(:disabled)",
        );
        if (!controls?.length) {
          event.preventDefault();
          return;
        }

        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      logoutTrigger?.focus();
    };
  }, [logoutConfirmationOpen]);

  async function handleLogout() {
    setLogoutError("");
    loggingOutRef.current = true;
    setLoggingOut(true);
    try {
      await logout();
      navigate("/", { replace: true });
    } catch {
      setLogoutError(
        "You were signed out here, but the server could not confirm it.",
      );
      navigate("/", { replace: true });
    } finally {
      loggingOutRef.current = false;
      setLoggingOut(false);
      setLogoutConfirmationOpen(false);
    }
  }

  const initials = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .map((name) => name[0])
    .join("")
    .toUpperCase();

  const userPhotoUrl = user?.photoUrl || null;

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-base-300/70 bg-base-100/95 backdrop-blur">
        <div className="navbar mx-auto min-h-16 max-w-6xl px-4 sm:px-6 md:gap-2">
          <div className="flex-1">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-base-content no-underline"
            >
              <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-content">
                <Code2 size={20} aria-hidden="true" />
              </span>
              <span className="text-lg font-bold tracking-tight">
                DevTinder
              </span>
            </Link>
          </div>

          {user && (
            <nav
              className="hidden items-center gap-1 md:flex"
              aria-label="Main navigation"
            >
              {navigation.map(({ to, label, Icon }) => (
                <NavItem key={to} to={to} label={label} Icon={Icon} />
              ))}
            </nav>
          )}

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Link
                  to="/profile"
                  className="btn btn-ghost btn-sm gap-2 px-2"
                  aria-label="Open your profile"
                >
                  <span className="avatar placeholder">
                    <span className="grid size-9 place-items-center rounded-full bg-secondary text-sm font-bold text-secondary-content">
                      {userPhotoUrl ? (
                        <img
                          src={userPhotoUrl}
                          alt="Profile"
                          className="size-full rounded-full object-cover"
                        />
                      ) : (
                        initials || <UserRound size={18} aria-hidden="true" />
                      )}
                    </span>
                  </span>
                  <span className="hidden max-w-28 truncate sm:inline">
                    {user.firstName}
                  </span>
                </Link>
                <button
                  ref={logoutButtonRef}
                  type="button"
                  className="btn btn-ghost btn-square btn-sm"
                  onClick={() => setLogoutConfirmationOpen(true)}
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <LogOut size={19} aria-hidden="true" />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm">
                  Sign in
                </Link>
                <Link to="/sign-up" className="btn btn-primary btn-sm">
                  Join
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {logoutError && (
        <div className="toast toast-top toast-center z-50">
          <div className="alert alert-warning shadow-lg" role="status">
            <span>{logoutError}</span>
            <button
              className="btn btn-ghost btn-xs"
              onClick={() => setLogoutError("")}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {logoutConfirmationOpen && (
        <div
          className="logout-modal"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !loggingOut) {
              setLogoutConfirmationOpen(false);
            }
          }}
        >
          <section
            ref={logoutDialogRef}
            className="logout-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-dialog-title"
            aria-describedby="logout-dialog-description"
          >
            <div className="logout-dialog__icon">
              <ShieldCheck size={25} aria-hidden="true" />
            </div>
            <p className="logout-dialog__eyebrow">Take a breather</p>
            <h2 id="logout-dialog-title">Ready to sign out?</h2>
            <p id="logout-dialog-description">
              You can come back anytime. Your profile and connections will be
              right here when you return.
            </p>
            <div className="logout-dialog__actions">
              <button
                ref={cancelLogoutButtonRef}
                type="button"
                className="btn btn-ghost"
                onClick={() => setLogoutConfirmationOpen(false)}
                disabled={loggingOut}
              >
                Stay signed in
              </button>
              <button
                type="button"
                className="btn btn-primary logout-dialog__confirm"
                onClick={handleLogout}
                disabled={loggingOut}
              >
                {loggingOut ? (
                  <span
                    className="loading loading-spinner loading-sm"
                    aria-label="Signing out"
                  />
                ) : (
                  <LogOut size={17} aria-hidden="true" />
                )}
                {loggingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </section>
        </div>
      )}

      {user && (
        <nav className="dock md:hidden" aria-label="Main navigation">
          {navigation.map(({ to, label, mobileLabel, Icon }) => (
            <NavItem
              key={to}
              to={to}
              label={label}
              mobileLabel={mobileLabel}
              Icon={Icon}
              mobile
            />
          ))}
          <NavItem to="/profile" label="Profile" Icon={UserRound} mobile />
        </nav>
      )}
    </>
  );
}
