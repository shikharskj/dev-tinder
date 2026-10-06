import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Code2,
  Compass,
  CreditCard,
  Inbox,
  LogOut,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useAuth } from "../utils/auth";

const navigation = [
  { to: "/feed", label: "Discover", Icon: Compass },
  { to: "/requests", label: "Requests", Icon: Inbox },
  { to: "/connections", label: "Matches", Icon: UsersRound },
  { to: "/enroll-premium", label: "Premium", Icon: CreditCard },
];

function NavItem({ to, label, Icon, mobile = false }) {
  return (
    <NavLink
      to={to}
      end={to === "/feed"}
      className={({ isActive }) =>
        mobile
          ? `dock-item ${isActive ? "dock-active" : ""}`
          : `btn btn-ghost btn-sm ${isActive ? "text-primary" : "text-base-content/70"}`
      }
      aria-label={label}
    >
      <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
      {mobile ? (
        <span className="dock-label">{label}</span>
      ) : (
        <span>{label}</span>
      )}
    </NavLink>
  );
}

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [logoutError, setLogoutError] = useState("");

  async function handleLogout() {
    setLogoutError("");
    try {
      await logout();
      navigate("/", { replace: true });
    } catch {
      setLogoutError(
        "You were signed out here, but the server could not confirm it.",
      );
      navigate("/", { replace: true });
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
        <div className="navbar mx-auto min-h-16 max-w-6xl px-4 sm:px-6">
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
                  type="button"
                  className="btn btn-ghost btn-square btn-sm"
                  onClick={handleLogout}
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

      {user && (
        <nav className="dock md:hidden" aria-label="Main navigation">
          {navigation.map(({ to, label, Icon }) => (
            <NavItem key={to} to={to} label={label} Icon={Icon} mobile />
          ))}
          <NavItem to="/profile" label="Profile" Icon={UserRound} mobile />
        </nav>
      )}
    </>
  );
}
