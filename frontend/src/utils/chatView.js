const GROUP_GAP_MS = 5 * 60 * 1000;

const startOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

export function formatDayLabel(value, now = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const dayDiff = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (dayDiff === 0) return "Today";
  if (dayDiff === 1) return "Yesterday";

  return new Intl.DateTimeFormat(undefined, {
    weekday: dayDiff < 7 ? "long" : undefined,
    day: dayDiff < 7 ? undefined : "numeric",
    month: dayDiff < 7 ? undefined : "short",
    year:
      dayDiff < 7 || date.getFullYear() === now.getFullYear()
        ? undefined
        : "numeric",
  }).format(date);
}

// Flattens messages into date separators, an optional unread divider, and
// message entries flagged with their position inside a same-sender run.
export function buildTimeline(messages, { currentUserId, firstUnreadId } = {}) {
  const items = [];
  let previous = null;

  messages.forEach((message, index) => {
    const key = message._id || message.clientMessageId;
    const createdAt = new Date(message.createdAt);
    const validDate = !Number.isNaN(createdAt.getTime());
    const newDay =
      validDate &&
      (!previous?.date || startOfDay(previous.date) !== startOfDay(createdAt));

    if (newDay) {
      items.push({
        type: "date",
        key: `date-${startOfDay(createdAt)}`,
        label: formatDayLabel(createdAt),
      });
    }

    const showUnread =
      firstUnreadId && String(message._id) === String(firstUnreadId);
    if (showUnread) items.push({ type: "unread", key: "unread-divider" });

    const sender = String(message.senderId);
    const continuesRun =
      previous &&
      !newDay &&
      !showUnread &&
      previous.sender === sender &&
      validDate &&
      previous.date &&
      createdAt - previous.date < GROUP_GAP_MS;

    const next = messages[index + 1];
    const nextDate = next ? new Date(next.createdAt) : null;
    const nextContinues =
      next &&
      String(next.senderId) === sender &&
      nextDate &&
      validDate &&
      startOfDay(nextDate) === startOfDay(createdAt) &&
      nextDate - createdAt < GROUP_GAP_MS &&
      !(firstUnreadId && String(next._id) === String(firstUnreadId));

    items.push({
      type: "message",
      key,
      message,
      own: sender === String(currentUserId),
      groupStart: !continuesRun,
      groupEnd: !nextContinues,
    });

    previous = { sender, date: validDate ? createdAt : null };
  });

  return items;
}

// Chat-list timestamp: time today, "Yesterday", weekday this week, else date.
export function formatListTime(value, now = new Date()) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "";

  const dayDiff = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (dayDiff === 0) {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }
  if (dayDiff === 1) return "Yesterday";
  return new Intl.DateTimeFormat(undefined, {
    weekday: dayDiff < 7 ? "short" : undefined,
    day: dayDiff < 7 ? undefined : "numeric",
    month: dayDiff < 7 ? undefined : "short",
  }).format(date);
}
