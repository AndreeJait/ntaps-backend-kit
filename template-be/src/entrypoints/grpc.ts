import {
  Server,
  ServerCredentials,
  type handleUnaryCall,
  type sendUnaryData,
  type ServerUnaryCall,
  type ServiceDefinition,
  type UntypedServiceImplementation,
} from "@grpc/grpc-js";
import { createAppContext } from "../bootstrap/context.js";
import { run } from "../bootstrap/run.js";
import { loadConfig } from "../core/config/env.js";

interface HealthRequest {
  service?: string;
}
interface HealthResponse {
  status: "SERVING" | "NOT_SERVING";
}

const serialize = (value: unknown) => Buffer.from(JSON.stringify(value));
const deserialize = <T>(value: Buffer): T => JSON.parse(value.toString("utf8")) as T;

const healthService: ServiceDefinition = {
  check: {
    path: "/ntaps.health.v1.Health/Check",
    requestStream: false,
    responseStream: false,
    requestSerialize: serialize,
    requestDeserialize: deserialize<HealthRequest>,
    responseSerialize: serialize,
    responseDeserialize: deserialize<HealthResponse>,
  },
};

const context = createAppContext(loadConfig());

await run(context, async () => {
  const server = new Server();
  const check: handleUnaryCall<HealthRequest, HealthResponse> = (
    _call: ServerUnaryCall<HealthRequest, HealthResponse>,
    callback: sendUnaryData<HealthResponse>,
  ) => callback(null, { status: context.health.isReady() ? "SERVING" : "NOT_SERVING" });
  server.addService(healthService, { check } satisfies UntypedServiceImplementation);

  await new Promise<void>((resolve, reject) => {
    server.bindAsync(
      `${context.config.host}:${context.config.ports.grpc}`,
      ServerCredentials.createInsecure(),
      (error) => {
        if (error) return reject(error);
        resolve();
      },
    );
  });
  context.lifecycle.register({
    name: "grpc",
    phase: "listeners",
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.tryShutdown((error) => (error ? reject(error) : resolve()));
      }),
  });
  context.logger.info({ port: context.config.ports.grpc }, "gRPC listening");
});
