# Code Quality

## Code Formatting

Deno has built-in formatting via `deno fmt`:

```bash
deno fmt                    # Format all files
deno fmt path/to/file.ts    # Format specific file
```

Configure formatting in `deno.jsonc`:

```jsonc
{
    "fmt": {
        "lineWidth": 80,
        "semiColons": true,
        "singleQuote": true,
        "proseWrap": "preserve",
        "include": ["src/"],
        "exclude": ["testdata/", "*.md"]
    }
}
```

## Type Checking

```bash
# Type check entire project
deno check src/main.ts

# Type check specific file
deno check path/to/file.ts

# Type check with detailed output
deno check --unstable path/to/file.ts
```

Use `deno check` to verify type safety before making changes.
