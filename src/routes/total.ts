import { Effect, pipe } from "effect";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { Bindings } from "../bindings";
import { BadRequestError } from "../errors";
import { auth } from "../middleware";
import {
	create,
	get,
	increment,
	list,
	remove,
	update,
} from "../services/total";

const app = new Hono<{ Bindings: Bindings }>();

// Create a counter
app.post("/", async (c) =>
	pipe(
		Effect.tryPromise({
			try: async () => c.req.json(),
			catch: (e) => new BadRequestError((e as Error).message),
		}),
		Effect.map(({ key }) => key),
		Effect.flatMap((key) => create(c.env.DB, key)),
		Effect.map(({ content, status }) =>
			c.text(content, status as ContentfulStatusCode),
		),
		Effect.catchAll(({ _tag, message, status }) =>
			Effect.sync(() =>
				c.text(`${_tag}: ${message}`, status as ContentfulStatusCode),
			),
		),
		(effect) => Effect.runPromise(effect),
	),
);

// List all counters
app.get("/", async (c) =>
	pipe(
		list(c.env.DB),
		Effect.map(({ content, status }) =>
			c.text(content, status as ContentfulStatusCode),
		),
		Effect.catchAll(({ _tag, message, status }) =>
			Effect.sync(() =>
				c.text(`${_tag}: ${message}`, status as ContentfulStatusCode),
			),
		),
		(effect) => Effect.runPromise(effect),
	),
);

// Get value of a counter
app.get("/:key", async (c) =>
	pipe(
		get(c.env.DB, c.req.param("key")),
		Effect.map(({ content, status }) =>
			c.text(content, status as ContentfulStatusCode),
		),
		Effect.catchAll(({ _tag, message, status }) =>
			Effect.sync(() =>
				c.text(`${_tag}: ${message}`, status as ContentfulStatusCode),
			),
		),
		(effect) => Effect.runPromise(effect),
	),
);

// Increment a counter
app.on(["GET", "PATCH"], "/:key/increment", async (c) =>
	pipe(
		increment(c.env.DB, c.req.param("key")),
		Effect.map(({ content, status }) =>
			c.text(content, status as ContentfulStatusCode),
		),
		Effect.catchAll(({ _tag, message, status }) =>
			Effect.sync(() =>
				c.text(`${_tag}: ${message}`, status as ContentfulStatusCode),
			),
		),
		(effect) => Effect.runPromise(effect),
	),
);

// Delete a counter (Admin)
app.delete("/:key", auth, async (c) =>
	pipe(
		remove(c.env.DB, c.req.param("key")),
		Effect.map(({ content, status }) =>
			c.text(content, status as ContentfulStatusCode),
		),
		Effect.catchAll(({ _tag, message, status }) =>
			Effect.sync(() =>
				c.text(`${_tag}: ${message}`, status as ContentfulStatusCode),
			),
		),
		(effect) => Effect.runPromise(effect),
	),
);

// Update a counter (Admin)
app.put("/:key", auth, async (c) =>
	pipe(
		Effect.tryPromise({
			try: async () => c.req.json<{ val: number }>(),
			catch: (e) => new BadRequestError((e as Error).message),
		}),
		Effect.flatMap(({ val }) => update(c.env.DB, c.req.param("key"), val)),
		Effect.map(({ content, status }) =>
			c.text(content, status as ContentfulStatusCode),
		),
		Effect.catchAll(({ _tag, message, status }) =>
			Effect.sync(() =>
				c.text(`${_tag}: ${message}`, status as ContentfulStatusCode),
			),
		),
		(effect) => Effect.runPromise(effect),
	),
);

export default app;
