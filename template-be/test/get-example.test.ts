import { describe, expect, it } from "vitest";
import { AppError } from "../src/core/errors/app-error.js";
import { GetExample } from "../src/modules/example/application/use-cases/get-example.js";
import { InMemoryExampleRepository } from "../src/modules/example/infrastructure/persistence/in-memory-example.repository.js";

describe("GetExample", () => {
  it("returns a domain result without depending on a transport", async () => {
    const useCase = new GetExample(new InMemoryExampleRepository());
    await expect(useCase.execute("welcome")).resolves.toEqual({
      id: "welcome",
      message: "Template is running",
    });
  });

  it("uses a stable application error for missing data", async () => {
    const useCase = new GetExample(new InMemoryExampleRepository());
    await expect(useCase.execute("missing")).rejects.toBeInstanceOf(AppError);
  });
});
