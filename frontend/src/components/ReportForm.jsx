export default function ReportForm({
  reason,
  details,
  onReasonChange,
  onDetailsChange,
  onCancel,
  onSubmit,
}) {
  return (
    <form className="chat-report-form px-4" onSubmit={onSubmit}>
      <label className="form-control">
        <span className="label-text">Why are you reporting this chat?</span>
        <select
          className="select select-bordered"
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
        >
          <option value="spam">Spam</option>
          <option value="harassment">Harassment</option>
          <option value="inappropriate">Inappropriate content</option>
          <option value="other">Other</option>
        </select>
      </label>
      <textarea
        className="textarea textarea-bordered"
        maxLength={1000}
        value={details}
        onChange={(event) => onDetailsChange(event.target.value)}
        placeholder="Optional details for the moderation team"
        aria-label="Report details"
      />
      <div className="flex justify-end gap-2">
        <button
          className="btn btn-ghost btn-sm"
          type="button"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button className="btn btn-error btn-sm" type="submit">
          Submit report
        </button>
      </div>
    </form>
  );
}
