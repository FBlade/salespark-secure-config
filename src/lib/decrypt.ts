import * as crypto from "crypto";
import { getKey } from "./utils";
import { validateConfig } from "./schema";
import type { SchemaField } from "./schema";

type EncryptedPayload = {
  iv: string;
  authTag: string;
  content: string;
};

/******************************************************************
 * ##: Decrypt encrypted payload into configuration data
 * Decrypts AES-256-GCM payload and optionally validates required schema fields.
 * @param {EncryptedPayload} payload - Encrypted payload data
 * @param {string} masterKey - Master key used to derive the encryption key
 * @param {SchemaField[]} schema - Required schema fields to validate (optional)
 * @returns {SalesParkContract<T>} - Decrypted configuration object or error
 * History:
 * 27-03-2026: Created
 ******************************************************************/
function decrypt<T = unknown>(
  payload: EncryptedPayload,
  masterKey: string,
  schema: SchemaField[] = []
): SalesParkContract<T> {
  try {
    const keyResult = getKey(masterKey);
    if (!keyResult.status) {
      return { status: false, data: keyResult.data };
    }

    if (
      !payload ||
      typeof payload.iv !== "string" ||
      typeof payload.authTag !== "string" ||
      typeof payload.content !== "string"
    ) {
      return { status: false, data: "Invalid encrypted payload" };
    }

    if (!payload.iv || !payload.authTag || !payload.content) {
      return { status: false, data: "Invalid encrypted payload" };
    }

    const iv = Buffer.from(payload.iv, "base64");
    const authTag = Buffer.from(payload.authTag, "base64");
    const encrypted = Buffer.from(payload.content, "base64");

    if (iv.length === 0 || authTag.length === 0 || encrypted.length === 0) {
      return { status: false, data: "Invalid encrypted payload" };
    }

    const decipher = crypto.createDecipheriv("aes-256-gcm", keyResult.data, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

    const parsed = JSON.parse(decrypted.toString("utf8")) as T;

    if (schema.length > 0) {
      const validation = validateConfig(parsed, schema);
      if (!validation.status) {
        return { status: false, data: validation.data };
      }

      return { status: true, data: validation.data };
    }

    return { status: true, data: parsed };
  } catch {
    return { status: false, data: "Decryption failed" };
  }
}

export { decrypt };
