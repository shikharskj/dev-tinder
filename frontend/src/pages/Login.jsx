import { useState } from "react";
import { ArrowRight, Code2 } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

const Login = () => {
  const { login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState(location.state?.email || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login({ email, password });
      navigate(location.state?.from || "/feed", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-page" aria-labelledby="login-title">
      <div className="auth-intro">
        <span className="auth-mark">
          <Code2 size={21} aria-hidden="true" />
        </span>
        <p className="eyebrow">Welcome back</p>
        <h1 id="login-title">Pick up where good connections begin.</h1>
        <p>Sign in to see who’s building something interesting.</p>
      </div>

      <form className="card auth-card" onSubmit={handleSubmit}>
        <div className="card-body gap-5 p-5 sm:p-7">
          {location.state?.message && (
            <div className="alert alert-success" role="status">
              {location.state.message}
            </div>
          )}
          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}
          <label className="form-control w-full">
            <span className="label">
              <span className="label-text font-semibold">Email</span>
            </span>
            <input
              className="input input-bordered min-h-12 w-full"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@example.com"
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="form-control w-full">
            <span className="label">
              <span className="label-text font-semibold">Password</span>
            </span>
            <input
              className="input input-bordered min-h-12 w-full"
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="Your password"
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <button
            className="btn btn-primary mt-1 min-h-12 w-full"
            type="submit"
            disabled={submitting}
          >
            {submitting ? (
              <span
                className="loading loading-spinner"
                aria-label="Signing in"
              />
            ) : (
              <>
                Sign in <ArrowRight size={18} aria-hidden="true" />
              </>
            )}
          </button>
          <p className="text-center text-sm text-base-content/70">
            New around here?{" "}
            <Link className="link link-primary font-semibold" to="/sign-up">
              Create an account
            </Link>
          </p>
        </div>
      </form>
    </section>
  );
};

export default Login;
