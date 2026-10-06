export const createClientMessageId = () => {
  return (
    globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
};

export const mergeMessage = (current, incoming) => {
  const match = current.findIndex(
    (message) =>
      String(message._id) === String(incoming._id) ||
      (incoming.clientMessageId &&
        message.clientMessageId === incoming.clientMessageId),
  );

  if (match < 0) {
    return [...current, incoming];
  }

  return current.map((message, index) =>
    index === match ? { ...message, ...incoming, pending: false } : message,
  );
};

export const formatMessageTime = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

export const formatLastActive = (value) => {
  if (!value) {
    return "Offline";
  }

  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60_000);

  if (minutes < 1) {
    return "Active just now";
  }

  if (minutes < 60) {
    return `Active ${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `Active ${hours}h ago`;
  }

  return `Active ${Math.floor(hours / 24)}d ago`;
};
