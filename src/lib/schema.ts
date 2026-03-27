type SchemaField = {
  path: string;
  message?: string;
};

/******************************************************************
 * ##: Resolve nested values from a dot-separated path
 * Traverses an object safely and returns undefined if any segment is missing.
 * @param {unknown} value - Target object to traverse
 * @param {string} path - Dot-separated path (e.g., "db.url")
 * @returns {SalesParkContract<unknown>} - Resolved value or error
 * History:
 * 27-03-2026: Created
 ******************************************************************/
const getValueByPath = (value: unknown, path: string): SalesParkContract<unknown> => {
  try {
    if (!path) {
      return { status: false, data: "Path is empty" };
    }

    const segments = path.split(".");
    let current: unknown = value;

    for (const segment of segments) {
      if (current == null || typeof current !== "object") {
        return { status: true, data: undefined };
      }

      const record = current as Record<string, unknown>;
      current = record[segment];
    }

    return { status: true, data: current };
  } catch {
    return { status: false, data: "Schema lookup failed" };
  }
};

/******************************************************************
 * ##: Validate configuration against a required schema
 * Ensures config exists and required schema paths are present.
 * @param {T} config - Configuration object to validate
 * @param {SchemaField[]} schema - Required schema fields to validate
 * @returns {SalesParkContract<T>} - Validated configuration or error
 * History:
 * 27-03-2026: Created
 ******************************************************************/
function validateConfig<T>(config: T, schema: SchemaField[] = []): SalesParkContract<T> {
  try {
    if (config == null) {
      return { status: false, data: "Config is empty" };
    }

    if (schema.length > 0 && (typeof config !== "object" || config === null)) {
      return { status: false, data: "Config is not an object" };
    }

    for (const field of schema) {
      const valueResult = getValueByPath(config, field.path);

      if (!valueResult.status) {
        return { status: false, data: valueResult.data };
      }

      if (valueResult.data === undefined || valueResult.data === null) {
        return { status: false, data: field.message || `Missing config: ${field.path}` };
      }
    }

    return { status: true, data: config };
  } catch {
    return { status: false, data: "Schema validation failed" };
  }
}

export { validateConfig };
export type { SchemaField };
