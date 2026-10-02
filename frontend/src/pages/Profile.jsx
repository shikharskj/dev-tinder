import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Eye, MapPin, Pencil, Trash2, UserRound } from "lucide-react";
import { useBlocker, useBeforeUnload } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import TagInput from "../components/TagInput";

function formFromUser(user) {
  return {
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    age: user.age == null ? "" : String(user.age),
    gender: user.gender || "",
    photoUrl: user.photoUrl || "",
    location: user.location || "",
    bio: user.bio || "",
    skills: [...(user.skills || [])],
    interests: [...(user.interests || [])],
  };
}

const Profile = () => {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState(() => formFromUser(user));
  const [savedSnapshot, setSavedSnapshot] = useState(() => formFromUser(user));
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const formRef = useRef(null);

  const isDirty = JSON.stringify(form) !== JSON.stringify(savedSnapshot);
  const blocker = useBlocker(isDirty && !submitting);

  useBeforeUnload(
    useCallback(
      (event) => {
        if (!isDirty) return;
        event.preventDefault();
        event.returnValue = "";
      },
      [isDirty],
    ),
  );

  useEffect(() => {
    if (Object.keys(fieldErrors).length > 0) {
      formRef.current?.querySelector('[aria-invalid="true"]')?.focus();
    }
  }, [fieldErrors]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
    setSaved(false);
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
    if (name === "photoUrl") setPhotoFailed(false);
  }

  function updateTags(name, values) {
    setForm((current) => ({ ...current, [name]: values }));
    setSaved(false);
  }

  function discardChanges() {
    setForm(savedSnapshot);
    setFieldErrors({});
    setError("");
    setSaved(false);
  }

  function cancelNavigation() {
    blocker.reset?.();
  }

  function discardAndNavigate() {
    setForm(savedSnapshot);
    setFieldErrors({});
    blocker.proceed?.();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setFieldErrors({});
    setSaved(false);
    setSubmitting(true);

    const updates = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      age: Number(form.age),
      gender: form.gender,
      location: form.location.trim(),
      bio: form.bio.trim(),
      skills: form.skills.map((value) => value.trim()),
      interests: form.interests.map((value) => value.trim()),
      photoUrl: form.photoUrl.trim() || null,
    };

    try {
      const { data } = await api.patch("/api/profile/edit", updates);
      const nextForm = formFromUser(data);
      setUser(data);
      setForm(nextForm);
      setSavedSnapshot(nextForm);
      setSaved(true);
      setEditing(false);
      setPhotoFailed(false);
    } catch (requestError) {
      setError(requestError.message);
      if (
        requestError.details &&
        typeof requestError.details === "object" &&
        !Array.isArray(requestError.details)
      ) {
        setFieldErrors(requestError.details);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const fullName = `${form.firstName} ${form.lastName}`.trim();
  const initials =
    `${form.firstName?.[0] || ""}${form.lastName?.[0] || ""}`.toUpperCase();

  return (
    <section className="page-content" aria-labelledby="profile-title">
      <div className="page-heading profile-page-heading">
        <div>
          <p className="eyebrow">Your space</p>
          <h1 id="profile-title">Profile</h1>
          <p>
            {editing
              ? "Make your introduction yours."
              : "How other developers see you."}
          </p>
        </div>
        <button
          className="btn btn-outline min-h-11 shrink-0 gap-2"
          type="button"
          onClick={() => setEditing((current) => !current)}
          aria-label={editing ? "Preview profile" : "Edit profile"}
        >
          {editing ? (
            <Eye size={18} aria-hidden="true" />
          ) : (
            <Pencil size={17} aria-hidden="true" />
          )}
          <span>{editing ? "Preview" : "Edit profile"}</span>
        </button>
      </div>

      {error && (
        <div className="alert alert-error mb-5" role="alert">
          {error}
        </div>
      )}
      {saved && (
        <div className="alert alert-success mb-5" role="status">
          <Check size={18} aria-hidden="true" /> Profile saved.
        </div>
      )}

      <div className={`profile-layout${editing ? " is-editing" : ""}`}>
        <article className="card profile-preview">
          <div className="profile-preview__photo">
            {form.photoUrl && !photoFailed ? (
              <img
                src={form.photoUrl}
                alt={`${fullName || "Profile"} photo`}
                onError={() => setPhotoFailed(true)}
              />
            ) : (
              <div className="profile-preview__placeholder" aria-hidden="true">
                {initials || <UserRound size={42} />}
              </div>
            )}
          </div>
          <div className="card-body gap-4 p-5 sm:p-6">
            <div>
              <p className="eyebrow">Profile preview</p>
              <h2 className="card-title text-2xl">
                {fullName || "Your name"}
                {form.age ? ` · ${form.age}` : ""}
              </h2>
              <p className="mt-2 flex items-center gap-1 text-sm text-base-content/65">
                <MapPin size={15} aria-hidden="true" />
                {form.location || "Add your location"}
                {form.gender && ` · ${form.gender}`}
              </p>
            </div>
            <p className="min-h-12 text-sm leading-relaxed text-base-content/80">
              {form.bio || "Your bio will appear here."}
            </p>
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase text-base-content/55">
                Skills
              </h3>
              {form.skills.length ? (
                <div className="flex flex-wrap gap-2">
                  {form.skills.map((skill) => (
                    <span className="badge badge-outline" key={skill}>
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-base-content/55">
                  Add a few skills.
                </p>
              )}
            </div>
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase text-base-content/55">
                Interests
              </h3>
              {form.interests.length ? (
                <div className="flex flex-wrap gap-2">
                  {form.interests.map((interest) => (
                    <span className="badge badge-secondary" key={interest}>
                      {interest}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-base-content/55">
                  Add what you enjoy.
                </p>
              )}
            </div>
          </div>
        </article>

        {editing && (
          <div className="profile-editor-column">
            <form
              ref={formRef}
              id="profile-edit-form"
              className="card form-surface"
              onSubmit={handleSubmit}
            >
              <div className="card-body gap-5 p-5 sm:p-7">
                <div>
                  <p className="eyebrow">Edit your details</p>
                  <h2 className="text-xl font-bold">
                    Make a good introduction
                  </h2>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="form-control">
                    <span className="label">
                      <span className="label-text font-semibold">
                        First name
                      </span>
                    </span>
                    <input
                      className="input input-bordered min-h-12"
                      name="firstName"
                      minLength={3}
                      maxLength={100}
                      value={form.firstName}
                      onChange={updateField}
                      aria-invalid={Boolean(fieldErrors.firstName)}
                      aria-describedby={
                        fieldErrors.firstName
                          ? "profile-first-name-error"
                          : undefined
                      }
                      required
                    />
                    {fieldErrors.firstName && (
                      <span
                        className="field-error"
                        id="profile-first-name-error"
                      >
                        {fieldErrors.firstName}
                      </span>
                    )}
                  </label>
                  <label className="form-control">
                    <span className="label">
                      <span className="label-text font-semibold">
                        Last name
                      </span>
                    </span>
                    <input
                      className="input input-bordered min-h-12"
                      name="lastName"
                      minLength={3}
                      maxLength={100}
                      value={form.lastName}
                      onChange={updateField}
                      aria-invalid={Boolean(fieldErrors.lastName)}
                      aria-describedby={
                        fieldErrors.lastName
                          ? "profile-last-name-error"
                          : undefined
                      }
                      required
                    />
                    {fieldErrors.lastName && (
                      <span
                        className="field-error"
                        id="profile-last-name-error"
                      >
                        {fieldErrors.lastName}
                      </span>
                    )}
                  </label>
                </div>

                <label className="form-control">
                  <span className="label">
                    <span className="label-text font-semibold">Email</span>
                  </span>
                  <div>
                    <input
                      className="input input-bordered min-h-12"
                      type="email"
                      value={user.email}
                      readOnly
                      aria-describedby="email-note"
                    />
                  </div>
                  <span className="label">
                    <span id="email-note" className="label-text-alt">
                      Email address can’t be changed here.
                    </span>
                  </span>
                </label>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="form-control">
                    <span className="label">
                      <span className="label-text font-semibold">Age</span>
                    </span>
                    <div>
                      <input
                        className="input input-bordered min-h-12"
                        type="number"
                        name="age"
                        min={18}
                        max={50}
                        inputMode="numeric"
                        value={form.age}
                        onChange={updateField}
                        aria-invalid={Boolean(fieldErrors.age)}
                        aria-describedby={
                          fieldErrors.age ? "profile-age-error" : undefined
                        }
                        required
                      />
                      {fieldErrors.age && (
                        <span className="field-error" id="profile-age-error">
                          {fieldErrors.age}
                        </span>
                      )}
                    </div>
                  </label>
                  <label className="form-control">
                    <span className="label">
                      <span className="label-text font-semibold">Gender</span>
                    </span>
                    <div>
                      <select
                        className="select select-bordered min-h-12"
                        name="gender"
                        value={form.gender}
                        onChange={updateField}
                        aria-invalid={Boolean(fieldErrors.gender)}
                        aria-describedby={
                          fieldErrors.gender
                            ? "profile-gender-error"
                            : undefined
                        }
                        required
                      >
                        <option value="" disabled>
                          Select one
                        </option>
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                        <option value="Other">Other</option>
                      </select>
                      {fieldErrors.gender && (
                        <span className="field-error" id="profile-gender-error">
                          {fieldErrors.gender}
                        </span>
                      )}
                    </div>
                  </label>
                </div>

                <label className="form-control">
                  <span className="label">
                    <span className="label-text font-semibold">Location</span>
                  </span>
                  <span
                    className={`input input-bordered flex min-h-12 items-center gap-2${fieldErrors.location ? " input-error" : ""}`}
                  >
                    <MapPin
                      size={17}
                      className="shrink-0 text-base-content/50"
                      aria-hidden="true"
                    />
                    <input
                      className="w-full bg-transparent outline-none"
                      name="location"
                      minLength={2}
                      maxLength={100}
                      value={form.location}
                      onChange={updateField}
                      aria-invalid={Boolean(fieldErrors.location)}
                      aria-describedby={
                        fieldErrors.location
                          ? "profile-location-error"
                          : undefined
                      }
                      required
                    />
                  </span>
                  {fieldErrors.location && (
                    <span className="field-error" id="profile-location-error">
                      {fieldErrors.location}
                    </span>
                  )}
                </label>

                <label className="form-control">
                  <span className="label">
                    <span className="label-text font-semibold">
                      Profile photo URL
                    </span>
                  </span>
                  <div className="flex gap-2">
                    <input
                      className={`input input-bordered min-h-12 min-w-0 flex-1${fieldErrors.photoUrl ? " input-error" : ""}`}
                      type="url"
                      name="photoUrl"
                      maxLength={2048}
                      placeholder="https://..."
                      value={form.photoUrl}
                      onChange={updateField}
                      aria-invalid={Boolean(fieldErrors.photoUrl)}
                      aria-describedby={
                        fieldErrors.photoUrl ? "profile-photo-error" : undefined
                      }
                    />
                    {form.photoUrl && (
                      <button
                        className="btn btn-ghost btn-square min-h-12 shrink-0"
                        type="button"
                        onClick={() => {
                          setForm((current) => ({ ...current, photoUrl: "" }));
                          setPhotoFailed(false);
                          setFieldErrors((current) => ({
                            ...current,
                            photoUrl: undefined,
                          }));
                          setSaved(false);
                        }}
                        aria-label="Clear profile photo"
                        title="Clear photo"
                      >
                        <Trash2 size={18} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                  {fieldErrors.photoUrl && (
                    <span className="field-error" id="profile-photo-error">
                      {fieldErrors.photoUrl}
                    </span>
                  )}
                  {photoFailed && form.photoUrl && (
                    <span className="label">
                      <span className="label-text-alt text-warning">
                        This image could not be loaded. Check the URL.
                      </span>
                    </span>
                  )}
                  <span className="label">
                    <span className="label-text-alt">
                      Use a public HTTP or HTTPS image URL.
                    </span>
                  </span>
                </label>

                <label className="form-control">
                  <span className="label">
                    <span className="label-text font-semibold">About you</span>
                  </span>
                  <textarea
                    className="textarea textarea-bordered min-h-28 w-full"
                    name="bio"
                    maxLength={1000}
                    value={form.bio}
                    onChange={updateField}
                    aria-invalid={Boolean(fieldErrors.bio)}
                    aria-describedby={
                      fieldErrors.bio
                        ? "profile-bio-error"
                        : "profile-bio-count"
                    }
                  />
                  {fieldErrors.bio && (
                    <span className="field-error" id="profile-bio-error">
                      {fieldErrors.bio}
                    </span>
                  )}
                  <span className="label">
                    <span id="profile-bio-count" className="label-text-alt">
                      {form.bio.length}/1000
                    </span>
                  </span>
                </label>

                <TagInput
                  label="Skills"
                  name="skills"
                  values={form.skills}
                  onChange={(values) => updateTags("skills", values)}
                  onClearError={() =>
                    setFieldErrors((current) => ({
                      ...current,
                      skills: undefined,
                    }))
                  }
                  maxItems={5}
                  placeholder="Add a skill, then press Enter"
                  error={fieldErrors.skills}
                />
                <TagInput
                  label="Interests"
                  name="interests"
                  values={form.interests}
                  onChange={(values) => updateTags("interests", values)}
                  onClearError={() =>
                    setFieldErrors((current) => ({
                      ...current,
                      interests: undefined,
                    }))
                  }
                  maxItems={20}
                  placeholder="Add an interest, then press Enter"
                  error={fieldErrors.interests}
                />
              </div>
            </form>

            <div className="profile-actions">
              <button
                className="btn btn-primary min-h-12 flex-1"
                type="submit"
                form="profile-edit-form"
                disabled={!isDirty || submitting}
              >
                {submitting ? (
                  <span
                    className="loading loading-spinner"
                    aria-label="Saving profile"
                  />
                ) : (
                  "Save profile"
                )}
              </button>
              <button
                className="btn btn-ghost min-h-12"
                type="button"
                onClick={discardChanges}
                disabled={!isDirty || submitting}
              >
                Discard
              </button>
            </div>
          </div>
        )}
      </div>

      {blocker.state === "blocked" && (
        <dialog
          className="modal modal-open"
          open
          aria-labelledby="profile-unsaved-title"
          aria-describedby="profile-unsaved-description"
        >
          <div className="modal-box">
            <h2 className="text-lg font-bold" id="profile-unsaved-title">
              Discard unsaved changes?
            </h2>
            <p
              className="py-3 text-sm text-base-content/70"
              id="profile-unsaved-description"
            >
              Your profile edits haven’t been saved.
            </p>
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                type="button"
                onClick={cancelNavigation}
              >
                Stay here
              </button>
              <button
                className="btn btn-error"
                type="button"
                onClick={discardAndNavigate}
              >
                Discard and leave
              </button>
            </div>
          </div>
          <button
            className="modal-backdrop"
            type="button"
            aria-label="Stay on profile"
            onClick={cancelNavigation}
          >
            close
          </button>
        </dialog>
      )}
    </section>
  );
};

export default Profile;
