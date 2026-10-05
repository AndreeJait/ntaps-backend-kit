import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

export interface RequestContext {
  requestId: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export const requestContextMiddleware: RequestHandler = (request, response, next) => {
  const incoming = request.header("x-request-id");
  const requestId = incoming && incoming.length <= 128 ? incoming : randomUUID();
  response.setHeader("x-request-id", requestId);
  requestContext.run({ requestId }, next);
};
