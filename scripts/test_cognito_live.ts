/**
 * Live integration test against a real Cognito User Pool.
 *
 * Put your values in a .env file in the project root (no secret required):
 *
 *   COGNITO_USER_POOL_ID=ap-southeast-1_xxxxxxxxx
 *   COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
 *   COGNITO_TEST_USERNAME=testuser@example.com
 *   COGNITO_TEST_PASSWORD=YourPassword123!
 *
 * Run: deno task test:live
 */

import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserNewPasswordRequiredException,
  CognitoUserMfaRequiredException,
} from "../cognito.ts";

/** Load .env from project root; env vars override .env values. */
async function loadEnv(): Promise<Record<string, string>> {
  const env: Record<string, string> = {};
  try {
    const envUrl = new URL("../.env", import.meta.url);
    const content = await Deno.readTextFile(envUrl);
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    }
  } catch {
    // .env missing or unreadable; rely on Deno.env only
  }
  return env;
}

let envCache: Record<string, string> | null = null;

function getEnv(name: string): string | undefined {
  if (envCache == null) throw new Error("loadEnv() must be called first");
  return envCache[name] ?? Deno.env.get(name);
}

function requireEnv(name: string): string {
  const v = getEnv(name);
  if (!v) {
    console.error(`Missing required: ${name}`);
    console.error("Add it to .env (see .env.example) or set the environment variable.");
    Deno.exit(1);
  }
  return v;
}

async function main() {
  envCache = await loadEnv();

  console.log("=== Cognito live test ===\n");

  const userPoolId = requireEnv("COGNITO_USER_POOL_ID");
  const clientId = requireEnv("COGNITO_CLIENT_ID");
  const username = requireEnv("COGNITO_TEST_USERNAME");
  const password = requireEnv("COGNITO_TEST_PASSWORD");
  const clientSecret = getEnv("COGNITO_CLIENT_SECRET");

  const pool = new CognitoUserPool(userPoolId, clientId, {
    clientSecret: clientSecret ?? undefined,
  });

  console.log("1. getCurrentUser (before sign-in)");
  const currentBefore = await pool.getCurrentUser();
  console.log("   ->", currentBefore ? currentBefore.getUsername() : "null (no cached user)\n");

  console.log("2. authenticateUser");
  const user = new CognitoUser(username, pool);
  const authDetails = new AuthenticationDetails(username, password);

  let session;
  try {
    session = await user.authenticateUser(authDetails);
  } catch (e) {
    if (e instanceof CognitoUserNewPasswordRequiredException) {
      console.log("   -> New password required (e.g. force change on first login)");
      console.log("   -> Call user.sendNewPasswordRequiredAnswer(newPassword) in your app\n");
      throw e;
    }
    if (e instanceof CognitoUserMfaRequiredException) {
      console.log("   -> MFA required; handle with user.sendMFACode(code)\n");
      throw e;
    }
    throw e;
  }

  if (!session) {
    console.log("   -> No session returned\n");
    Deno.exit(1);
  }

  console.log("   -> OK");
  const accessToken = session.getAccessToken().getJwtToken();
  console.log("   -> Access token (first 50 chars):", accessToken?.slice(0, 50) + "...\n");

  console.log("3. getSession (from cache)");
  const session2 = await user.getSession();
  console.log("   ->", session2?.isValid() ? "valid" : "invalid");
  console.log("   -> Same session:", session2 === session, "\n");

  console.log("4. getUserAttributes");
  const attrs = await user.getUserAttributes();
  console.log("   ->", attrs?.length ?? 0, "attributes");
  attrs?.slice(0, 5).forEach((a) => console.log("      -", a.getName(), ":", a.getValue()));
  if ((attrs?.length ?? 0) > 5) console.log("      ...");
  console.log();

  console.log("5. getCurrentUser (after sign-in)");
  const currentAfter = await pool.getCurrentUser();
  console.log("   ->", currentAfter?.getUsername(), "\n");

  console.log("6. signOut");
  await user.signOut();
  console.log("   -> OK\n");

  console.log("7. getCurrentUser (after sign-out)");
  const currentAfterSignOut = await pool.getCurrentUser();
  console.log("   ->", currentAfterSignOut ? currentAfterSignOut.getUsername() : "null");

  console.log("\n=== All steps passed ===\n");
}

main().catch((e) => {
  console.error("\nError:", e);
  Deno.exit(1);
});
