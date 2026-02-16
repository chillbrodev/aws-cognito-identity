# Deno Tasks and Permissions

## Deno Tasks

Define reusable commands in `deno.jsonc`:

```jsonc
{
    "tasks": {
        "dev": "deno run --allow-net --watch src/main.ts",
        "test": "deno test --allow-read --allow-write",
        "lint": "deno lint",
        "fmt": "deno fmt"
    }
}
```

**Prefer `deno task` over direct `deno` commands** to ensure consistent
permissions and configuration.

## Permissions

Deno uses explicit permissions for security. Common permission flags:

- `--allow-net`: Network access (HTTP requests, TCP connections)
- `--allow-read`: File system read access
- `--allow-write`: File system write access
- `--allow-env`: Environment variable access
- `--allow-sys`: System information access
- `--allow-run`: Execute subprocesses
- `--allow-ffi`: Foreign Function Interface access

**Testing Best Practice**: Avoid adding `--allow-net` in test commands. This
ensures external services are properly mocked. Network errors during tests
indicate services aren't mocked correctly.
