import type { ErrorRequestHandler, RequestHandler } from "express";
import { AppError } from "../../../core/errors/app-error.js";
import type { AppLogger } from "../../../core/logging/logger.js";
import { ZodError } from "zod";

export const notFoundHandler: RequestHandler = (request, response) => {
  response.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
};

export function createErrorHandler(logger: AppLogger): ErrorRequestHandler {
  return (error: unknown, _request, response, _next) => {
    if (error instanceof ZodError) {
      response.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: error.issues,
        },
      });
      return;
    }
    if (error instanceof AppError) {
      response.status(error.statusCode).json({
        error: { code: error.code, message: error.message, details: error.details },
      });
      return;
    }
    logger.error({ error }, "unhandled request error");
    response
      .status(500)
      .json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
  };
}
