# Best Practices

1. **Always use `deno task`** instead of raw `deno` commands for consistency
2. **Include file extensions** (`.ts` or `.js`) in local imports
3. **Use JSR imports** (`@std/*`) for standard library functionality
4. **Configure imports** in `deno.jsonc` rather than inline version specifiers
5. **Use `using` keyword** for automatic stub cleanup in tests
6. **Mock external services** in tests - avoid `--allow-net` flag in test
   commands
7. **Handle signals gracefully** (SIGTERM, SIGINT) for containerized deployments
8. **Use Web Standard APIs** when available (fetch, Response, etc.)
9. **Run `deno check`** before committing to catch type errors
10. **Follow formatting** - run `deno fmt` before committing
11. **Use explicit permissions** - only request what you need
12. **Leverage top-level await** for cleaner async code
13. **Cache dependencies** with `deno install` in CI/CD pipelines
