import { useId, useState } from "react";
import { X } from "lucide-react";

export default function TagInput({
  label,
  name,
  values,
  onChange,
  maxItems,
  placeholder,
  error,
  onClearError,
}) {
  const id = useId();
  const [draft, setDraft] = useState("");
  const [inputError, setInputError] = useState("");
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;

  function addValues(rawValues) {
    const candidates = rawValues.map((value) => value.trim()).filter(Boolean);
    const nextValues = [...values];
    const knownValues = new Set(
      values.map((value) => value.toLocaleLowerCase()),
    );
    const issues = [];

    for (const value of candidates) {
      if (value.length > 50) {
        issues.push("Each tag can be at most 50 characters.");
        continue;
      }
      if (knownValues.has(value.toLocaleLowerCase())) continue;
      if (nextValues.length >= maxItems) {
        issues.push(`You can add up to ${maxItems} ${name}.`);
        break;
      }

      knownValues.add(value.toLocaleLowerCase());
      nextValues.push(value);
    }

    onChange(nextValues);
    onClearError();
    setInputError(issues[0] || "");
    setDraft("");
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      if (draft.trim()) addValues(draft.split(/[,\n]/));
    } else if (event.key === "Backspace" && !draft && values.length > 0) {
      onChange(values.slice(0, -1));
      onClearError();
    }
  }

  function handlePaste(event) {
    const pastedText = event.clipboardData.getData("text");
    if (!/[,\n;]/.test(pastedText)) return;

    event.preventDefault();
    addValues(pastedText.split(/[,\n;]/));
  }

  const describedBy = [
    helpId,
    error ? errorId : "",
    inputError ? `${errorId}-input` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <fieldset className="form-control min-w-0">
      <legend className="label">
        <span className="label-text font-semibold">{label}</span>
      </legend>
      <div
        className={`tag-editor input input-bordered${error || inputError ? " input-error" : ""}`}
      >
        {values.map((value) => (
          <span className="badge badge-outline tag-chip" key={value}>
            {value}
            <button
              type="button"
              className="btn btn-ghost btn-xs btn-circle"
              onClick={() => {
                onChange(values.filter((item) => item !== value));
                onClearError();
                setInputError("");
              }}
              aria-label={`Remove ${value}`}
              title={`Remove ${value}`}
            >
              <X size={12} aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          id={id}
          className="tag-editor__input"
          name={name}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setInputError("");
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={values.length === 0 ? placeholder : "Add another"}
          aria-invalid={Boolean(error || inputError)}
          aria-describedby={describedBy || undefined}
          autoComplete="off"
        />
      </div>
      <span id={helpId} className="label">
        <span className="label-text-alt">
          {values.length}/{maxItems}
        </span>
      </span>
      {(error || inputError) && (
        <span
          className="field-error"
          id={error ? errorId : `${errorId}-input`}
          role="alert"
        >
          {error || inputError}
        </span>
      )}
    </fieldset>
  );
}
