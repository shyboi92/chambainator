import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import {Request, Response, NextFunction, CookieOptions} from 'express';

import * as config from './config.js';
import db from './database.js';
import { WebApi, Roles, CourseInfo, UserInfo } from './constants.js';
import { token } from 'morgan';




export interface ParsedRequest extends Request {
	session: { [key: string] : any },
	body: { [key: string] : any },
	query: { [key: string] : any },
	files: { [key: string] : any },
	ctx: RequestContext,
}


export class RequestContext {
	req: ParsedRequest;
	res: Response;

	constructor(req: any, res: any) {
		this.req = req;
		this.res = res;
	}

	saveSession() {
		return new Promise<void>((resolve, reject) => {
			this.req.session.save((err: any) => {
				if (err) {
					console.log(`Session save error: ${err}`);
					reject(err);
				} else resolve();
			})
		})
	}

	setUserId(id: number) {
		db.query('update user set last_login_time = current_timestamp where id = ?', [id]);
		this.req.session.userId = id;
		return this.saveSession();
	}

	getUserId(): number {
		return this.req.session.userId;
	}

	logout() {
		this.req.session.userId = null;
		this.res.clearCookie(config.REMEMBER_LOGIN_COOKIE_NAME, getCookieOptions());
		return this.saveSession();
	}

	isAuthenticated(): boolean {
		return this.req.session?.userId != undefined
			&& this.req.session?.userId != null;
	}

	/**
	 * Logs in with username and password.
	 * Returns the user ID if successful, or `null` otherwise.
	 * If `rememberLogin` is `true`, generates a token and stores it in a cookie.
	 */
	async loginWithUsernameAndPassword(username: string, password: string, rememberLogin: boolean): Promise<any | null> {
		const info = await db.queryRow('select id, password, role from user where username = ? and enabled', [username]);
		if (!info) return null;

		const [hash, salt] = info.password.split('.');
		if (!hash || !salt) return null;

		const testEncoded = await encodeUserPassword(password, salt);
		if (hash != testEncoded.hash) return null;

		this.setUserId(info.id);

		db.query('update user set last_login_time = current_timestamp where id = ?', [info.id]);

		if (rememberLogin) {	// generates JWT token and saves it in a cookie
			const payload = {
				userId: info.id
			};

			const maxAgeSeconds = config.REMEMBER_LOGIN_MAX_AGE_DAYS * 24 * 3600;
			const token = jwt.sign(payload, config.SECRET_STRING, {
				expiresIn: maxAgeSeconds
			});

			this.res.cookie(config.REMEMBER_LOGIN_COOKIE_NAME, token, {
				...getCookieOptions(),
				maxAge: maxAgeSeconds * 1000,
			});
		}

		return {
			id: info.id,
			cookie: [config.REMEMBER_LOGIN_COOKIE_NAME, token]
		}
	}


	/**
	 * Checks for authorization by remembered JWT token.
	 * Returns the user ID if successful, or `null` otherwise.
	 */
	async loginWithRememberedToken(): Promise<number | null> {
		const req = this.req as ParsedRequest;
		const token = req.cookies?.[config.REMEMBER_LOGIN_COOKIE_NAME] ?? null;
		if (!token) return null;
	
		const data = jwt.verify(token, config.SECRET_STRING);
		if (!data) return null;

		const info = await db.queryRow('select id, role from user where id = ? and enabled', [data.userId]);
		if (!info) return null;

		this.setUserId(info.id);

		db.query('update user set last_login_time = current_timestamp where id = ?', [info.id]);

		return data.userId;
	}


	getUser(): User | null {
		const id = this.getUserId();
		return id ? new User(id) : null;
	}
	
	/**
	 * Puts an entry into the logs
	 */
	logActivity(description: string, data: any = null) {
		const ip = this.req.headers['x-forwarded-for'] ?? this.req.socket.remoteAddress;
		
		db.insert('activity_log', {
			user: this.getUserId(),
			description: description,
			data: data ? JSON.stringify(data) : null,
			ip: ip
		});
	}

}


/**
 * Middleware that saves the request-response context information
 */
export async function sessionContext(req: Request, res: Response, next: NextFunction) {
	const ctx = new RequestContext(req, res);
	(req as ParsedRequest).ctx = ctx;

	// login with remembered cookie token
	if (!ctx.isAuthenticated()) {
		const userId = await ctx.loginWithRememberedToken();
		if (userId !== null) ctx.logActivity('Đăng nhập bằng nhớ tài khoản', {user_id: userId});
	}

	next();
}


export function getCookieOptions(): CookieOptions {
	return {
		httpOnly: true,
		signed: false,
		secure: true,	// required for SameSite: none
		sameSite: process.env.NODE_ENV === 'development' ? 'none' : 'lax',
		path: process.env.WEB_PUBLIC_PATH,
	};
}

/**
 * Encodes the password with salt
 */
export async function encodeUserPassword(password: string, salt: string | null = null): Promise<{ salt: string, hash: string, combined: string }> {
	if (!salt) salt = crypto.randomBytes(16).toString('hex');

	const encoder = new TextEncoder();
	const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(password + salt));
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
	return {
		hash: hashHex,
		salt,
		combined: `${hashHex}.${salt}`
	};
}



/**
 * A class to facilitate reading user information
 */
export class User {
	id: number | null = null;
	info: UserInfo | null = null;

	constructor(id: number) {
		this.id = id;
	}

	getId(): number | null {
		return this.id;
	}

	async getInfo(): Promise<UserInfo | null> {
		if (!this.info) {
			const r = await db.queryRow('select * from user where id = ?', [this.id]);
			if (!r) this.info = null;
			else this.info = {
				id: r.id,
				username: r.username,
				fullname: r.fullname,
				password: r.password,
				role: r.role,
				enabled: r.enabled == 1,
				creation_time: r.creation_time,
				last_login_time: r.last_login_time,
				last_update_time: r.last_update_time,
			} as UserInfo;
		}
		return this.info;
	}

	async getClientInfo(): Promise<UserInfo | null> {
		const info = await this.getInfo();
		if (!info) return null;

		return {
			id: info.id,
			username: info.username,
			fullname: info.fullname,
			role: info.role,
			enabled: info.enabled,
			creation_time: info.creation_time,
			last_login_time: info.last_login_time,
			last_update_time: info.last_update_time
		} as UserInfo;
	}

	async hasApiPermission(api: WebApi) {
		if (api.roles.includes(Roles.UNAUTHENTICATED)) return true;

		const info = await this.getInfo();
		if (!info) return false;

		return api.roles.includes(info.role as Roles);
	}

	async checkPassword(password: string): Promise<boolean> {
		const info = await db.queryRow('select password from user where id = ? and enabled', [this.id]);
		if (!info) return false;

		const [hash, salt] = info.password.split('.');
		if (!hash || !salt) return false;

		const testEncoded = await encodeUserPassword(password, salt);
		if (hash != testEncoded.hash) return false;

		return true;
	}

	async updatePassword(password: string) {
		const encodedPwd = await encodeUserPassword(password);
		await db.query('update user set password = ?, last_update_time = current_timestamp where id = ?', [encodedPwd.combined, this.id]);
	}


	

	static checkStrongPassword(password: string): boolean {
		return password.length >= 8
			&& /[A-Z]/.test(password)
			&& /[0-9]/.test(password);
	}
}


