# @salespark/secure-config

Secure, encrypted configuration loader for Node.js applications.
Replaces `.env` files with an encrypted config file decrypted at runtime using a single `MASTER_KEY`.

---

## ✨ Features

- AES-256-GCM encryption
- Single master key instead of multiple secrets
- No plaintext secrets in repository
- Runtime decryption
- Development fallback support
- Zero external dependencies
- Simple and production-ready

---

## 📦 Installation

```bash
yarn add @salespark/secure-config
# or
npm i @salespark/secure-config
```

Global CLI install:

```bash
yarn global add @salespark/secure-config
# or
npm i -g @salespark/secure-config
```

Windows note:

- If `secure-config` is not found after global install, reopen the terminal or use `npm i -g`.
- For `npx`, prefer: `npx -p @salespark/secure-config secure-config --help`.

---

## 🧠 Concept

Instead of storing secrets like this:

```bash
MONGO_URI=...
STRIPE_SECRET_KEY=...
BUNNY_API_KEY=...
```

You store them encrypted in a file:

```
config.enc.json
```

And only provide:

```bash
MASTER_KEY=REPLACE_WITH_YOUR_MASTER_KEY
```

---

## 🚀 Quick Start

### 1) Create your config file

Create a temporary `config.json`:

```json
{
  "mongo": {
    "uri": "mongodb+srv://..."
  },
  "stripe": {
    "secretKey": "sk_live_xxx"
  },
  "openAI": {
    "apiKey": "xxx"
  }
}
```

### 2) Encrypt config

```bash
MASTER_KEY=REPLACE_WITH_YOUR_MASTER_KEY secure-config encrypt config.json config.enc.json
```

No install (npx):

```bash
MASTER_KEY=REPLACE_WITH_YOUR_MASTER_KEY npx @salespark/secure-config encrypt config.json config.enc.json
```

To encrypt a `.env` file:

```bash
MASTER_KEY=REPLACE_WITH_YOUR_MASTER_KEY secure-config encrypt-env .env config.enc.json
```

No install (npx):

```bash
MASTER_KEY=REPLACE_WITH_YOUR_MASTER_KEY npx @salespark/secure-config encrypt-env .env config.enc.json
```

This will generate:

```
config.enc.json
```

You can safely commit this file.

_CLI help is also available (see example below)._

### 3) Load config in your app

```js
const { loadConfig } = require("@salespark/secure-config");

const result = loadConfig({
  filePath: "./config.enc.json",
});

if (!result.status) {
  throw new Error(String(result.data));
}

console.log(result.data.mongo.uri);
```

---

## 🧰 CLI Usage

```bash
secure-config encrypt <input.json> [output.enc.json] [--schema schema.json] [--env name]
secure-config encrypt-env <input.env> [output.enc.json] [--schema schema.json] [--env name]
```

Note:
- If you pass an explicit output file, `--env` is ignored.

Help command:

```bash
secure-config --help
```

CLI help example:

```
==================================================
SalesPark Secure Config CLI
@salespark/secure-config v1.0.0
==================================================

Usage:
  secure-config encrypt <input.json> [output.enc.json] [--schema schema.json]
  secure-config encrypt-env <input.env> [output.enc.json] [--schema schema.json]

Commands:
  encrypt   Encrypt a JSON config file
  encrypt-env   Encrypt a .env file (flat key/value)

Options:
  -h, --help   Show help
  --no-color   Disable ANSI colors
  --force      Overwrite output file if it exists
  --schema     JSON file with required fields
  --env        Prefix output with an environment name

Examples:
  MASTER_KEY=REPLACE_WITH_YOUR_MASTER_KEY secure-config encrypt config.json config.enc.json
  yarn dlx secure-config encrypt config.json
  MASTER_KEY=REPLACE_WITH_YOUR_MASTER_KEY secure-config encrypt-env .env config.enc.json
  MASTER_KEY=REPLACE_WITH_YOUR_MASTER_KEY secure-config encrypt config.json config.enc.json --schema schema.json
  MASTER_KEY=REPLACE_WITH_YOUR_MASTER_KEY secure-config encrypt config.json --env dev
  MASTER_KEY=REPLACE_WITH_YOUR_MASTER_KEY secure-config encrypt config.json config.enc.json --env dev
  Note: --env is ignored when output file is provided.
```

---

## ✅ Schema Validation

You can provide a schema file to require fields during encryption:

```json
[{ "path": "mongo.uri" }, { "path": "stripe.secretKey", "message": "Missing Stripe key" }]
```

CLI example:

```bash
MASTER_KEY=REPLACE_WITH_YOUR_MASTER_KEY secure-config encrypt config.json config.enc.json --schema schema.json
```

You can also pass schema in code:

```js
const schema = [{ path: "mongo.uri" }, { path: "stripe.secretKey" }];
```

---

## 🧪 Development Fallback

If `MASTER_KEY` is not provided, you can fallback to environment variables:

```js
const { loadConfig } = require("@salespark/secure-config");

const result = loadConfig({
  filePath: "./config.enc.json",
  fallback: () => ({
    mongo: {
      uri: process.env.MONGO_URI,
    },
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
    },
  }),
});

if (!result.status) {
  throw new Error(String(result.data));
}
```

---

## 🔑 MASTER_KEY

The MASTER_KEY is used to decrypt your configuration.

Example:

```bash
MASTER_KEY=super_secure_key node src/index.js
```

Requirements:

- Must be kept secret
- Must NOT be committed to repository
- Should be different per environment
- Recommended length: 32+ characters

Note:

- The CLI warns when `MASTER_KEY` is shorter than 32 characters.

---

## 🗂 File Structure Example

```
/config
  config.enc.json

/src
  index.ts
```

---

## 🔒 Security Model

This approach protects against:

- Repository leaks
- Accidental commits of secrets
- Backup exposure
- File system access

Important:

If both are compromised:

- config.enc.json
- MASTER_KEY

Then secrets are exposed.

---

## ✅ Best Practices

- Never log decrypted config
- Never expose config in error messages
- Never commit MASTER_KEY
- Rotate MASTER_KEY periodically
- Use different keys per environment

---

## ⚠️ Limitations

This does NOT protect against:

- Full server compromise
- Malicious runtime access
- Memory inspection attacks

---

## 📚 API

`loadConfig(options): SalesParkContract<T>`

Options:

- `filePath` (optional)  
  Path to encrypted config file (default: `./config.enc.json`)

- `masterKey` (optional)  
  Decryption key (default: `process.env.MASTER_KEY`)

- `fallback` (optional)  
  Function returning config for development

- `schema` (optional)  
  Array of `{ path, message? }` required fields

---

`encrypt(input, masterKey, schema?): SalesParkContract<EncryptedPayload>`

`decrypt(payload, masterKey, schema?): SalesParkContract<T>`

`encryptToFile(options): SalesParkContract<EncryptedPayload>`

Options:

- `input` (object)
- `output` (string)
- `masterKey` (string)
- `schema` (optional)

---

## ✅ When to Use

Use this package if:

- You want to eliminate .env files
- You deploy outside AWS or secret managers
- You want a simple, secure setup
- You prefer minimal dependencies

---

## ❌ When NOT to Use

- If you already use a full secret manager
- If you need dynamic secret rotation
- If you require centralized secret control

---

## 📄 License

MIT
