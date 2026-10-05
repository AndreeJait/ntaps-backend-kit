import { createServer, type Server } from "node:http";
import type { RequestListener } from "node:http";
import type { AppContext } from "../../bootstrap/context.js";

export async function listenHttp(
  context: AppContext,
  listener: RequestListener,
  port: number,
  name: string,
): Promise<Server> {
  const server = createServer(listener);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, context.config.host, () => {
      server.off("error", reject);
      resolve();
    });
  });
  context.lifecycle.register({
    name,
    phase: "listeners",
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeIdleConnections();
      }),
  });
  return server;
}
