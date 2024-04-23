import { createConfig } from "@redocly/openapi-core";
import type { Readable } from "node:stream";
import type ts from "typescript";
import { validateAndBundle } from "./lib/redoc.js";
import { debug, resolveRef, scanDiscriminators } from "./lib/utils.js";
import transformSchema from "./transform/index.js";
import type { GlobalContext, OpenAPI3, OpenAPITSOptions } from "./types.js";

export * from "./lib/ts.js";
export * from "./lib/utils.js";
export * from "./transform/index.js";
export * from "./transform/components-object.js";
export * from "./transform/header-object.js";
export * from "./transform/media-type-object.js";
export * from "./transform/operation-object.js";
export * from "./transform/parameter-object.js";
export * from "./transform/path-item-object.js";
export * from "./transform/paths-object.js";
export * from "./transform/request-body-object.js";
export * from "./transform/response-object.js";
export * from "./transform/responses-object.js";
export * from "./transform/schema-object.js";
export * from "./types.js";

export const COMMENT_HEADER = `/**
 * This file was auto-generated by openapi-typescript.
 * Do not make direct changes to the file.
 */

`;

/**
 * Convert an OpenAPI schema to TypesScript AST
 * @param {string|URL|object|Readable} source OpenAPI schema source:
 *   - YAML: string
 *   - JSON: parsed object
 *   - URL: URL to a YAML or JSON file (local or remote)
 *   - Readable: Readable stream of YAML or JSON
 */
export default async function openapiTS(
  source: string | URL | OpenAPI3 | Buffer | Readable,
  options: OpenAPITSOptions = {} as Partial<OpenAPITSOptions>,
): Promise<ts.Node[]> {
  if (!source) {
    throw new Error("Empty schema. Please specify a URL, file path, or Redocly Config");
  }

  const redoc =
    options.redocly ??
    (await createConfig(
      {
        rules: {
          "operation-operationId-unique": { severity: "error" }, // throw error on duplicate operationIDs
        },
      },
      { extends: ["minimal"] },
    ));

  const schema = await validateAndBundle(source, {
    redoc,
    cwd: options.cwd instanceof URL ? options.cwd : new URL(`file://${options.cwd ?? process.cwd()}/`),
    silent: options.silent ?? false,
  });

  const ctx: GlobalContext = {
    additionalProperties: options.additionalProperties ?? false,
    alphabetize: options.alphabetize ?? false,
    arrayLength: options.arrayLength ?? false,
    defaultNonNullable: options.defaultNonNullable ?? true,
    discriminators: scanDiscriminators(schema, options),
    emptyObjectsUnknown: options.emptyObjectsUnknown ?? false,
    enum: options.enum ?? false,
    excludeDeprecated: options.excludeDeprecated ?? false,
    exportType: options.exportType ?? false,
    immutable: options.immutable ?? false,
    injectFooter: [],
    pathParamsAsTypes: options.pathParamsAsTypes ?? false,
    postTransform: typeof options.postTransform === "function" ? options.postTransform : undefined,
    propertiesRequiredByDefault: options.propertiesRequiredByDefault ?? false,
    redoc,
    silent: options.silent ?? false,
    transform: typeof options.transform === "function" ? options.transform : undefined,
    resolve($ref) {
      return resolveRef(schema, $ref, { silent: options.silent ?? false });
    },
  };

  const transformT = performance.now();
  const result = transformSchema(schema, ctx);
  debug("Completed AST transformation for entire document", "ts", performance.now() - transformT);

  return result;
}
