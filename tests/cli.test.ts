import * as fs from "fs";
import * as path from "path";
import { describe, expect, it } from "vitest";
import { getPackageLabel, parseEnvSafe, parseJsonSafe, resolveOutputPath } from "../src/bin/cli";

describe("cli helpers", () => {
  it("parses valid JSON", () => {
    const result = parseJsonSafe('{"ok":true}');
    expect(result.status).toBe(true);
    if (result.status) {
      expect(result.data).toEqual({ ok: true });
    }
  });

  it("returns error for invalid JSON", () => {
    const result = parseJsonSafe("{bad-json}");
    expect(result.status).toBe(false);
    if (!result.status) {
      expect(String(result.data).length).toBeGreaterThan(0);
    }
  });

  it("parses .env content into a flat object", () => {
    const input = "FOO=bar\nHELLO=world\nEMPTY=\n";
    const result = parseEnvSafe(input);
    expect(result.status).toBe(true);
    if (result.status) {
      expect(result.data).toEqual({ FOO: "bar", HELLO: "world", EMPTY: "" });
    }
  });

  it("strips surrounding quotes in .env values", () => {
    const input = "A=\"quoted\"\nB='single'";
    const result = parseEnvSafe(input);
    expect(result.status).toBe(true);
    if (result.status) {
      expect(result.data).toEqual({ A: "quoted", B: "single" });
    }
  });

  it("fails on invalid .env lines", () => {
    const result = parseEnvSafe("INVALIDLINE");
    expect(result.status).toBe(false);
  });

  it("resolves output path with trimming and fallback", () => {
    expect(resolveOutputPath(undefined)).toBe("./config.enc.json");
    expect(resolveOutputPath("")).toBe("./config.enc.json");
    expect(resolveOutputPath("   ")).toBe("./config.enc.json");
    expect(resolveOutputPath(undefined, "dev")).toBe("./dev.config.enc.json");
    expect(resolveOutputPath("", "prod")).toBe("./prod.config.enc.json");
    expect(resolveOutputPath("config.enc.json", "dev")).toBe("config.enc.json");
    expect(resolveOutputPath("./config.enc.json", "dev")).toBe("./config.enc.json");
    expect(resolveOutputPath("configs/config.enc.json", "dev")).toBe("configs/config.enc.json");
    expect(resolveOutputPath("out.enc.json")).toBe("out.enc.json");
    expect(resolveOutputPath("  out.enc.json  ")).toBe("out.enc.json");
  });

  it("builds package label from package.json", () => {
    const packageJsonPath = path.resolve(__dirname, "../package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    const expected = packageJson.version
      ? `${packageJson.name} v${packageJson.version}`
      : packageJson.name;

    expect(getPackageLabel()).toBe(expected);
  });
});
