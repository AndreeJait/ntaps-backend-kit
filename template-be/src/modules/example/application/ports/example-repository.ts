import type { Example } from "../../domain/example.js";

export interface ExampleRepository {
  findById(id: string): Promise<Example | undefined>;
}
