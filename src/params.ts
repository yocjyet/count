import { Effect, Option, pipe } from "effect";
import { BadRequestError } from "./errors";

export type ParamsEffect = Effect.Effect<
	Record<string, string>,
	BadRequestError,
	never
>;
export type ResponseData = {
	content: string;
	status: number;
};

export function parseParam(
	param: string,
	value: Option.Option<string>,
): Effect.Effect<string, BadRequestError, never> {
	return pipe(
		value,
		Option.match({
			onNone: () => Effect.fail(new BadRequestError(`No ${param} provided`)),
			onSome: (value) => Effect.succeed(value),
		}),
	);
}
