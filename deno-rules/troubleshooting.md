# Troubleshooting

## "Cannot stub: non-configurable instance method"

- Try stubbing the prototype: `ClassName.prototype.method`
- Use dependency injection for better testability
- Avoid stubbing complex module namespaces
- Consider using factory patterns for testability

## Import Errors

- Ensure file extension (`.ts` or `.js`) is included in local imports
- Check `deno.jsonc` imports map for correct package names
- Verify package versions match what's in the imports map
- Ensure URLs are accessible for remote imports

## Permission Errors

- Check that required permissions are included in `deno task` commands
- For tests, ensure services are mocked (don't add `--allow-net`)
- Use `--allow-read` with specific paths when possible: `--allow-read=./data`

## Type Errors

- Run `deno check path/to/file.ts` to see detailed type errors
- Ensure all imports are properly typed
- Check that interface definitions match usage
- Verify generic type constraints are correct

## Module Resolution Errors

- Verify file extensions are present in imports
- Check import paths are correct (relative vs absolute)
- Ensure import maps in `deno.jsonc` are properly configured
- For remote imports, verify URLs are accessible
