# Docker Integration

Deno works well in Docker:

```dockerfile
FROM denoland/deno:alpine-2.6.3

WORKDIR /app

# Copy dependency files
COPY deno.jsonc deno.lock ./

# Cache dependencies
RUN deno install

# Copy application code
COPY . .

# Run application
CMD ["task", "production"]
```
