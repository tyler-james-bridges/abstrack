import { register } from "node:module";
import { dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
register("./ts-specifier-hooks.mjs", pathToFileURL(`${dir}/`));
