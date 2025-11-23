import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Bindings } from "./bindings";
import adminRoutes from "./routes/admin";
import realtimeRoutes from "./routes/realtime";
import totalRoutes from "./routes/total";

const app = new Hono<{ Bindings: Bindings }>();

// Set CORS headers
app.use(
	"*",
	cors({
		origin: "*",
		allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
		allowHeaders: ["Upgrade", "Content-Type", "Authorization"],
	}),
);

// Mount routes
app.route("/counters", totalRoutes);
app.route("/realtime", realtimeRoutes);
app.route("/admin", adminRoutes);

// Root route
app.get("/", (c) =>
	c.text("Welcome to Counter API. Visit /admin to manage counters."),
);

export default app;
