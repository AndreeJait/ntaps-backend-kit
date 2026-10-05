import { Client } from "@elastic/elasticsearch";
import type { ShutdownManager } from "../../core/lifecycle/shutdown-manager.js";

export async function connectElasticsearch(
  url: string,
  lifecycle: ShutdownManager,
): Promise<Client> {
  const client = new Client({ node: url });
  await client.ping();
  lifecycle.register({ name: "elasticsearch", phase: "connections", close: () => client.close() });
  return client;
}
