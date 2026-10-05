import type { ExampleRepository } from "../../application/ports/example-repository.js";
import type { Example } from "../../domain/example.js";

export class InMemoryExampleRepository implements ExampleRepository {
  readonly #items = new Map<string, Example>([
    ["welcome", { id: "welcome", message: "Template is running" }],
  ]);

  async findById(id: string): Promise<Example | undefined> {
    return this.#items.get(id);
  }
}
