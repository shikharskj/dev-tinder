import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./auth";

function AuthLoading() {
  return (
    <main
      className="flex min-h-[60vh] items-center justify-center"
      aria-live="polite"
    >
      <span
        className="loading loading-spinner loading-lg text-primary"
        aria-label="Checking your session"
      />
    </main>
  );
}

export function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <AuthLoading />;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

export function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <AuthLoading />;
  if (user) {
    return <Navigate to={location.state?.from || "/feed"} replace />;
  }

  return children;
}
