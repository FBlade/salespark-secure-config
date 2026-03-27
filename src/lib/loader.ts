import * as fs from "fs";
import * as path from "path";
import { decrypt } from "./decrypt";
import { validateConfig } from "./schema";
import type { SchemaField } from "./schema";

type LoadConfigOptions<T> = {
  filePath?: string;
  masterKey?: string;
  fallback?: () => T;
  schema?: SchemaField[];
};

/******************************************************************
 * ##: Load and decrypt configuration from encrypted file
 * Decrypts config and validates required schema fields or uses fallback.
 * @param {LoadConfigOptions<T>} options - Load options including schema and fallback
 * @returns {SalesParkContract<T>} - Decrypted and validated configuration or error
 * History:
 * 27-03-2026: Created
 ******************************************************************/
function loadConfig<T = unknown>({
  filePath = "./config.enc.json",
  masterKey = process.env.MASTER_KEY,
  fallback,
  schema = [],
}: LoadConfigOptions<T>): SalesParkContract<T> {
  try {
    // DEV fallback
    if (!masterKey) {
      if (!fallback) {
        return { status: false, data: "Missing MASTER_KEY and no fallback provided" };
      }

      return validateConfig(fallback(), schema);
    }

    const fullPath = path.resolve(filePath);

    const raw = fs.readFileSync(fullPath, "utf8");
    const payload = JSON.parse(raw);

    const decrypted = decrypt<T>(payload, masterKey);
    if (!decrypted.status) {
      return { status: false, data: decrypted.data };
    }

    return validateConfig(decrypted.data, schema);
  } catch {
    return { status: false, data: "Failed to load config" };
  }
}

export { loadConfig };
