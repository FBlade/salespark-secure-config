#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import { encryptToFile } from "../lib/encrypt";
import type { SchemaField } from "../lib/schema";

const rawArgs = process.argv.slice(2);
const noColor = rawArgs.includes("--no-color");
const force = rawArgs.includes("--force");
const schemaFlagIndex = rawArgs.indexOf("--schema");
const schemaPath = schemaFlagIndex >= 0 ? rawArgs[schemaFlagIndex + 1] : undefined;
const envFlagIndex = rawArgs.indexOf("--env");
const envName = envFlagIndex >= 0 ? rawArgs[envFlagIndex + 1] : undefined;
const args = rawArgs.filter((arg, index) => {
  if (arg === "--no-color" || arg === "--force" || arg === "--schema" || arg === "--env") {
    return false;
  }

  if (schemaFlagIndex >= 0 && index === schemaFlagIndex + 1) {
    return false;
  }

  if (envFlagIndex >= 0 && index === envFlagIndex + 1) {
    return false;
  }

  return true;
});
const command = args[0];

const colorEnabled = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR && !noColor;
const purpleBold = colorEnabled ? "\x1b[0;95m" : "";
const darkGray = colorEnabled ? "\x1b[90m" : "";
const orange = colorEnabled ? "\x1b[38;5;208m" : "";
const red = colorEnabled ? "\x1b[31m" : "";
const reset = colorEnabled ? "\x1b[0m" : "";

const disallowedMasterKeys = new Set(["your_key", "your_master_key", "REPLACE_WITH_YOUR_MASTER_KEY"]);
const isExampleMasterKey = (value?: string): boolean => {
  if (!value) {
    return false;
  }

  return disallowedMasterKeys.has(value.trim());
};

/******************************************************************
 * ##: Generate package label from package.json metadata
 * Reads package.json and builds a label with name and version.
 * Falls back to default if file is missing or invalid.
 * @returns {string} - Package label string
 * History:
 * 27-03-2026: Created
 ******************************************************************/
export const getPackageLabel = (): string => {
  const packageJsonPath = path.resolve(__dirname, "../../package.json");
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    const name = typeof packageJson.name === "string" ? packageJson.name : "@salespark/secure-config";
    const version = typeof packageJson.version === "string" ? packageJson.version : "";
    return version ? `${name} v${version}` : name;
  } catch {
    return "@salespark/secure-config";
  }
};

/******************************************************************
 * ##: Parse JSON content safely
 * Attempts JSON.parse and returns a SalesParkContract with status/data.
 * @param {string} raw - JSON string content
 * @returns {SalesParkContract<unknown>} - Parsed data or error message
 * History:
 * 27-03-2026: Created
 ******************************************************************/
export const parseJsonSafe = (raw: string): SalesParkContract<unknown> => {
  try {
    return { status: true, data: JSON.parse(raw) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { status: false, data: message };
  }
};

/******************************************************************
 * ##: Parse .env content into key/value pairs
 * Validates basic .env format and strips surrounding quotes.
 * @param {string} raw - .env file content
 * @returns {SalesParkContract<Record<string, string>>} - Parsed data or error
 * History:
 * 27-03-2026: Created
 ******************************************************************/
export const parseEnvSafe = (raw: string): SalesParkContract<Record<string, string>> => {
  const result: Record<string, string> = {};
  const lines = raw.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const line = lines[index].trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      return { status: false, data: `Invalid .env line ${lineNumber}` };
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (!key) {
      return { status: false, data: `Invalid .env line ${lineNumber}` };
    }

    if (value.length >= 2) {
      const firstChar = value[0];
      const lastChar = value[value.length - 1];
      if ((firstChar === '"' && lastChar === '"') || (firstChar === "'" && lastChar === "'")) {
        value = value.slice(1, -1);
      }
    }

    result[key] = value;
  }

  return { status: true, data: result };
};

/******************************************************************
 * ##: Resolve output path with trimming and fallback
 * Uses default output when input is empty or whitespace.
 * @param {string | undefined} value - Output path value
 * @returns {string} - Resolved output path
 * History:
 * 27-03-2026: Created
 ******************************************************************/
export const resolveOutputPath = (value?: string, environment?: string): string => {
  const trimmed = value?.trim();

  if (trimmed) {
    return trimmed;
  }

  if (environment) {
    return `./${environment}.config.enc.json`;
  }

  return "./config.enc.json";
};

/******************************************************************
 * ##: Parse schema JSON input
 * Validates array structure and required fields.
 * @param {string} raw - Schema JSON content
 * @returns {SalesParkContract<SchemaField[]>} - Parsed schema or error
 * History:
 * 27-03-2026: Created
 ******************************************************************/
export const parseSchemaSafe = (raw: string): SalesParkContract<SchemaField[]> => {
  const parsed = parseJsonSafe(raw);

  if (!parsed.status) {
    return parsed as SalesParkContract<SchemaField[]>;
  }

  if (!Array.isArray(parsed.data)) {
    return { status: false, data: "Schema must be an array" };
  }

  for (const entry of parsed.data) {
    if (!entry || typeof entry !== "object") {
      return { status: false, data: "Invalid schema entry" };
    }

    const record = entry as Record<string, unknown>;
    if (typeof record.path !== "string" || !record.path.trim()) {
      return { status: false, data: "Schema entry is missing a path" };
    }

    if (record.message !== undefined && typeof record.message !== "string") {
      return { status: false, data: "Schema entry message must be a string" };
    }
  }

  return { status: true, data: parsed.data as SchemaField[] };
};

const packageLabel = getPackageLabel();

/******************************************************************
 * ##: Print CLI banner
 * Displays the CLI header with package label.
 * @returns {void} - Prints banner to console
 * History:
 * 27-03-2026: Created
 ******************************************************************/
const printBanner = () => {
  console.log("==================================================");
  console.log(`${purpleBold}SalesPark Secure Config CLI${reset}`);
  console.log(`${darkGray}${packageLabel}${reset}`);
  console.log("==================================================");
  console.log("");
};

/******************************************************************
 * ##: Print CLI help information
 * Displays usage, commands, options, and examples with ANSI colors.
 * @returns {void} - Prints help to console
 * History:
 * 27-03-2026: Created
 ******************************************************************/
const printHelp = (includeBanner = true) => {
  if (includeBanner) {
    printBanner();
  }
  console.log(`${orange}Usage:${reset}`);
  console.log("  secure-config encrypt <input.json> [output.enc.json] [--schema schema.json]");
  console.log("  secure-config encrypt-env <input.env> [output.enc.json] [--schema schema.json]");
  console.log("");
  console.log(`${orange}Commands:${reset}`);
  console.log("  encrypt   Encrypt a JSON config file");
  console.log("  encrypt-env   Encrypt a .env file (flat key/value)");
  console.log("");
  console.log(`${orange}Options:${reset}`);
  console.log("  -h, --help   Show help");
  console.log("  --no-color   Disable ANSI colors");
  console.log("  --force      Overwrite output file if it exists");
  console.log("  --schema     JSON file with required fields");
  console.log("  --env        Prefix output with an environment name");
  console.log("");
  console.log(`${orange}Examples:${reset}`);
  console.log("  MASTER_KEY=YOUR_MASTER_KEY secure-config encrypt config.json config.enc.json");
  console.log("  yarn dlx secure-config encrypt config.json");
  console.log("  MASTER_KEY=YOUR_MASTER_KEY secure-config encrypt-env .env config.enc.json");
  console.log("  MASTER_KEY=YOUR_MASTER_KEY secure-config encrypt config.json config.enc.json --schema schema.json");
  console.log("  MASTER_KEY=YOUR_MASTER_KEY secure-config encrypt config.json --env dev");
  console.log("  MASTER_KEY=YOUR_MASTER_KEY secure-config encrypt config.json config.enc.json --env dev");
  console.log(`${darkGray}  Note: --env is ignored when output file is provided.${reset}`);
};

/******************************************************************
 * ##: Run CLI command handler
 * Dispatches commands and handles validation and execution flow.
 * @returns {void} - Controls CLI execution
 * History:
 * 27-03-2026: Created
 ******************************************************************/
const runCli = () => {
  if (!command || command === "-h" || command === "--help" || command === "help") {
    printHelp();
    process.exit(command ? 0 : 1);
  }

  printBanner();

  if (envFlagIndex >= 0 && !envName) {
    console.error(`${red}Missing environment name${reset}`);
    printHelp(false);
    process.exit(1);
  }

  /******************************************************************
   * ##: Execute encrypt command for secure config CLI
   * Validates input, ensures MASTER_KEY, reads JSON file and encrypts output.
   * @returns {void} - Executes encryption process
   * History:
   * 27-03-2026: Created
   ******************************************************************/
  let handled = false;

  if (command === "encrypt") {
    handled = true;
    const inputPath = args[1];
    if (args[2] && envName) {
      console.warn(`${orange}--env ignored because output file is provided.${reset}`);
    }
    const outputPath = resolveOutputPath(args[2], envName);

    if (schemaFlagIndex >= 0 && !schemaPath) {
      console.error(`${red}Missing schema file path${reset}`);
      printHelp(false);
      process.exit(1);
    }

    if (!inputPath) {
      console.error(`${red}Missing input file${reset}`);
      printHelp(false);
      process.exit(1);
    }

    const masterKey = process.env.MASTER_KEY;

    if (!masterKey) {
      console.error(`${red}Missing MASTER_KEY${reset}`);
      process.exit(1);
    }

    if (isExampleMasterKey(masterKey)) {
      console.error(`${red}MASTER_KEY looks like an example placeholder. Set a real key.${reset}`);
      process.exit(1);
    }

    if (masterKey.length < 32) {
      console.warn("Warning: MASTER_KEY is shorter than 32 characters.");
    }

    const fullInputPath = path.resolve(process.cwd(), inputPath);
    const fullOutputPath = path.resolve(process.cwd(), outputPath);

    if (!fs.existsSync(fullInputPath)) {
      console.error(`${red}Input file not found${reset}`);
      process.exit(1);
    }

    if (fs.existsSync(fullOutputPath) && !force) {
      console.error(`${red}Output file already exists. Use --force to overwrite.${reset}`);
      process.exit(1);
    }

    try {
      let schema: SchemaField[] = [];
      if (schemaPath) {
        const schemaRaw = fs.readFileSync(path.resolve(process.cwd(), schemaPath), "utf8");
        const parsedSchema = parseSchemaSafe(schemaRaw);

        if (!parsedSchema.status) {
          console.error("Invalid schema input:", parsedSchema.data);
          console.error("Schema file:", schemaPath);
          process.exit(1);
        }

        schema = parsedSchema.data;
      }

      const raw = fs.readFileSync(fullInputPath, "utf8");
      const parsed = parseJsonSafe(raw);

      if (!parsed.status) {
        console.error("Invalid JSON input:", parsed.data);
        console.error("Input file:", fullInputPath);
        process.exit(1);
      }

      console.log(`${orange}Encrypting...${reset}`);

      const result = encryptToFile({
        input: parsed.data,
        output: fullOutputPath,
        masterKey,
        schema,
      });

      if (!result.status) {
        console.error("Failed to encrypt config.");
        process.exit(1);
      }

      console.log("Config encrypted successfully");
    } catch {
      console.error(`${red}Failed to encrypt config.${reset}`);
      console.error(`${red}Input file:${reset}`, fullInputPath);
      console.error(`${red}Output file:${reset}`, fullOutputPath);
      process.exit(1);
    } finally {
      delete process.env.MASTER_KEY;
    }
  }

  /******************************************************************
   * ##: Execute encrypt-env command for secure config CLI
   * Validates input, ensures MASTER_KEY, parses .env file and encrypts output.
   * @returns {void} - Executes encryption process
   * History:
   * 27-03-2026: Created
   ******************************************************************/
  if (command === "encrypt-env") {
    handled = true;
    const inputPath = args[1];
    if (args[2] && envName) {
      console.warn(`${orange}--env ignored because output file is provided.${reset}`);
    }
    const outputPath = resolveOutputPath(args[2], envName);

    if (schemaFlagIndex >= 0 && !schemaPath) {
      console.error(`${red}Missing schema file path${reset}`);
      printHelp(false);
      process.exit(1);
    }

    if (!inputPath) {
      console.error(`${red}Missing input file${reset}`);
      printHelp(false);
      process.exit(1);
    }

    const masterKey = process.env.MASTER_KEY;

    if (!masterKey) {
      console.error(`${red}Missing MASTER_KEY${reset}`);
      process.exit(1);
    }

    if (isExampleMasterKey(masterKey)) {
      console.error(`${red}MASTER_KEY looks like an example placeholder. Set a real key.${reset}`);
      process.exit(1);
    }

    if (masterKey.length < 32) {
      console.warn("Warning: MASTER_KEY is shorter than 32 characters.");
    }

    const fullInputPath = path.resolve(process.cwd(), inputPath);
    const fullOutputPath = path.resolve(process.cwd(), outputPath);

    if (!fs.existsSync(fullInputPath)) {
      console.error(`${red}Input file not found${reset}`);
      process.exit(1);
    }

    if (fs.existsSync(fullOutputPath) && !force) {
      console.error(`${red}Output file already exists. Use --force to overwrite.${reset}`);
      process.exit(1);
    }

    try {
      let schema: SchemaField[] = [];
      if (schemaPath) {
        const schemaRaw = fs.readFileSync(path.resolve(process.cwd(), schemaPath), "utf8");
        const parsedSchema = parseSchemaSafe(schemaRaw);

        if (!parsedSchema.status) {
          console.error("Invalid schema input:", parsedSchema.data);
          console.error("Schema file:", schemaPath);
          process.exit(1);
        }

        schema = parsedSchema.data;
      }

      const raw = fs.readFileSync(fullInputPath, "utf8");
      const parsed = parseEnvSafe(raw);

      if (!parsed.status) {
        console.error("Invalid .env input:", parsed.data);
        console.error("Input file:", fullInputPath);
        process.exit(1);
      }

      console.log(`${orange}Encrypting...${reset}`);

      const result = encryptToFile({
        input: parsed.data,
        output: fullOutputPath,
        masterKey,
        schema,
      });

      if (!result.status) {
        console.error("Failed to encrypt config.");
        process.exit(1);
      }

      console.log("Config encrypted successfully");
    } catch {
      console.error(`${red}Failed to encrypt config.${reset}`);
      console.error(`${red}Input file:${reset}`, fullInputPath);
      console.error(`${red}Output file:${reset}`, fullOutputPath);
      process.exit(1);
    } finally {
      delete process.env.MASTER_KEY;
    }
  }

  if (!handled) {
    console.error(`${red}Unknown command:${reset}`, command);
    printHelp(false);
    process.exit(1);
  }
};

if (require.main === module) {
  runCli();
}
