# Visitor Counter API

A high-performance, serverless counter service built with Cloudflare Workers, Hono, and Effect.ts. It supports both persistent total counts (e.g., page views) and realtime active user counts via WebSockets.

## Features

- **Persistent Counters**: Store total counts reliably using Cloudflare D1 (SQLite).
- **Realtime Counters**: Track active users in real-time using WebSockets and Redis.
- **Admin Dashboard**: Built-in Web UI to manage counters and view statistics.
- **Type-Safe**: Built with TypeScript and Effect.ts for robust error handling and logic.
- **Serverless**: Designed to run on Cloudflare Workers.

## Tech Stack

- **Framework**: [Hono](https://hono.dev/)
- **Runtime**: [Cloudflare Workers](https://workers.cloudflare.com/)
- **Database**: [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite)
- **Realtime**: [Upstash Redis](https://upstash.com/) (via [Serverless Redis HTTP](https://github.com/hiett/serverless-redis-http) for local dev)
- **Logic**: [Effect.ts](https://effect.website/)

## API Reference

### Total Counters (`/counters`)

Persistent counters for things like page views, downloads, etc.

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/` | Create a new counter. Body: `{ "key": "my-counter" }` | No |
| `GET` | `/` | List all counter keys (text format). | No |
| `GET` | `/:key` | Get the current value of a counter. | No |
| `GET` / `PATCH` | `/:key/increment` | Increment a counter by 1. | No |
| `PUT` | `/:key` | Set a counter to a specific value. Body: `{ "val": 123 }` | **Yes** |
| `DELETE` | `/:key` | Delete a counter. | **Yes** |

### Realtime Counters (`/realtime`)

Ephemeral counters for tracking active sessions.

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/:key/connect` | Connect via WebSocket to track presence. | No |
| `GET` | `/:key` | Get the current active count. | No |
| `PUT` | `/:key` | Set the active count (simulated users). Body: `{ "val": 5 }` | **Yes** |
| `DELETE` | `/:key` | Reset the active count. | **Yes** |

### Admin (`/admin`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Access the Admin Dashboard (HTML). |

**Authentication**: Admin endpoints require an `Authorization: Bearer <ADMIN_SECRET>` header. The Admin UI handles this via a login prompt.

## Example Usage

### Persistent Counters

**1. Create a new counter**

#### cURL
```bash
curl -X POST https://your-worker.workers.dev/counters \
  -H "Content-Type: application/json" \
  -d '{"key": "page-views"}'
```

#### JavaScript
```javascript
const response = await fetch("https://your-worker.workers.dev/counters", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ key: "page-views" }),
});
const result = await response.text();
console.log(result);
```

**2. Increment the counter**

You can use this endpoint directly in an `<img>` tag or via a simple fetch request.

#### cURL
```bash
curl https://your-worker.workers.dev/counters/page-views/increment
```

#### JavaScript
```javascript
await fetch("https://your-worker.workers.dev/counters/page-views/increment");
```

**3. Get the current count**

#### cURL
```bash
curl https://your-worker.workers.dev/counters/page-views
```

#### JavaScript
```javascript
const response = await fetch("https://your-worker.workers.dev/counters/page-views");
const count = await response.text();
console.log(count);
```

### Realtime Counters

**Connect via WebSocket**

#### JavaScript
```javascript
const ws = new WebSocket("wss://your-worker.workers.dev/realtime/active-users/connect");

// Listen to the 'message' event to receive updates
ws.addEventListener("message", (event) => {
  // The server sends the count as a raw string (e.g., "5")
  const count = Number(event.data);
  console.log("Current active users:", count);
});

// Optional: Log when connected
ws.addEventListener("open", () => {
  console.log("Connected to WebSocket");
  // Keep the connection alive by sending a ping every 10 seconds
  setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send("ping");
    }
  }, 10000);
});
```

#### CLI (wscat)
```bash
npx wscat -c wss://your-worker.workers.dev/realtime/active-users/connect
```

## Local Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/)
- [Docker](https://www.docker.com/) (for local Redis)

### Setup

1.  **Install Dependencies**
    ```bash
    pnpm install
    ```

2.  **Initialize Database (D1)**
    Creates the local SQLite database and applies the schema.
    ```bash
    npm run init:database:local
    ```

3.  **Start Local Redis**
    Starts a standard Redis container and the Serverless Redis HTTP (SRH) proxy to mimic Upstash locally.
    ```bash
    # Start Redis
    npm run init:redis:local
    
    # Start SRH Proxy
    npm run init:redis:srh:local
    ```

4.  **Start Development Server**
    ```bash
    pnpm dev
    ```
    The API will be available at `http://localhost:7817`.

### Environment Variables

Create a `.dev.vars` file for local secrets (optional, as defaults work for local dev):

```ini
ADMIN_SECRET=your_secret_password
UPSTASH_REDIS_REST_URL=http://127.0.0.1:15384
UPSTASH_REDIS_REST_TOKEN=HELLOWORLD
```

## Deployment

Deploy to Cloudflare Workers using Wrangler:

```bash
pnpm deploy
```

Ensure you have set up the secrets in Cloudflare:

```bash
npx wrangler secret put ADMIN_SECRET
npx wrangler secret put UPSTASH_REDIS_REST_URL
npx wrangler secret put UPSTASH_REDIS_REST_TOKEN
```

## License

This project is licensed under the [MIT License](./LICENSE).
