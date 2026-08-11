/* eslint-disable @typescript-eslint/no-require-imports */
// ─────────────────────────────────────────────────────────────
// patch-openid-client.js
//
// Patch openid-client to skip the strict `iss` parameter check
// that breaks Google OAuth on NextAuth v4 + Next.js 16.
//
// ROOT CAUSE:
//   openid-client v5.4+ enforces RFC 9207 strictly. Google's OIDC
//   discovery document declares
//   `authorization_response_iss_parameter_supported: true`, but
//   Google does NOT actually send `iss` in the authorization
//   response. This causes openid-client to throw
//   `RPError: iss missing from the response` on every Google login.
//
// FIX:
//   Comment out the `iss missing from the response` check in
//   openid-client's client.js. This is the same fix that Auth.js v5
//   applies by migrating to oauth4webapi (which doesn't enforce
//   RFC 9207 as strictly).
//
// This script is idempotent — it detects if the patch was already
// applied and skips. It runs as a postinstall hook in package.json
// so it executes both locally and on Vercel during build.
// ─────────────────────────────────────────────────────────────

const fs = require('node:fs');
const path = require('node:path');

const FILE = path.join(
  __dirname,
  '..',
  'node_modules',
  'openid-client',
  'lib',
  'client.js',
);

if (!fs.existsSync(FILE)) {
  console.log('[patch-openid-client] SKIP: openid-client not installed yet');
  process.exit(0);
}

const original = fs.readFileSync(FILE, 'utf8');

// Marker so we know the patch was already applied
const PATCH_MARKER = '// [patched by scripts/patch-openid-client.js — skip iss check]';

if (original.includes(PATCH_MARKER)) {
  console.log('[patch-openid-client] already patched, skipping');
  process.exit(0);
}

// The exact pattern to replace. We change the condition from
//   this.issuer.authorization_response_iss_parameter_supported &&
// to
//   false && /* patched — skip iss check */ this.issuer.authorization_response_iss_parameter_supported &&
//
// This short-circuits the `else if` to always be false, so the
// "iss missing from the response" RPError is never thrown.
const NEEDLE =
  "this.issuer.authorization_response_iss_parameter_supported &&\n      !('id_token' in params) &&\n      !('response' in parameters)";

const REPLACEMENT =
  "false && /* patched — skip iss check (Google declares iss support but doesn't send it) */\n      this.issuer.authorization_response_iss_parameter_supported &&\n      !('id_token' in params) &&\n      !('response' in parameters)";

const occurrences = original.split(NEEDLE).length - 1;

if (occurrences === 0) {
  console.log(
    '[patch-openid-client] WARN: pattern not found — openid-client may have been updated, skipping',
  );
  process.exit(0);
}

if (occurrences !== 2) {
  console.log(
    `[patch-openid-client] WARN: expected 2 occurrences, found ${occurrences} — proceeding anyway`,
  );
}

const patched = original.split(NEEDLE).join(REPLACEMENT);

fs.writeFileSync(FILE, patched, 'utf8');

// Append a marker comment at the top of the file so we know it was patched
const withMarker = `${PATCH_MARKER}\n${patched}`;
fs.writeFileSync(FILE, withMarker, 'utf8');

console.log(
  `[patch-openid-client] PATCHED ${occurrences} occurrence(s) in ${path.relative(process.cwd(), FILE)}`,
);
