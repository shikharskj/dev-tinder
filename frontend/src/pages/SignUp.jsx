import { useState } from "react";
import { ArrowRight, Code2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../utils/auth";

const initialForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  age: "",
  gender: "",
  location: "",
};

const SignUp = () => {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await signUp({ ...form, age: Number(form.age) });
      navigate("/login", {
        replace: true,
        state: {
          email: form.email,
          message: "Your account is ready. Sign in to meet the community.",
        },
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      className="auth-page auth-page--signup"
      aria-labelledby="signup-title"
    >
      <div className="auth-intro">
        <span className="auth-mark">
          <Code2 size={21} aria-hidden="true" />
        </span>
        <p className="eyebrow">Make your next connection</p>
        <h1 id="signup-title">Bring your curiosity with you.</h1>
        <p>A few details help other developers find common ground.</p>
      </div>

      <form className="card auth-card" onSubmit={handleSubmit}>
        <div className="card-body gap-4 p-5 sm:p-7">
          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="form-control w-full">
              <span className="label">
                <span className="label-text font-semibold">First name</span>
              </span>
              <input
                className="input input-bordered min-h-12 w-full"
                name="firstName"
                autoComplete="given-name"
                minLength={3}
                maxLength={100}
                value={form.firstName}
                onChange={updateField}
                required
              />
            </label>
            <label className="form-control w-full">
              <span className="label">
                <span className="label-text font-semibold">Last name</span>
              </span>
              <input
                className="input input-bordered min-h-12 w-full"
                name="lastName"
                autoComplete="family-name"
                minLength={3}
                maxLength={100}
                value={form.lastName}
                onChange={updateField}
                required
              />
            </label>
          </div>
          <label className="form-control w-full">
            <span className="label">
              <span className="label-text font-semibold">Email</span>
            </span>
            <input
              className="input input-bordered min-h-12 w-full"
              type="email"
              name="email"
              autoComplete="email"
              maxLength={254}
              value={form.email}
              onChange={updateField}
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
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              value={form.password}
              onChange={updateField}
              required
            />
            <span className="label">
              <span className="label-text-alt">
                Use uppercase, lowercase, a number, and a symbol.
              </span>
            </span>
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="form-control w-full">
              <span className="label">
                <span className="label-text font-semibold">Age</span>
              </span>
              <input
                className="input input-bordered min-h-12 w-full"
                type="number"
                name="age"
                min={18}
                max={50}
                inputMode="numeric"
                value={form.age}
                onChange={updateField}
                required
              />
            </label>
            <label className="form-control w-full">
              <span className="label">
                <span className="label-text font-semibold">Gender</span>
              </span>
              <select
                className="select select-bordered min-h-12 w-full"
                name="gender"
                value={form.gender}
                onChange={updateField}
                required
              >
                <option value="" disabled>
                  Select one
                </option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </label>
          </div>
          <label className="form-control w-full">
            <span className="label">
              <span className="label-text font-semibold">Location</span>
            </span>
            <input
              className="input input-bordered min-h-12 w-full"
              name="location"
              autoComplete="address-level2"
              minLength={2}
              maxLength={100}
              value={form.location}
              onChange={updateField}
              required
            />
          </label>
          <p className="text-center text-sm text-base-content/70">
            Learn how we handle your information in our{" "}
            <Link
              to="/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="link link-primary"
            >
              Privacy Policy (opens in a new tab)
            </Link>
            .
          </p>
          <button
            className="btn btn-primary mt-1 min-h-12 w-full"
            type="submit"
            disabled={submitting}
          >
            {submitting ? (
              <span
                className="loading loading-spinner"
                aria-label="Creating account"
              />
            ) : (
              <>
                Create account <ArrowRight size={18} aria-hidden="true" />
              </>
            )}
          </button>
          <p className="text-center text-sm text-base-content/70">
            Already have an account?{" "}
            <Link className="link link-primary font-semibold" to="/login">
              Sign in
            </Link>
          </p>
        </div>
      </form>
    </section>
  );
};

export default SignUp;
