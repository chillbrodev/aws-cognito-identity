# Module Resolution and Patterns

## Module Resolution

- Deno uses ES modules exclusively (no CommonJS)
- All imports must use explicit file extensions (`.ts`, `.js`)
- Import maps in `deno.jsonc` handle versioned dependencies
- No `node_modules` directory - dependencies are cached by Deno
- Supports URL imports directly:
  `import { x } from 'https://example.com/mod.ts'`

## Deno-specific Patterns

### Top-level Await

Deno supports top-level await:

```ts
const data = await fetch("https://api.example.com/data");
const json = await data.json();
```

### Web Standard APIs

Deno implements Web Standard APIs:

- `fetch()` for HTTP requests
- `Response` and `Request` objects
- `Headers` API
- `URL` and `URLSearchParams`
- `WebSocket` API
- `Worker` API

### No Package Manager

- Dependencies are specified in `deno.jsonc` imports map or via URL imports
- Run `deno install` to cache dependencies
- No `package.json` or `package-lock.json` files
- Dependencies are cached in Deno's cache directory
