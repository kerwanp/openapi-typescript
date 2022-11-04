import fs from "node:fs";
import { OpenAPI3 } from "types.js";
import openapiTS from "../dist/index.js";

const BOILERPLATE = `/**
 * This file was auto-generated by openapi-typescript.
 * Do not make direct changes to the file.
 */


/** Type helpers */
type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };
type XOR<T, U> = (T | U) extends object ? (Without<T, U> & U) | (Without<U, T> & T) : T | U;
type OneOf<T extends any[]> = T extends [infer Only] ? Only : T extends [infer A, infer B, ...infer Rest] ? OneOf<[XOR<A, B>, ...Rest]> : never;
`;

describe("openapiTS", () => {
  describe("3.1", () => {
    test("discriminator", async () => {
      const schema: OpenAPI3 = {
        openapi: "3.1",
        info: { title: "test", version: "3.1" },
        components: {
          schemas: {
            Pet: {
              type: "object",
              required: ["petType"],
              properties: { petType: { type: "string" } },
              discriminator: { propertyName: "petType", mapping: { dog: "Dog" } },
            },
            Cat: {
              allOf: [
                { $ref: 'components["schemas"]["Pet"]' },
                {
                  type: "object",
                  properties: { name: { type: "string" } },
                },
              ],
            },
            Dog: {
              allOf: [
                { $ref: 'components["schemas"]["Pet"]' },
                {
                  type: "object",
                  properties: { bark: { type: "string" } },
                },
              ],
            },
            Lizard: {
              allOf: [
                { $ref: 'components["schemas"]["Pet"]' },
                {
                  type: "object",
                  properties: { lovesRocks: { type: "boolean" } },
                },
              ],
            },
          },
        },
      };
      const generated = await openapiTS(schema);
      expect(generated).toBe(`${BOILERPLATE}
export type paths = Record<string, never>;

export interface components {
  schemas: {
    Pet: {
      petType: string;
    };
    Cat: {
      petType: "Cat";
    } & Omit<components["schemas"]["Pet"], "petType"> & {
      name?: string;
    };
    Dog: {
      petType: "dog";
    } & Omit<components["schemas"]["Pet"], "petType"> & {
      bark?: string;
    };
    Lizard: {
      petType: "Lizard";
    } & Omit<components["schemas"]["Pet"], "petType"> & {
      lovesRocks?: boolean;
    };
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}

export type operations = Record<string, never>;

export type external = Record<string, never>;
`);
    });
  });

  describe("options", () => {
    describe("exportTypes", () => {
      test("false", async () => {
        expect(
          await openapiTS(
            {
              openapi: "3.1",
              info: { title: "Test", version: "3.1" },
              components: {
                schemas: {
                  User: {
                    type: "object",
                    properties: { name: { type: "string" }, email: { type: "string" } },
                    required: ["name", "email"],
                  },
                },
              },
            },
            { exportType: false }
          )
        ).toBe(`${BOILERPLATE}
export type paths = Record<string, never>;

export interface components {
  schemas: {
    User: {
      name: string;
      email: string;
    };
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}

export type operations = Record<string, never>;

export type external = Record<string, never>;
`);
      });

      test("true", async () => {
        expect(
          await openapiTS(
            {
              openapi: "3.1",
              info: { title: "Test", version: "3.1" },
              components: {
                schemas: {
                  User: {
                    type: "object",
                    properties: { name: { type: "string" }, email: { type: "string" } },
                    required: ["name", "email"],
                  },
                },
              },
            },
            { exportType: true }
          )
        ).toBe(`${BOILERPLATE}
export type paths = Record<string, never>;

export type components = {
  schemas: {
    User: {
      name: string;
      email: string;
    };
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
};

export type operations = Record<string, never>;

export type external = Record<string, never>;
`);
      });
    });

    describe("pathParamsAsTypes", () => {
      const schema: OpenAPI3 = {
        openapi: "3.1",
        info: { title: "Test", version: "3.1" },
        paths: {
          "/user/{user_id}": {
            parameters: [{ name: "user_id", in: "path" }],
          },
        },
      };

      test("false", async () => {
        expect(await openapiTS(schema, { pathParamsAsTypes: false })).toBe(`${BOILERPLATE}
export interface paths {
  "/user/{user_id}": {
    parameters: {
      path: {
        user_id: string;
      };
    };
  };
}

export type components = Record<string, never>;

export type operations = Record<string, never>;

export type external = Record<string, never>;
`);
      });

      test("true", async () => {
        expect(await openapiTS(schema, { pathParamsAsTypes: true })).toBe(`${BOILERPLATE}
export interface paths {
  [path: \`/user/\${string}\`]: {
    parameters: {
      path: {
        user_id: string;
      };
    };
  };
}

export type components = Record<string, never>;

export type operations = Record<string, never>;

export type external = Record<string, never>;
`);
      });
    });

    describe("transform/postTransform", () => {
      const schema: OpenAPI3 = {
        openapi: "3.1",
        info: { title: "Test", version: "3.1" },
        components: {
          schemas: {
            Date: { type: "string", format: "date-time" },
          },
        },
      };

      test("transform", async () => {
        expect(
          await openapiTS(schema, {
            transform(node) {
              if ("format" in node && node.format === "date-time") return "Date";
            },
          })
        ).toBe(`${BOILERPLATE}
export type paths = Record<string, never>;

export interface components {
  schemas: {
    /** Format: date-time */
    Date: Date;
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}

export type operations = Record<string, never>;

export type external = Record<string, never>;
`);
      });

      test("postTransform (with inject)", async () => {
        const inject = `type DateOrTime = Date | number;\n`;
        expect(
          await openapiTS(schema, {
            postTransform(type, options) {
              if (options.path.includes("Date")) return "DateOrTime";
            },
            inject,
          })
        ).toBe(`${BOILERPLATE}
${inject}
export type paths = Record<string, never>;

export interface components {
  schemas: {
    /** Format: date-time */
    Date: DateOrTime;
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}

export type operations = Record<string, never>;

export type external = Record<string, never>;
`);
      });
    });
  });

  describe("snapshots", () => {
    describe("GitHub", () => {
      test("default options", async () => {
        const generated = await openapiTS(new URL("./fixtures/github-api.yaml", import.meta.url));
        expect(generated).toBe(fs.readFileSync(new URL("../examples/github-api.ts", import.meta.url), "utf8"));
      });
    });

    describe("Stripe", () => {
      test("default options", async () => {
        const generated = await openapiTS(new URL("./fixtures/stripe-api.yaml", import.meta.url));
        expect(generated).toBe(fs.readFileSync(new URL("../examples/stripe-api.ts", import.meta.url), "utf8"));
      });
    });
  });
});
