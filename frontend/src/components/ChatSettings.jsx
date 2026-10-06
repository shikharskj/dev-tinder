export default function ChatSettings({ preferences, onPreferenceChange }) {
  return (
    <details className="chat-settings">
      <summary>Privacy and chat settings</summary>
      <div className="chat-settings__content">
        <label className="label cursor-pointer gap-2">
          <input
            className="checkbox checkbox-sm"
            type="checkbox"
            checked={preferences.readReceiptsEnabled}
            onChange={(event) =>
              onPreferenceChange({
                readReceiptsEnabled: event.target.checked,
              })
            }
          />
          <span className="label-text">Share read receipts</span>
        </label>
        <label className="label cursor-pointer gap-2">
          <input
            className="checkbox checkbox-sm"
            type="checkbox"
            checked={preferences.activitySharingEnabled}
            onChange={(event) =>
              onPreferenceChange({
                activitySharingEnabled: event.target.checked,
              })
            }
          />
          <span className="label-text">Share activity status</span>
        </label>
      </div>
    </details>
  );
}
