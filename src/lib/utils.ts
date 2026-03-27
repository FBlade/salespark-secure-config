import * as crypto from "crypto";

/******************************************************************
 * ##: Derive AES-256 key from master key
 * Uses SHA-256 to generate a fixed-length key.
 * @param {string} masterKey - Master key input
 * @returns {SalesParkContract<Buffer>} - Derived key buffer or error
 * History:
 * 27-03-2026: Created
 ******************************************************************/
function getKey(masterKey: string): SalesParkContract<Buffer> {
  try {
    return { status: true, data: crypto.createHash("sha256").update(masterKey).digest() };
  } catch {
    return { status: false, data: "Key derivation failed" };
  }
}

export { getKey };
