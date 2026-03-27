import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { describe, expect, it } from "vitest";
import { encrypt } from "../src/lib/encrypt";
import { loadConfig } from "../src/lib/loader";

describe("loadConfig", () => {
  it("decrypts config from file", () => {
    const masterKey = "test-master-key";
    const data = { service: { apiKey: "abc" } };

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "secure-config-"));
    const filePath = path.join(dir, "config.enc.json");

    const payloadResult = encrypt(data, masterKey);
    expect(payloadResult.status).toBe(true);
    if (!payloadResult.status) {
      throw new Error("Expected encryption to succeed");
    }

    fs.writeFileSync(filePath, JSON.stringify(payloadResult.data), "utf8");

    const configResult = loadConfig<typeof data>({ filePath, masterKey });
    expect(configResult).toEqual({ status: true, data });
  });

  it("uses fallback when MASTER_KEY is missing", () => {
    const fallback = () => ({ a: 1, b: "c" });

    const configResult = loadConfig({
      filePath: "./missing-file.json",
      masterKey: undefined,
      fallback,
    });

    expect(configResult).toEqual({ status: true, data: fallback() });
  });

  it("throws when MASTER_KEY and fallback are missing", () => {
    expect(loadConfig({ masterKey: undefined })).toEqual({
      status: false,
      data: "Missing MASTER_KEY and no fallback provided",
    });
  });
});
