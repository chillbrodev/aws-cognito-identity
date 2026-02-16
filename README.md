# Amazon Cognito Identity SDK for Deno

Unofficial Amazon Cognito Identity SDK for [Deno](https://deno.com/) and
TypeScript, published on [JSR](https://jsr.io). Add user sign-up and sign-in to
web and server apps with AWS Cognito (no Amplify required).

Based on
[amazon-cognito-identity-js](https://github.com/aws/aws-amplify/tree/master/packages/amazon-cognito-identity-js).
Ported from
[amazon-cognito-identity-dart-2](https://github.com/furaiev/amazon-cognito-identity-dart-2).

**Need ideas to get started?**

- Check out use cases [below](#usage).
- Authenticated access to:
  - [AppSync + GraphQL](#for-appsyncs-graphql)
  - [API Gateway + Lambda](#for-api-gateway--lambda)
  - [S3](#for-s3-uploads) (Presigned Post, GET with Authorization)
- Follow the tutorial on
  [Serverless Stack](https://serverless-stack.com/chapters/create-a-cognito-user-pool.html)
  for Cognito setup.
- [Custom storage](#use-custom-storage) for persisting sessions.
- [Client secret](#use-client-secret) for app clients that use a secret.
- [AWS credentials](#get-aws-credentials) (Identity Pools) and
  [federated logins](#get-aws-credentials-with-facebook).

## Install

```ts
import {
  AttributeArg,
  AuthenticationDetails,
  CognitoUser,
  CognitoUserMfaRequiredException,
  CognitoUserNewPasswordRequiredException,
  CognitoUserPool,
  CognitoUserSession,
} from "jsr:@cbdstudios/aws-cognito-identity";

import {
  AwsSigV4Client,
  SigV4Request,
} from "jsr:@cbdstudios/aws-cognito-identity/sig_v4";
```

Or add to your `deno.json`:

```json
{
  "imports": {
    "@cbdstudios/aws-cognito-identity": "jsr:@cbdstudios/aws-cognito-identity@1",
    "@cbdstudios/aws-cognito-identity/sig_v4": "jsr:@cbdstudios/aws-cognito-identity@1/sig_v4"
  }
}
```

## Usage

### Use Case 1. Registering a user

Create a `CognitoUserPool` with User Pool ID and Client ID, then sign up with
username, password, and optional attributes.

```ts
import {
  AttributeArg,
  CognitoUserPool,
} from "jsr:@cbdstudios/aws-cognito-identity";

const userPool = new CognitoUserPool(
  "ap-southeast-1_xxxxxxxxx",
  "xxxxxxxxxxxxxxxxxxxxxxxxxx",
);

const userAttributes = [
  new AttributeArg("first_name", "Jimmy"),
  new AttributeArg("last_name", "Wong"),
];

try {
  const data = await userPool.signUp(
    "email@example.com",
    "Password001",
    { userAttributes },
  );
  console.log(data.user, data.userConfirmed, data.userSub);
} catch (e) {
  console.error(e);
}
```

### Use Case 2. Confirming registration (SMS/email code)

```ts
import {
  CognitoUser,
  CognitoUserPool,
} from "jsr:@cbdstudios/aws-cognito-identity";

const userPool = new CognitoUserPool(
  "ap-southeast-1_xxxxxxxxx",
  "xxxxxxxxxxxxxxxxxxxxxxxxxx",
);

const cognitoUser = new CognitoUser("email@example.com", userPool);

try {
  const confirmed = await cognitoUser.confirmRegistration("123456");
  console.log(confirmed);
} catch (e) {
  console.error(e);
}
```

### Use Case 3. Resending confirmation code

```ts
const cognitoUser = new CognitoUser("email@example.com", userPool);

try {
  const status = await cognitoUser.resendConfirmationCode();
  console.log(status);
} catch (e) {
  console.error(e);
}
```

### Use Case 4. Authenticating a user (sign in)

```ts
import {
  AuthenticationDetails,
  CognitoClientException,
  CognitoUser,
  CognitoUserConfirmationNecessaryException,
  CognitoUserCustomChallengeException,
  CognitoUserEmailOtpRequiredException,
  CognitoUserMfaRequiredException,
  CognitoUserMfaSetupException,
  CognitoUserNewPasswordRequiredException,
  CognitoUserPool,
  CognitoUserSelectMfaTypeException,
  CognitoUserTotpRequiredException,
} from "jsr:@cbdstudios/aws-cognito-identity";

const userPool = new CognitoUserPool(
  "ap-southeast-1_xxxxxxxxx",
  "xxxxxxxxxxxxxxxxxxxxxxxxxx",
);
const cognitoUser = new CognitoUser("email@example.com", userPool);
const authDetails = new AuthenticationDetails(
  "email@example.com",
  "Password001",
);

let session;
try {
  session = await cognitoUser.authenticateUser(authDetails);
} catch (e) {
  if (e instanceof CognitoUserNewPasswordRequiredException) {
    // handle New Password challenge
  } else if (e instanceof CognitoUserMfaRequiredException) {
    // handle SMS_MFA challenge
  } else if (e instanceof CognitoUserSelectMfaTypeException) {
    // handle SELECT_MFA_TYPE challenge
  } else if (e instanceof CognitoUserMfaSetupException) {
    // handle MFA_SETUP challenge
  } else if (e instanceof CognitoUserTotpRequiredException) {
    // handle SOFTWARE_TOKEN_MFA challenge
  } else if (e instanceof CognitoUserEmailOtpRequiredException) {
    // handle EMAIL_OTP challenge
  } else if (e instanceof CognitoUserCustomChallengeException) {
    // handle CUSTOM_CHALLENGE challenge
  } else if (e instanceof CognitoUserConfirmationNecessaryException) {
    // handle User Confirmation Necessary
  } else if (e instanceof CognitoClientException) {
    // handle wrong username/password or other client errors
  }
  throw e;
}
console.log(session!.getAccessToken().getJwtToken());
```

### Use Case 5. Retrieve user attributes (authenticated)

```ts
let attributes;
try {
  attributes = await cognitoUser.getUserAttributes();
} catch (e) {
  console.error(e);
}
attributes?.forEach((attr) => {
  console.log("attribute", attr.getName(), "has value", attr.getValue());
});
```

### Use Case 6. Verify user attribute (authenticated)

```ts
try {
  const data = await cognitoUser.getAttributeVerificationCode("email");
  console.log(data);
  // ... obtain verification code from user ...
  const verified = await cognitoUser.verifyAttribute("email", "123456");
  console.log(verified);
} catch (e) {
  console.error(e);
}
```

### Use Case 7. Delete user attributes (authenticated)

```ts
try {
  await cognitoUser.deleteAttributes(["nickname"]);
} catch (e) {
  console.error(e);
}
```

### Use Case 8. Update user attributes (authenticated)

```ts
import { CognitoUserAttribute } from "jsr:@cbdstudios/aws-cognito-identity";

const attributes = [new CognitoUserAttribute("nickname", "joe")];
try {
  await cognitoUser.updateAttributes(attributes);
} catch (e) {
  console.error(e);
}
```

### Use Case 9. Enable SMS-MFA (authenticated; verified phone required)

```ts
try {
  const mfaEnabled = await cognitoUser.enableMfa();
  const mfaOptions = await cognitoUser.getMFAOptions();
  console.log("mfaOptions:", mfaOptions);
} catch (e) {
  console.error(e);
}
```

### Use Case 10. Disable MFA (authenticated)

```ts
try {
  const mfaDisabled = await cognitoUser.disableMfa();
  console.log(mfaDisabled);
} catch (e) {
  console.error(e);
}
```

### Use Case 11. Change password (authenticated)

```ts
try {
  const changed = await cognitoUser.changePassword(
    "oldPassword",
    "newPassword",
  );
  console.log(changed);
} catch (e) {
  console.error(e);
}
```

### Use Case 12. Forgot password flow (unauthenticated)

```ts
const cognitoUser = new CognitoUser("email@example.com", userPool);

try {
  const data = await cognitoUser.forgotPassword();
  console.log("Code sent to", data);
  // ... prompt user for code and new password ...
  const confirmed = await cognitoUser.confirmPassword("123456", "newPassword");
  console.log(confirmed);
} catch (e) {
  console.error(e);
}
```

### Use Case 13. Delete user (authenticated)

```ts
try {
  const deleted = await cognitoUser.deleteUser();
  console.log(deleted);
} catch (e) {
  console.error(e);
}
```

### Use Case 14. Sign out

```ts
await cognitoUser.signOut();
```

### Use Case 15. Global sign out (invalidates all issued tokens)

```ts
await cognitoUser.globalSignOut();
```

### Use Case 16. Validation data for Cognito Lambda triggers

Pass key-value pairs as validation data (e.g. in `AuthenticationDetails` or
sign-up):

```ts
const validationData = {
  myCustomKey1: "myCustomValue1",
  myCustomKey2: "myCustomValue2",
};

const authDetails = new AuthenticationDetails(
  "user@example.com",
  "Password001",
  validationData,
);
```

**Security:** With `USER_SRP_AUTH` (the default), the password never leaves the
client as plain text—only SRP values are sent. Do **not** put the password (or
any sensitive key) in `validationData` or `clientMetadata`; those are sent as
`ClientMetadata` and the library strips known sensitive keys, but you should
never pass secrets there.

If you see a request body in the browser that is **only**
`{"email":"...","password":"..."}` (or similar), that request is from **your
application** (e.g. a form POST or a `fetch` to your own backend), not from this
SDK. This SDK’s requests to Cognito use the AWS API shape: `AuthFlow`,
`ClientId`, `AuthParameters` (e.g. `USERNAME`, `SRP_A`), and optional
`ClientMetadata`. To confirm SRP is used, look for a request to
`cognito-idp.*.amazonaws.com` with `AuthFlow: "USER_SRP_AUTH"` and
`AuthParameters` containing `SRP_A` (no plain `password` field).

### Use Case 17. Custom Authorization header (e.g. JWT)

When building a signed request, you can pass a custom header instead of AWS
SigV4:

```ts
import {
  AwsSigV4Client,
  SigV4Request,
} from "jsr:@cbdstudios/aws-cognito-identity/sig_v4";

const req = new SigV4Request(awsSigV4Client, {
  method: "POST",
  path: "/graphql",
  headers: {
    "Content-Type": "application/graphql",
    Accept: "application/json",
  },
  body: { query },
  authorizationHeader: session.getIdToken().getJwtToken(),
});
await req.sign(session.getIdToken().getJwtToken());
// use req.url, req.headers, req.body
```

### Use Case 18. Force change password (NEW_PASSWORD_REQUIRED)

When an admin creates the user and the account has status
**FORCE_CHANGE_PASSWORD**, handle the challenge and optionally set required
attributes:

```ts
try {
  session = await cognitoUser.authenticateUser(authDetails);
} catch (e) {
  if (e instanceof CognitoUserNewPasswordRequiredException) {
    try {
      if (!e.requiredAttributes?.length) {
        session = await cognitoUser.sendNewPasswordRequiredAnswer(
          "NewPassword002!",
        );
      } else {
        const attributes = { name: "Adam Kaminski" };
        session = await cognitoUser.sendNewPasswordRequiredAnswer(
          "NewPassword002!",
          attributes,
        );
      }
    } catch (inner) {
      // handle MFA or other nested challenges
      throw inner;
    }
  } else {
    throw e;
  }
}
console.log(session!.getAccessToken().getJwtToken());
```

---

## Additional features

### Get AWS credentials

Get an authenticated user’s AWS credentials (e.g. for Identity Pools). Use with
[Signature Version 4](https://docs.aws.amazon.com/general/latest/gr/signature-version-4.html)
or other AWS APIs.

```ts
import {
  AuthenticationDetails,
  CognitoCredentials,
  CognitoUser,
  CognitoUserPool,
} from "jsr:@cbdstudios/aws-cognito-identity";

const userPool = new CognitoUserPool(
  "ap-southeast-1_xxxxxxxxx",
  "xxxxxxxxxxxxxxxxxxxxxxxxxx",
);
const cognitoUser = new CognitoUser("email@example.com", userPool);
const authDetails = new AuthenticationDetails(
  "email@example.com",
  "Password001",
);

const session = await cognitoUser.authenticateUser(authDetails);

const credentials = new CognitoCredentials(
  "ap-southeast-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  userPool,
);
await credentials.getAwsCredentials(session!.getIdToken().getJwtToken());

console.log(credentials.accessKeyId);
console.log(credentials.secretAccessKey);
console.log(credentials.sessionToken);
```

### Signing requests (SigV4)

Import the SigV4 helpers from the subpath:

```ts
import {
  AwsSigV4Client,
  SigV4Request,
} from "jsr:@cbdstudios/aws-cognito-identity/sig_v4";
```

**Note:** In this Deno/TypeScript version, `SigV4Request` uses async crypto.
After constructing the request, call `await req.sign()` before using `req.url`,
`req.headers`, and `req.body`.

#### For API Gateway & Lambda

```ts
import { CognitoCredentials } from "jsr:@cbdstudios/aws-cognito-identity";
import {
  AwsSigV4Client,
  SigV4Request,
} from "jsr:@cbdstudios/aws-cognito-identity/sig_v4";

const credentials = new CognitoCredentials(identityPoolId, userPool);
await credentials.getAwsCredentials(session!.getIdToken().getJwtToken());

const endpoint = "https://xxxx.execute-api.ap-southeast-1.amazonaws.com/dev";
const client = new AwsSigV4Client(
  credentials.accessKeyId!,
  credentials.secretAccessKey!,
  endpoint,
  "execute-api",
  "ap-southeast-1",
  credentials.sessionToken,
);

const req = new SigV4Request(client, {
  method: "POST",
  path: "/projects",
  headers: { "header-1": "one", "header-2": "two" },
  queryParams: { tracking: "x123" },
  body: { color: "blue" },
});
await req.sign();

const response = await fetch(req.url, {
  method: req.method,
  headers: req.headers as Record<string, string>,
  body: req.body,
});
console.log(await response.text());
```

#### For AppSync GraphQL (IAM auth)

```ts
const client = new AwsSigV4Client(
  credentials.accessKeyId!,
  credentials.secretAccessKey!,
  "https://xxxx.appsync-api.ap-southeast-1.amazonaws.com",
  "appsync",
  "ap-southeast-1",
  credentials.sessionToken,
);

const req = new SigV4Request(client, {
  method: "POST",
  path: "/graphql",
  headers: { "Content-Type": "application/graphql; charset=utf-8" },
  body: { operationName: "GetEvent", query: queryString },
});
await req.sign();

const response = await fetch(req.url, {
  method: req.method,
  headers: req.headers as Record<string, string>,
  body: req.body,
});
```

#### For AppSync with User Pool JWT

Use the access or ID token as the `Authorization` header (no SigV4):

```ts
const endpoint =
  "https://xxxx.appsync-api.ap-southeast-1.amazonaws.com/graphql";
const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    Authorization: session!.getAccessToken().getJwtToken()!,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ operationName: "CreateItem", query: mutation }),
});
```

### Use custom storage

Implement the `CognitoStorage` interface to persist sessions (e.g. in
`localStorage`, a file, or a database).

```ts
import type { CognitoStorage } from "jsr:@cbdstudios/aws-cognito-identity";

const storage: CognitoStorage = {
  async setItem(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    return value;
  },
  async getItem(key) {
    const v = localStorage.getItem(key);
    return v != null ? JSON.parse(v) : null;
  },
  async removeItem(key) {
    localStorage.removeItem(key);
  },
  async clear() {
    localStorage.clear();
  },
};

const userPool = new CognitoUserPool(poolId, clientId, { storage });
const cognitoUser = new CognitoUser("email@example.com", userPool, { storage });
const authDetails = new AuthenticationDetails(
  "email@example.com",
  "Password001",
);
await cognitoUser.authenticateUser(authDetails);

// Later
const user = await userPool.getCurrentUser();
const session = await user!.getSession();
console.log(session?.isValid());
```

### Get AWS credentials with Facebook (federated)

Pass the provider name as the second argument to `getAwsCredentials`:

```ts
const credentials = new CognitoCredentials(identityPoolId, userPool);
await credentials.getAwsCredentials(accessToken, "graph.facebook.com");
console.log(credentials.sessionToken);
```

### Use client secret

If your app client has a client secret, set it when creating the pool:

```ts
const userPool = new CognitoUserPool(
  "ap-southeast-1_xxxxxxxxx",
  "xxxxxxxxxxxxxxxxxxxxxxxxxx",
  { clientSecret: "xxxxxxxxxxxxxxxxxxxxxxx" },
);
```

Sign-up and `getCurrentUser()` will compute and pass the secret hash when
needed.

### USER_SRP_AUTH: where to call InitiateAuth and RespondToAuthChallenge

With **USER_SRP_AUTH**, Cognito expects **InitiateAuth** and
**RespondToAuthChallenge** to be called from the **same context** (the client:
browser or mobile app). If you proxy these calls from a **server** (e.g. your
backend calls Cognito on behalf of the user), Cognito may **not return
`Session`** in the InitiateAuth response, so you cannot complete
RespondToAuthChallenge.

**Recommendation for web apps:**

- Have the **browser** call Cognito directly for InitiateAuth and
  RespondToAuthChallenge (same headers/body as this SDK; you can use `fetch` to
  `https://cognito-idp.<region>.amazonaws.com/` with
  `X-Amz-Target: AWSCognitoIdentityProviderService.InitiateAuth` and
  `RespondToAuthChallenge`). The password stays in the client; only SRP values
  are sent.
- When the client receives `AuthenticationResult` (idToken, accessToken,
  refreshToken), send those tokens to **your server**.
- Use **this library on the server** for everything after that: validate tokens,
  call GetUser, create your own session/cookie, SignUp, ForgotPassword, etc.

This library remains the right choice for server-side Cognito calls (GetUser,
SignUp, ForgotPassword, token handling). For the SRP handshake itself, call
Cognito from the client. See
[docs/srp-client-vs-server.md](./docs/srp-client-vs-server.md) for more detail
and a short checklist.

---

## Testing with a real User Pool

1. Copy `.env.example` to `.env` and set:
   - `COGNITO_USER_POOL_ID`
   - `COGNITO_CLIENT_ID`
   - `COGNITO_TEST_USERNAME`
   - `COGNITO_TEST_PASSWORD`
2. Run: `deno task test:live`\
   (requires `--allow-read --allow-net --allow-env`)

---

## JSR score

To reach a 100% [JSR score](https://jsr.io/@cbdstudios/aws-cognito-identity/score):

- **Done in this repo:** README, examples, module docs on all entrypoints, JSDoc on exported symbols, `description` in `deno.json`, no slow types.
- **On JSR:** In the package’s **Settings** on [jsr.io](https://jsr.io/), set the **description** (if not taken from `deno.json`) and mark at least one **runtime** as compatible (e.g. Deno, Node) so “at least one/two runtimes” are satisfied.
- **Provenance:** Publish from CI with a verifiable workflow so the package gets a transparency log entry. For example, link the package to your GitHub repo in JSR settings, then add a workflow that runs `deno publish` (or `npx jsr publish`) with `id-token: write` so JSR can verify the build.

---

## License

MIT
