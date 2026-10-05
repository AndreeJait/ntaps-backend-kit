import { createSchema, createYoga } from "graphql-yoga";
import { createAppContext } from "../bootstrap/context.js";
import { run } from "../bootstrap/run.js";
import { loadConfig } from "../core/config/env.js";
import { GetExample } from "../modules/example/application/use-cases/get-example.js";
import { InMemoryExampleRepository } from "../modules/example/infrastructure/persistence/in-memory-example.repository.js";
import { listenHttp } from "../presentation/http/listen.js";

const context = createAppContext(loadConfig());

await run(context, async () => {
  const getExample = new GetExample(new InMemoryExampleRepository());
  const schema = createSchema({
    typeDefs: /* GraphQL */ `
      type Example {
        id: ID!
        message: String!
      }
      type Health {
        status: String!
      }
      type Query {
        example(id: ID!): Example!
        health: Health!
      }
    `,
    resolvers: {
      Query: {
        example: (_parent: unknown, args: { id: string }) => getExample.execute(args.id),
        health: () => ({ status: context.health.state }),
      },
    },
  });
  const yoga = createYoga({
    schema,
    graphqlEndpoint: "/graphql",
    maskedErrors: context.config.environment === "production",
  });
  await listenHttp(context, yoga, context.config.ports.graphql, "graphql-http");
  context.logger.info({ port: context.config.ports.graphql }, "GraphQL listening");
});
