import { MongoClient, type Db } from "mongodb";
import type { ShutdownManager } from "../../core/lifecycle/shutdown-manager.js";

export async function connectMongo(
  url: string,
  database: string,
  lifecycle: ShutdownManager,
): Promise<Db> {
  const client = new MongoClient(url);
  await client.connect();
  lifecycle.register({ name: "mongodb", phase: "connections", close: () => client.close() });
  return client.db(database);
}
