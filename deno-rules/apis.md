# Deno APIs

## Environment Variables

```ts
// Get environment variable (returns string | undefined)
const value = Deno.env.get("KEY_NAME");

// Set environment variable
Deno.env.set("KEY_NAME", "value");

// Check if running in Deno
if (typeof Deno !== "undefined") {
    // Deno-specific code
}
```

## File System Operations

```ts
// Read text file
const content = await Deno.readTextFile("path/to/file.txt");

// Write text file
await Deno.writeTextFile("path/to/file.txt", content);

// Read file as bytes
const bytes = await Deno.readFile("path/to/file.bin");

// Create temporary file
const tempFile = Deno.makeTempFileSync({ suffix: ".txt" });

// Remove file
Deno.removeSync("path/to/file.txt");

// Check if file exists
const exists = await Deno.stat("path/to/file.txt").catch(() => null) !== null;
```

## Network Operations

```ts
// Create HTTP server
const server = Deno.serve(
    { port: 8080, onListen: ({ port }) => console.log(`Listening on ${port}`) },
    handler,
);

// Shutdown server gracefully
server.shutdown();

// Connect to TCP server
const connection = await Deno.connect({
    hostname: "localhost",
    port: 6379,
});
```

## Signal Handling

```ts
// Listen for SIGTERM (important for containerized deployments)
Deno.addSignalListener("SIGTERM", () => {
    // Cleanup resources
    server.shutdown();
    database.close();
    Deno.exit(0);
});

// Listen for SIGINT (Ctrl+C)
Deno.addSignalListener("SIGINT", () => {
    // Handle graceful shutdown
});
```
