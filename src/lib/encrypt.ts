import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { getKey } from "./utils";
import { validateConfig } from "./schema";
import type { SchemaField } from "./schema";

type EncryptedPayload = {
  iv: string;
  authTag: string;
  content: string;
};

type EncryptToFileOptions = {
  input: unknown;
  output: string;
  masterKey: string;
  schema?: SchemaField[];
};

/******************************************************************
 * ##: Encrypt configuration data into an AES-256-GCM payload
 * Optionally validates required schema fields before encryption.
 * @param {unknown} data - Configuration data to encrypt
 * @param {string} masterKey - Master key used to derive the encryption key
 * @param {SchemaField[]} schema - Required schema fields to validate (optional)
 * @returns {SalesParkContract<EncryptedPayload>} - Encrypted payload or error
 * History:
 * 27-03-2026: Created
 ******************************************************************/
function encrypt(data: unknown, masterKey: string, schema: SchemaField[] = []): SalesParkContract<EncryptedPayload> {
  try {
    if (schema.length > 0) {
      const validation = validateConfig(data, schema);
      if (!validation.status) {
        return { status: false, data: validation.data };
      }
    }

    const iv = crypto.randomBytes(12);
    const keyResult = getKey(masterKey);
    if (!keyResult.status) {
      return { status: false, data: keyResult.data };
    }

    const cipher = crypto.createCipheriv("aes-256-gcm", keyResult.data, iv);

    const plaintext = Buffer.from(JSON.stringify(data), "utf8");
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      status: true,
      data: {
        iv: iv.toString("base64"),
        authTag: authTag.toString("base64"),
        content: encrypted.toString("base64"),
      },
    };
  } catch {
    return { status: false, data: "Encryption failed" };
  }
}

/******************************************************************
 * ##: Encrypt configuration data and write to file
 * Validates MASTER_KEY and optional schema before writing output.
 * @param {EncryptToFileOptions} options - Encryption input/output options
 * @returns {SalesParkContract<EncryptedPayload>} - Encrypted payload or error
 * History:
 * 27-03-2026: Created
 ******************************************************************/
function encryptToFile({ input, output, masterKey, schema = [] }: EncryptToFileOptions): SalesParkContract<EncryptedPayload> {
  try {
    if (!masterKey) {
      return { status: false, data: "Missing MASTER_KEY" };
    }

    const payload = encrypt(input, masterKey, schema);
    if (!payload.status) {
      return { status: false, data: payload.data };
    }

    fs.writeFileSync(output, JSON.stringify(payload.data, null, 2), { mode: 0o600 });
    return payload;
  } catch {
    return { status: false, data: "Encryption failed" };
  }
}

// CLI usage
if (require.main === module) {
  const masterKey = process.env.MASTER_KEY;

  if (!masterKey) {
    console.error("Missing MASTER_KEY");
    process.exit(1);
  }

  const inputPath = process.argv[2];
  const outputPath = process.argv[3] || "./config.enc.json";

  if (!inputPath) {
    console.error("Usage: node encrypt.js <input.json> [output]");
    process.exit(1);
  }

  const raw = fs.readFileSync(path.resolve(inputPath), "utf8");
  const json = JSON.parse(raw);

  const result = encryptToFile({
    input: json,
    output: path.resolve(outputPath),
    masterKey,
  });

  if (!result.status) {
    console.error("Failed to encrypt config.");
    process.exit(1);
  }

  console.log("Config encrypted.");
}

export { encrypt, encryptToFile };
