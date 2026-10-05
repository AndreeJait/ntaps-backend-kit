import { AppError } from "../../../../core/errors/app-error.js";
import type { Example } from "../../domain/example.js";
import type { ExampleRepository } from "../ports/example-repository.js";

export class GetExample {
  constructor(private readonly repository: ExampleRepository) {}

  async execute(id: string): Promise<Example> {
    const result = await this.repository.findById(id);
    if (!result) throw new AppError("Example not found", "EXAMPLE_NOT_FOUND", 404);
    return result;
  }
}
