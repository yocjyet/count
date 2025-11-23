import { Effect, Option } from "effect";
import { DatabaseError, KeyNotFoundError } from "../errors";
import type { ResponseData } from "../params";

interface Result {
	val: number;
}

export const increment = (db: D1Database, key: string) =>
	Effect.gen(function* () {
		yield* Effect.logDebug(`[total] incrementing key=${key}`);
		const result = yield* Effect.tryPromise({
			try: async () =>
				db
					.prepare(
						"UPDATE counter SET val = val + 1 WHERE key = ? RETURNING val",
					)
					.bind(key)
					.all<Result>(),
			catch: (e) => new DatabaseError((e as Error).message),
		});

		const val = yield* Option.match(
			Option.fromNullable(result.results?.[0]?.val),
			{
				onNone: () =>
					Effect.fail(new KeyNotFoundError(`'${key}' not found in table`)),
				onSome: (val) => Effect.succeed(val),
			},
		);

		yield* Effect.logInfo(`[total] key=${key} incremented to ${val}`);
		return { content: val.toString(), status: 200 } as ResponseData;
	}).pipe(
		Effect.tapError((e) =>
			Effect.logError(`[total] increment failed for key=${key}: ${e.message}`),
		),
	);

export const create = (db: D1Database, key: string) =>
	Effect.gen(function* () {
		yield* Effect.logDebug(`[total] creating key=${key}`);
		const result = yield* Effect.tryPromise({
			try: async () =>
				db
					.prepare("INSERT INTO counter (key, val) VALUES (?, 0) RETURNING val")
					.bind(key)
					.all<Result>(),
			catch: (e) => new DatabaseError((e as Error).message),
		});

		const val = yield* Option.match(
			Option.fromNullable(result.results?.[0]?.val),
			{
				onNone: () =>
					Effect.fail(new DatabaseError("Failed to create counter")),
				onSome: (val) => Effect.succeed(val),
			},
		);

		yield* Effect.logInfo(`[total] key=${key} created with val=${val}`);
		return { content: val.toString(), status: 200 } as ResponseData;
	}).pipe(
		Effect.tapError((e) =>
			Effect.logError(`[total] create failed for key=${key}: ${e.message}`),
		),
	);

export const get = (db: D1Database, key: string) =>
	Effect.gen(function* () {
		yield* Effect.logDebug(`[total] getting key=${key}`);
		const result = yield* Effect.tryPromise({
			try: async () =>
				db
					.prepare("SELECT val FROM counter WHERE key = ?")
					.bind(key)
					.all<Result>(),
			catch: (e) => new DatabaseError((e as Error).message),
		});

		const val = yield* Option.match(
			Option.fromNullable(result.results?.[0]?.val),
			{
				onNone: () =>
					Effect.fail(new KeyNotFoundError(`'${key}' not found in table`)),
				onSome: (val) => Effect.succeed(val),
			},
		);

		yield* Effect.logDebug(`[total] got key=${key} val=${val}`);
		return { content: val.toString(), status: 200 } as ResponseData;
	}).pipe(
		Effect.tapError((e) =>
			Effect.logError(`[total] get failed for key=${key}: ${e.message}`),
		),
	);

export const list = (db: D1Database) =>
	Effect.gen(function* () {
		yield* Effect.logDebug("[total] listing counters");
		const result = yield* Effect.tryPromise({
			try: async () =>
				db.prepare("SELECT key FROM counter").all<{ key: string }>(),
			catch: (e) => new DatabaseError((e as Error).message),
		});

		const content = result.results.map((r) => r.key).join("\n");
		yield* Effect.logDebug(`[total] listed ${result.results.length} counters`);
		return { content, status: 200 } as ResponseData;
	}).pipe(
		Effect.tapError((e) =>
			Effect.logError(`[total] list failed: ${e.message}`),
		),
	);

export const remove = (db: D1Database, key: string) =>
	Effect.gen(function* () {
		yield* Effect.logDebug(`[total] removing key=${key}`);
		yield* Effect.tryPromise({
			try: async () =>
				db.prepare("DELETE FROM counter WHERE key = ?").bind(key).run(),
			catch: (e) => new DatabaseError((e as Error).message),
		});
		yield* Effect.logInfo(`[total] removed key=${key}`);
		return { content: "Deleted", status: 200 } as ResponseData;
	}).pipe(
		Effect.tapError((e) =>
			Effect.logError(`[total] remove failed for key=${key}: ${e.message}`),
		),
	);

export const update = (db: D1Database, key: string, val: number) =>
	Effect.gen(function* () {
		yield* Effect.logDebug(`[total] updating key=${key} to val=${val}`);
		yield* Effect.tryPromise({
			try: async () =>
				db
					.prepare("UPDATE counter SET val = ? WHERE key = ?")
					.bind(val, key)
					.run(),
			catch: (e) => new DatabaseError((e as Error).message),
		});
		yield* Effect.logInfo(`[total] updated key=${key} to val=${val}`);
		return { content: "Updated", status: 200 } as ResponseData;
	}).pipe(
		Effect.tapError((e) =>
			Effect.logError(`[total] update failed for key=${key}: ${e.message}`),
		),
	);

export const listAll = (db: D1Database) =>
	Effect.gen(function* () {
		yield* Effect.logDebug("[total] listing all counters with values");
		const result = yield* Effect.tryPromise({
			try: async () =>
				db
					.prepare("SELECT key, val FROM counter ORDER BY key")
					.all<{ key: string; val: number }>(),
			catch: (e) => new DatabaseError((e as Error).message),
		});

		const counters = result.results.map((r) => ({
			key: r.key,
			val: r.val,
		}));
		yield* Effect.logDebug(`[total] listed ${counters.length} counters`);
		return counters;
	}).pipe(
		Effect.tapError((e) =>
			Effect.logError(`[total] listAll failed: ${e.message}`),
		),
	);
