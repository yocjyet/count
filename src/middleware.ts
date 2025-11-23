import type { Context, Next } from "hono";

export const auth = async (
	c: Context<{
		Bindings: {
			ADMIN_SECRET: string;
		};
	}>,
	next: Next,
) => {
	const authHeader = c.req.header("Authorization");
	const secret = c.env.ADMIN_SECRET || "dev-secret";

	if (!authHeader || authHeader !== `Bearer ${secret}`) {
		return c.text("Unauthorized", 401);
	}

	await next();
};
