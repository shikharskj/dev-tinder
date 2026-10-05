import net from "node:net";

const host = "127.0.0.1";
const port = 7777;
const timeoutMs = 60_000;
const retryDelayMs = 250;
const deadline = Date.now() + timeoutMs;

const canConnect = () =>
  new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    socket.setTimeout(500);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });

while (Date.now() < deadline) {
  if (await canConnect()) {
    console.log(`Backend is listening on ${host}:${port}. Starting frontend.`);
    process.exit(0);
  }
  await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
}

console.error(
  `Backend did not start listening on ${host}:${port} within ${timeoutMs / 1000} seconds. Check the backend startup output.`,
);
process.exit(1);
