import io from "socket.io-client";

export const createSocketConnection = () => {
  const isLocalhost = ["localhost", "127.0.0.1"].includes(
    window.location.hostname,
  );

  const socketOrigin = isLocalhost
    ? `http://${window.location.hostname}:7777`
    : window.location.origin;

  return io(socketOrigin, {
    withCredentials: true,
    path: "/api/socket.io",
  });
};
