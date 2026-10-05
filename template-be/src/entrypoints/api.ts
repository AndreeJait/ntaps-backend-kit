import { createAppContext } from "../bootstrap/context.js";
import { run } from "../bootstrap/run.js";
import { loadConfig } from "../core/config/env.js";
import { createHttpApp } from "../presentation/http/app.js";
import { listenHttp } from "../presentation/http/listen.js";

const context = createAppContext(loadConfig());
await run(context, async () => {
  const app = await createHttpApp(context);
  await listenHttp(context, app, context.config.ports.api, "api-http");
  context.logger.info({ port: context.config.ports.api }, "API listening");
});
