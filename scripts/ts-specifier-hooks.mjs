import { extname } from "node:path";

export async function resolve(specifier, context, nextResolve) {
  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    extname(specifier) === ""
  ) {
    return nextResolve(`${specifier}.ts`, context);
  }
  return nextResolve(specifier, context);
}
