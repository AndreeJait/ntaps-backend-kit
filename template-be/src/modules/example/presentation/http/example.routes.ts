import { Router } from "express";
import { z } from "zod";
import type { GetExample } from "../../application/use-cases/get-example.js";

const paramsSchema = z.object({ id: z.string().min(1).max(100) });

export function createExampleRouter(getExample: GetExample): Router {
  const router = Router();
  router.get("/:id", async (request, response) => {
    const { id } = paramsSchema.parse(request.params);
    response.json({ data: await getExample.execute(id) });
  });
  return router;
}
