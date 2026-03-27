import { describe, expect, it } from "vitest";
import { validateConfig } from "../src/lib/schema";

describe("validateConfig", () => {
  it("returns config when valid", () => {
    const config = { ok: true };
    expect(validateConfig(config)).toEqual({ status: true, data: config });
  });

  it("validates schema flat keys", () => {
    const config = { apiKey: "abc", env: "prod" };
    expect(validateConfig(config, [{ path: "apiKey" }, { path: "env" }])).toEqual({
      status: true,
      data: config,
    });
  });

  it("throws when a schema key is missing", () => {
    const config = { apiKey: "abc" };
    expect(validateConfig(config, [{ path: "env" }])).toEqual({
      status: false,
      data: "Missing config: env",
    });
  });

  it("throws custom message when provided", () => {
    const config = { apiKey: "abc" };
    expect(validateConfig(config, [{ path: "env", message: "Missing env" }])).toEqual({
      status: false,
      data: "Missing env",
    });
  });

  it("throws when config is empty", () => {
    expect(validateConfig(null)).toEqual({ status: false, data: "Config is empty" });
  });
});
