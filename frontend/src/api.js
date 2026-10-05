export class ApiError extends Error {
  constructor(message, status, details = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(`/api${path}`, {
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
      result.message || "The request could not be completed.",
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
  patch: (path, body) =>
    request(path, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};
