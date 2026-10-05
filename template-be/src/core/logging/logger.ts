import pino, { type Logger } from "pino";

export function createLogger(serviceName: string, level: string): Logger {
  return pino({
    name: serviceName,
    level,
    base: { service: serviceName },
    redact: {
      paths: ["req.headers.authorization", "req.headers.cookie", "password", "token", "secret"],
      censor: "[REDACTED]",
    },
  });
}

export type AppLogger = Logger;
