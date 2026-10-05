import { Router } from "express";
import type { HealthRegistry } from "../../../core/health/health-registry.js";

export function createHealthRouter(health: HealthRegistry): Router {
  const router = Router();
  router.get("/live", (_request, response) => response.json({ status: "ok" }));
  router.get("/ready", (_request, response) => {
    response.status(health.isReady() ? 200 : 503).json({ status: health.state });
  });
  return router;
}
