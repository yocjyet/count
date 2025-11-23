import { HTTPException } from "hono/http-exception";

export class BadRequestError extends HTTPException {
	_tag: string = "BadRequestError";
	constructor(message: string | undefined) {
		super(400, { message });
	}
}

export class UpgradeError extends HTTPException {
	_tag: string = "UpgradeError";
	constructor(message: string | undefined) {
		super(426, { message });
	}
}

export class DatabaseError extends HTTPException {
	_tag: string = "DatabaseError";
	constructor(message: string | undefined) {
		super(500, { message });
	}
}

export class KeyNotFoundError extends HTTPException {
	_tag: string = "KeyNotFoundError";
	constructor(message: string | undefined) {
		super(404, { message });
	}
}

export class InternalError extends HTTPException {
	_tag: string = "InternalError";
	constructor(message: string | undefined) {
		super(500, { message });
	}
}

export class UnauthorizedError extends HTTPException {
	_tag: string = "UnauthorizedError";
	constructor(message: string | undefined) {
		super(401, { message });
	}
}
