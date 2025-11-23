import type { Redis } from "@upstash/redis/cloudflare";
import { Effect } from "effect";
import { DatabaseError, UpgradeError } from "../errors";

const INDEX_KEY = "realtime:index";

export const list = (rdb: Redis) =>
	Effect.gen(function* () {
		yield* Effect.logDebug("[realtime] listing all keys");
		const keys = yield* Effect.tryPromise({
			try: async () => rdb.smembers(INDEX_KEY),
			catch: (e) => new DatabaseError((e as Error).message),
		});
		yield* Effect.logDebug(`[realtime] listed ${keys.length} keys`);
		return keys;
	}).pipe(
		Effect.tapError((e) =>
			Effect.logError(`[realtime] list failed: ${e.message}`),
		),
	);

export const connect = (upgrade: string | undefined) =>
	Effect.gen(function* () {
		if (upgrade !== "websocket") {
			yield* Effect.logWarning(
				"[realtime] connection attempt without websocket upgrade header",
			);
			return yield* Effect.fail(
				new UpgradeError('Missing Upgrade header == "websocket"'),
			);
		}

		const webSocketPair = new WebSocketPair();
		const [client, server] = Object.values(webSocketPair);

		yield* Effect.logInfo("Successfully upgraded to WebSocket");
		return [client, server] as [WebSocket, WebSocket];
	});

export const register = (
	rdb: Redis,
	[client, server]: [WebSocket, WebSocket],
	key: string,
) =>
	Effect.gen(function* () {
		const sessionId = crypto.randomUUID();
		yield* Effect.logInfo(
			`[realtime] [key=${key}] client connecting (session=${sessionId})`,
		);
		server.accept();

		// Heartbeat interval (keep alive)
		const HEARTBEAT_INTERVAL = 5000; // 5 seconds
		const SESSION_TIMEOUT = 15000; // 15 seconds

		const updatePresence = async () => {
			const now = Date.now();
			// 1. Update this session's heartbeat
			await rdb.zadd(key, { score: now, member: sessionId });
			// 2. Add to index
			await rdb.sadd(INDEX_KEY, key);
			// 3. Remove stale sessions
			await rdb.zremrangebyscore(key, 0, now - SESSION_TIMEOUT);
			// 4. Get current count
			const count = await rdb.zcard(key);

			console.log(`[realtime] [key=${key}] count=${count}`);
			server.send(JSON.stringify(count.toString()));
		};

		// Initial update
		yield* Effect.tryPromise({
			try: () => updatePresence(),
			catch: (e) => new DatabaseError((e as Error).message),
		});

		const intervalId = setInterval(async () => {
			try {
				await updatePresence();
			} catch (error) {
				console.error(`[realtime] [key=${key}] heartbeat error:`, error);
			}
		}, HEARTBEAT_INTERVAL);

		server.addEventListener("close", async () => {
			console.log(
				`[realtime] [key=${key}] client disconnecting (session=${sessionId})`,
			);
			clearInterval(intervalId);
			await rdb.zrem(key, sessionId);
		});

		return new Response(null, {
			status: 101,
			webSocket: client,
		});
	});

export const retrieve = (rdb: Redis, key: string) =>
	Effect.gen(function* () {
		yield* Effect.logDebug(`[realtime] retrieve key=${key}`);
		const count = yield* Effect.tryPromise({
			try: async () => {
				// Clean up stale sessions first to get an accurate count
				const now = Date.now();
				const SESSION_TIMEOUT = 15000;
				await rdb.zremrangebyscore(key, 0, now - SESSION_TIMEOUT);

				return await rdb.zcard(key);
			},
			catch: (e) => new DatabaseError((e as Error).message),
		});
		yield* Effect.logDebug(`[realtime] retrieve key=${key} count=${count}`);
		return count;
	}).pipe(
		Effect.tapError((e) =>
			Effect.logError(
				`[realtime] retrieve failed for key=${key}: ${e.message}`,
			),
		),
	);

export const remove = (rdb: Redis, key: string) =>
	Effect.gen(function* () {
		yield* Effect.logDebug(`[realtime] removing key=${key}`);
		yield* Effect.tryPromise({
			try: async () => {
				await rdb.del(key);
				await rdb.srem(INDEX_KEY, key);
			},
			catch: (e) => new DatabaseError((e as Error).message),
		});
		yield* Effect.logInfo(`[realtime] removed key=${key}`);
		return "Deleted";
	}).pipe(
		Effect.tapError((e) =>
			Effect.logError(`[realtime] remove failed for key=${key}: ${e.message}`),
		),
	);

export const update = (rdb: Redis, key: string, val: number) =>
	Effect.gen(function* () {
		yield* Effect.logDebug(`[realtime] updating key=${key} to val=${val}`);
		yield* Effect.tryPromise({
			try: async () => {
				await rdb.sadd(INDEX_KEY, key);
				const currentCount = await rdb.zcard(key);
				const diff = val - currentCount;

				if (diff > 0) {
					// Add fake members
					const now = Date.now();
					// Optimization: Parallelize
					await Promise.all(
						Array.from({ length: diff }).map(() =>
							rdb.zadd(key, {
								score: now,
								member: `fake-${crypto.randomUUID()}`,
							}),
						),
					);
				} else if (diff < 0) {
					// Remove members (pop min)
					await rdb.zpopmin(key, Math.abs(diff));
				}
			},
			catch: (e) => new DatabaseError((e as Error).message),
		});
		yield* Effect.logInfo(`[realtime] updated key=${key} to val=${val}`);
		return "Updated";
	}).pipe(
		Effect.tapError((e) =>
			Effect.logError(`[realtime] update failed for key=${key}: ${e.message}`),
		),
	);
