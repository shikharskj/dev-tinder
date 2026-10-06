# Chat

## Behavior and access rules

- A chat may be created only for an accepted connection. REST routes and socket
  events derive the signed-in user from the existing `token` cookie/JWT; a
  client-provided sender or room ID is never treated as identity.
- Conversation records are unique per sorted participant pair. Messages are
  plain text, capped at 4,000 characters, and persisted before a success
  response or socket broadcast.
- The browser supplies a unique `clientMessageId`. A retry with the same ID
  returns the saved message rather than inserting a duplicate.
- Basic users can view a rolling seven-day history. Elite users can view all
  stored messages. The server does not delete older Basic messages; upgrading
  to Elite makes their full history available again.
- Both plans can send messages after becoming accepted connections. Read
  receipts are visible only to Elite senders and only when the reader has
  enabled receipt sharing. Users can disable receipt sharing and activity
  sharing in the chat settings.
- Removing the accepted connection makes the existing conversation read-only;
  existing message history is preserved. Blocking prevents new messages,
  typing, presence, and receipt events, while retaining read-only history.
- Archive and mute are participant-specific. New incoming messages unarchive
  the recipient's conversation. Mute is persisted for notification behavior;
  the app currently has no push/browser-notification delivery to suppress.
- Reports are stored in `chatreports` and are not visible to the reported user.
  A report may include the selected message's text snapshot. Review reports
  only through an access-controlled operations account. There is no in-app
  moderator console or report-retention automation yet; establish the reviewer
  and retention process before enabling the Report action publicly.
- Online presence is shared only with accepted, unblocked connections who have
  activity sharing enabled. Last-active time is written on the final socket
  disconnect. Presence and message throttling are currently in-process memory,
  so multi-instance deployments need a shared Socket.IO adapter and a
  distributed rate limiter before scaling horizontally.

## API and socket surface

Authenticated REST API (uses the existing HTTP-only `token` cookie):

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/chat/conversations` | Conversation summaries and unread counts |
| GET | `/chat/unread-count` | Aggregate unread count for navigation |
| GET | `/chat/conversations/with/:targetUserId` | Validate/open a connection conversation |
| GET | `/chat/conversations/:conversationId/messages` | Paginated history; optional `before` message ID |
| POST | `/chat/conversations/:conversationId/messages` | Fallback to persist and deliver a message when Socket.IO is unavailable |
| POST | `/chat/conversations/:conversationId/read` | Fallback to mark received messages read when Socket.IO is unavailable |
| PATCH | `/chat/conversations/:conversationId/settings` | Set participant archive/mute values |
| PATCH | `/chat/preferences` | Set receipt/activity privacy preferences |
| POST / DELETE | `/chat/blocks/:targetUserId` | Block / unblock a user |
| POST | `/chat/conversations/:conversationId/reports` | Submit a private report |

Conversation/history routes are registered in `src/routes/chat.js`;
archive/mute/privacy routes are in `src/routes/chat/preferences.js`; block and
report routes are in `src/routes/chat/safety.js`. Shared message persistence,
read-state updates, and realtime broadcasts live in `src/utils/chatOperations.js`.

Socket.IO authenticates the same cookie at handshake. Clients request a
conversation join by conversation ID; the server verifies membership, accepted
connection state, and blocks before joining its server-derived room. Main events:
`conversation:join`, `conversation:leave`, `message:send`, `message:new`,
`chat:inbox-updated`, `typing:start`, `typing:stop`, `conversation:read`,
`message:read`, `presence:update`, `chat:blocked`, and `chat:unblocked`.
While connected, clients use `message:send` and `conversation:read`; each event
acknowledges success or failure. The REST send/read endpoints remain as fallback
for disconnects and acknowledgement timeouts. Both transports share the same
server-side persistence, read-state, and broadcast operations. REST remains the
source for initial and paginated history.

## Images and link previews

- **Images** (JPEG/PNG/WebP, max 5 MB) go straight from the browser to a
  private S3 bucket. The browser first calls
  `POST /chat/conversations/:conversationId/attachments`, which checks
  membership, accepted/unblocked state and a per-user rate limit, then returns a
  120-second presigned `PUT` URL bound to the declared type and size under
  `chat/<conversationId>/<uuid>.<ext>`. Sending the message with
  `attachmentKey` re-validates the key's conversation scope and `HEAD`s the
  object to confirm type and size. Reads use 1-hour presigned `GET` URLs added
  to each message; the bucket must stay private with Block Public Access on.
  `GET /chat/capabilities` reports whether uploads are configured
  (`AWS_REGION` + `S3_CHAT_BUCKET`); the UI hides the attach button otherwise.
- **Bucket setup:** add a CORS rule allowing `PUT` and `GET` from the app
  origin with header `Content-Type`, and a lifecycle rule to expire the
  `chat/` prefix's incomplete/orphaned uploads. The IAM principal needs only
  `s3:PutObject`, `s3:GetObject` and `s3:ListBucket`/`HeadObject` on that prefix.
  Deleting a message for everyone hides the image but does not delete the S3
  object; apply retention via lifecycle rules.
- **Link previews:** `GET /chat/link-preview?url=` fetches Open Graph metadata
  server-side. It allows only `http(s)` without credentials, resolves DNS inside
  the connection lookup and rejects private, loopback, link-local and
  multicast addresses (IPv4/IPv6, incl. IPv4-mapped), follows at most 2
  redirects (re-checked each hop), caps the response at 256 KB / 4 s, only
  accepts HTML, caches results for an hour and is rate limited. Preview images
  are only used when HTTPS.

## MongoDB indexes

Before enabling chat on a deployment, run the index setup command with that
deployment's `DB_CONNECTION_STRING`:

```sh
npm --prefix backend run chat:indexes
```

The command calls Mongoose `createIndexes()` for the chat models and prints the
resulting index names. It is safe to re-run. Unique index creation will fail if
pre-existing data violates uniqueness; resolve such conflicts explicitly rather
than dropping data or indexes automatically.

The indexes cover unique conversation pair keys, message retry IDs, chronological
message pagination, unread-message lookups, per-user preferences and presence,
and directional blocks. Verify the command's output against the production
database before deploying the UI.

## Local verification and staging smoke checks

The repository does not add unit-test files or a test framework for this
feature. Run the existing frontend gates and backend syntax checks:

```sh
npm --prefix frontend run lint
npm --prefix frontend run build
node --check backend/src/routes/chat.js
node --check backend/src/utils/chat.js
node --check backend/src/utils/socket.js
git diff --check
```

Before production rollout, exercise the following with two staging accounts:

1. Accept a connection and send messages in both directions; refresh each page
   and confirm history remains available.
2. Use a nonconnection or pending request to attempt opening a conversation,
   fetching history, joining a socket room, and sending through REST and
   Socket.IO; each operation must be denied.
3. Retry the same client message ID after simulating a lost acknowledgement;
   confirm only one database message exists.
4. Scroll to older history, check pagination/scroll preservation, and verify
   Basic history ends at seven days while Elite history remains available.
5. Send a message to an offline user; confirm their unread badge appears and
   clears after opening the conversation. Verify the count after a reload and
   on a second authenticated tab.
6. Mute and archive one account's conversation; confirm settings are
   participant-specific, archived chats can be reopened, and a new incoming
   message unarchives only the recipient.
7. Block either side during an open chat; confirm active socket access and
   messaging stop, while previously saved history remains read-only. Unblock
   and verify sending is enabled only if the connection is still accepted.
8. Disable activity sharing and receipt sharing; verify another account cannot
   see last-active/online status or read receipts. Confirm only an Elite sender
   sees a receipt when the reader has sharing enabled.
9. Submit a report and verify it is stored privately for the restricted
   moderation workflow without logging message content in application logs.

The Socket.IO endpoint uses `/socket.io` on the same production origin. Ensure
the production reverse proxy routes that path to the backend with WebSocket
upgrade support (and permits the configured `FRONTEND_ORIGIN`) before rollout.
