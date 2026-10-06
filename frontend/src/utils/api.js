export class ApiError extends Error {
  constructor(message, status, details = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

const REQUEST_TIMEOUT_MS = 20_000;

async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(`/api${path}`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      ...options,
      credentials: "include",
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(
      "Unable to reach the server. Check your connection and try again.",
    );
  }

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      result.message ||
        (response.status >= 500
          ? "The server is unavailable right now. Please try again shortly."
          : "The request could not be completed."),
      response.status,
      result.data,
    );
  }

  return result;
}

export const api = {
  get: (path) => request(path),
  post: (path, body, headers = {}) =>
    request(path, {
      method: "POST",
      body: JSON.stringify(body),
      headers,
    }),
  put: (path, body) =>
    request(path, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  patch: (path, body) =>
    request(path, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  delete: (path) =>
    request(path, {
      method: "DELETE",
    }),
};
