import { Redis } from "@upstash/redis/cloudflare";
import { Effect, Option, pipe } from "effect";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { Bindings } from "../bindings";
import { BadRequestError, DatabaseError } from "../errors";
import { auth } from "../middleware";
import {
	connect,
	list,
	register,
	remove,
	retrieve,
	update,
} from "../services/realtime";

const app = new Hono<{ Bindings: Bindings }>();

// List all realtime keys (Admin)
const listHandler = async (c: any) =>
	pipe(
		Effect.try({
			try: () => Redis.fromEnv(c.env),
			catch: (e) => new DatabaseError((e as Error).message),
		}),
		Effect.flatMap((redis) => list(redis)),
		Effect.map((keys) => c.json(keys)),
		Effect.catchAll(({ _tag, message, status }) =>
			Effect.sync(() =>
				c.text(`${_tag}: ${message}`, status as ContentfulStatusCode),
			),
		),
		(effect) => Effect.runPromise(effect),
	);

app.get("/", auth, listHandler);
app.get("", auth, listHandler);

// Connect to a realtime counter
app.get("/:key/connect", async (c) => {
	return pipe(
		Effect.all({
			redis: Effect.try({
				try: () => Redis.fromEnv(c.env),
				catch: (e) => new DatabaseError((e as Error).message),
			}),
			webSocketPair: connect(c.req.header("Upgrade")),
			key: Option.match(Option.fromNullable(c.req.param("key")), {
				onNone: () => Effect.fail(new BadRequestError("Missing key")),
				onSome: (t) => Effect.succeed(t),
			}),
		}),
		Effect.flatMap(({ webSocketPair, redis, key }) =>
			register(redis, webSocketPair, key, c.executionCtx),
		),
		Effect.catchAll(({ _tag, message, status }) => {
			console.log("Error", _tag, message, status);
			return Effect.sync(() =>
				c.text(`${_tag}: ${message}`, status as ContentfulStatusCode),
			);
		}),
		(effect) => Effect.runPromise(effect),
	);
});

// Retrieve a realtime counter
app.get("/:key", async (c) =>
	pipe(
		Effect.all({
			redis: Effect.try({
				try: () => Redis.fromEnv(c.env),
				catch: (e) => new DatabaseError((e as Error).message),
			}),
			key: Option.match(Option.fromNullable(c.req.param("key")), {
				onNone: () => Effect.fail(new BadRequestError("Missing key")),
				onSome: (t) => Effect.succeed(t),
			}),
		}),
		Effect.flatMap(({ redis, key }) => retrieve(redis, key)),
		Effect.map((value) => value.toString()),
		Effect.map((value) => c.text(value)),
		Effect.catchAll(({ _tag, message, status }) =>
			Effect.sync(() =>
				c.text(`${_tag}: ${message}`, status as ContentfulStatusCode),
			),
		),
		(effect) => Effect.runPromise(effect),
	),
);

// Delete a realtime counter (Admin)
app.delete("/:key", auth, async (c) =>
	pipe(
		Effect.try({
			try: () => Redis.fromEnv(c.env),
			catch: (e) => new DatabaseError((e as Error).message),
		}),
		Effect.flatMap((redis) => remove(redis, c.req.param("key"))),
		Effect.map((content) => c.text(content)),
		Effect.catchAll(({ _tag, message, status }) =>
			Effect.sync(() =>
				c.text(`${_tag}: ${message}`, status as ContentfulStatusCode),
			),
		),
		(effect) => Effect.runPromise(effect),
	),
);

// Update a realtime counter (Admin)
app.put("/:key", auth, async (c) =>
	pipe(
		Effect.all({
			redis: Effect.try({
				try: () => Redis.fromEnv(c.env),
				catch: (e) => new DatabaseError((e as Error).message),
			}),
			body: Effect.tryPromise({
				try: async () => c.req.json<{ val: number }>(),
				catch: (e) => new BadRequestError((e as Error).message),
			}),
		}),
		Effect.flatMap(({ redis, body }) =>
			update(redis, c.req.param("key"), body.val),
		),
		Effect.map((content) => c.text(content)),
		Effect.catchAll(({ _tag, message, status }) =>
			Effect.sync(() =>
				c.text(`${_tag}: ${message}`, status as ContentfulStatusCode),
			),
		),
		(effect) => Effect.runPromise(effect),
	),
);

export default app;
