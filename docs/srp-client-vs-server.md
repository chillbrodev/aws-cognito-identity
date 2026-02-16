# USER_SRP_AUTH: Client vs server

This note explains why **InitiateAuth** and **RespondToAuthChallenge** for USER_SRP_AUTH should be called from the **client** (browser or app), and how to use this library with that pattern.

## What we observed

- When **CognitoUser.authenticateUser()** (or equivalent) runs in the **browser** or in a **mobile app**, it calls Cognito directly. Cognito returns a full InitiateAuth response (including `Session` when required), and RespondToAuthChallenge succeeds (including with `Session: null` in some setups).
- When the **same** InitiateAuth request is made from a **server** (e.g. your backend proxying to Cognito), Cognito can return **only** `ChallengeName` and `ChallengeParameters` and **omit `Session`**. Without `Session`, you cannot call RespondToAuthChallenge, so the SRP flow cannot be completed server-side.

So the **caller** (client vs server) affects Cognito’s response. This library does not change that; it just forwards requests. The fix is **architecture**: run the SRP handshake on the client.

## Recommended pattern for web

1. **Client (browser)**  
   - Call Cognito **InitiateAuth** (USER_SRP_AUTH) with `USERNAME` and `SRP_A`.  
   - Compute the password claim (SRP) in the client; **never send the password** to your server.  
   - Call Cognito **RespondToAuthChallenge** (PASSWORD_VERIFIER) with the claim; send `Session` from InitiateAuth if present, or `null` (Cognito may accept it when the request is from the client).  
   - Receive **AuthenticationResult** (idToken, accessToken, refreshToken).

2. **Client → your server**  
   - Send the tokens (e.g. POST to `/api/auth/sign-in/complete` or similar).

3. **Server (this library)**  
   - Validate tokens, call **GetUser** if you need attributes, create your own session/cookie, store tokens as needed.  
   - Use this library for **SignUp**, **ForgotPassword**, **ConfirmForgotPassword**, and any other Cognito API that runs after you have tokens or don’t need the SRP handshake.

## Checklist when porting or adding SRP

- [ ] **InitiateAuth** is called from the **client** (browser/app), not from your backend.
- [ ] **RespondToAuthChallenge** is called from the **client**, with `Session` from InitiateAuth or `null` as required.
- [ ] Challenge parameters (e.g. `USER_ID_FOR_SRP`, `SRP_B`, `SALT`, `SECRET_BLOCK`) are read with **case-insensitive fallbacks** if your client receives them in different casing.
- [ ] **Session cookie** (or equivalent): use **Secure** only over HTTPS so localhost (http) works.
- [ ] After sign-in, **redirect/navigation** is done explicitly (e.g. 200 + JSON `{ redirect: "/path" }` + client `location.replace()`), not only 302, to avoid cancelled navigations in SPAs.

## This library’s role

- **Use it on the server** for: GetUser, SignUp, ForgotPassword, ConfirmForgotPassword, token storage, and any logic that runs after the client has completed the SRP flow and sent you tokens.
- **Do not** use it on the server to proxy InitiateAuth + RespondToAuthChallenge for USER_SRP_AUTH unless you’ve confirmed your Cognito setup returns `Session` for server-originated requests (we have not seen that with a typical public app client).

No code changes to this library are required; the behavior is determined by **where** you call Cognito (client vs server).
