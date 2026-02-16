# Function Types

## Function Signatures

```ts
// Regular function
function processData(data: InputData): OutputData {
    // Implementation
}

// Async function
async function fetchData(url: string): Promise<Data> {
    // Implementation
}

// Arrow function with explicit return type
const handler = async (context: Context): Promise<Response> => {
    // Implementation
};

// Function type alias
type Handler = (context: Context) => Promise<Response>;
```

## Higher-Order Functions

```ts
type Handler = (context: Context) => Promise<Response>;

function createHandler(service: Service): Handler {
    return async (context: Context) => {
        const data = await service.getData();
        return createResponse(data);
    };
}

// Generic higher-order function
function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
    fn: T,
): T {
    return (async (...args: Parameters<T>) => {
        try {
            return await fn(...args);
        } catch (error) {
            // Error handling
            throw error;
        }
    }) as T;
}
```
