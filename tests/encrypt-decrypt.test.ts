import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { describe, expect, it } from "vitest";
import { decrypt } from "../src/lib/decrypt";
import { encrypt, encryptToFile } from "../src/lib/encrypt";

describe("encrypt/decrypt", () => {
  it("round-trips payloads", () => {
    const masterKey = "test-master-key";
    const data = { hello: "world", n: 42 };

    const payloadResult = encrypt(data, masterKey);
    expect(payloadResult.status).toBe(true);
    if (!payloadResult.status) {
      throw new Error("Expected encryption to succeed");
    }

    const decryptedResult = decrypt<typeof data>(payloadResult.data, masterKey);
    expect(decryptedResult).toEqual({ status: true, data });
    expect(payloadResult.data.iv.length).toBeGreaterThan(0);
    expect(payloadResult.data.authTag.length).toBeGreaterThan(0);
    expect(payloadResult.data.content.length).toBeGreaterThan(0);
  });

  it("validates schema fields during encrypt/decrypt", () => {
    const masterKey = "test-master-key";
    const data = { apiKey: "abc", env: "prod" };
    const schema = [{ path: "apiKey" }, { path: "env" }];

    const payloadResult = encrypt(data, masterKey, schema);
    expect(payloadResult.status).toBe(true);
    if (!payloadResult.status) {
      throw new Error("Expected encryption to succeed");
    }

    const decryptedResult = decrypt<typeof data>(payloadResult.data, masterKey, schema);
    expect(decryptedResult).toEqual({ status: true, data });
  });

  it("throws when schema fields are missing", () => {
    const masterKey = "test-master-key";
    const data = { apiKey: "abc" };
    const schema = [{ path: "env" }];

    expect(encrypt(data, masterKey, schema)).toEqual({
      status: false,
      data: "Missing config: env",
    });
  });

  it("writes encrypted file", () => {
    const masterKey = "test-master-key";
    const data = { env: "test" };

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "secure-config-"));
    const output = path.join(dir, "config.enc.json");

    const result = encryptToFile({ input: data, output, masterKey });
    expect(result.status).toBe(true);
    if (!result.status) {
      throw new Error("Expected encryption to succeed");
    }

    const raw = fs.readFileSync(output, "utf8");
    const payload = JSON.parse(raw);

    const decrypted = decrypt<typeof data>(payload, masterKey);
    expect(decrypted).toEqual({ status: true, data });
  });
});
