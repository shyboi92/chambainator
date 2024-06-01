import httpCodes from 'http-status-codes';
import util from 'util';

import { ValidationChain, query, body, validationResult } from 'express-validator';
import { Router, RequestHandler, NextFunction, Request, Response } from 'express';
import chalk from 'chalk';

import { WebApi, Roles, ErrorCodes } from './constants.js';
import * as session from './session.js';


export interface ApiRequest extends session.ParsedRequest {
	api: ApiContext;
}

export interface ApiRequestHandler {
	(req: ApiRequest, res: Response): any
}

export class ApiContext {
	api: WebApi;
	req: ApiRequest;
	res: Response;
	params: { [key: string] : any };

	constructor(api: WebApi, req: ApiRequest, res: Response) {
		this.api = api;
		this.req = req;
		this.res = res;
		
		// unified object for GET/POST methods
		this.params = 
			['get', 'delete'].includes(api.method) ? req.query :
			api.method === 'post' ? req.body : {}
	}

	/**
	 * Responses the API with error by sending an error object
	 */
	sendError(errorCode: number, errorMsg: string | null = null) {
		const ret = {
			error: {
				code: errorCode,
				msg: errorMsg
			}
		};

		if (process.env.NODE_ENV === 'development') console.log(chalk.red('API failed:'), util.inspect(ret, {depth: null, colors: true}));

		return this.res.json(ret);
	}


	/**
	 * Responses the API with success and sends a data object
	 */
	sendSuccess(data: Object = {}) {
		const ret = {
			error: {
				code: ErrorCodes.OK,
				msg: 'OK.'
			},
			...data
		};

		if (process.env.NODE_ENV === 'development') console.log(chalk.green('API succeeded:'), util.inspect(ret, {depth: null, colors: true}));

		return this.res.json(ret);
	}

}


export function apiRoute(router: Router, api: WebApi, ...handlers: (RequestHandler | ApiRequestHandler)[]) {
	if (handlers.length == 0) return;

	const checkApiConditions = async (_req: Request, res: Response, next: NextFunction) => {
		const req = _req as ApiRequest;

		req.api = new ApiContext(api, req, res);

		// checks method
		if (api.method.toUpperCase() !== req.method) return res.sendStatus(httpCodes.NOT_FOUND);

		// checks role
		// if (!api.roles.includes(Roles.UNAUTHENTICATED)) {
		// 	const user = await req.ctx.getUser();
		// 	if (!user) return req.api.sendError(ErrorCodes.USER_NOT_LOGGED_IN, 'Bạn cần đăng nhập để thực hiện tác vụ này.');
		// 	if (!(await user.hasApiPermission(api))) return req.api.sendError(ErrorCodes.NO_PERMISSION, 'Bạn không có quyền thực hiện tác vụ này.');
		// }

		next();
	}

	const checkValidationResult = (_req: Request, res: Response, next: NextFunction) => {
		const req = _req as ApiRequest;

		if (process.env.NODE_ENV === 'development') console.log(chalk.gray(`API: ${api.url}`), util.inspect(req.api.params, {depth: null, colors: true}));

		const result = validationResult(req);
		if (!result.isEmpty()) {
			if (process.env.NODE_ENV === 'development') console.log(chalk.red(util.inspect(result, {depth: null, colors: true})));
			return req.api.sendError(ErrorCodes.INVALID_PARAMETERS, 'Tham số không hợp lệ.');
		}

		next();
	}

	const leadingHandlers = handlers.slice(0, handlers.length - 1) as RequestHandler[];	// validator middlewares are included
	const finalHandler = handlers[handlers.length - 1] as RequestHandler;
	router.all(api.url, checkApiConditions, ...leadingHandlers, checkValidationResult, finalHandler);
}



export function bindApiWithRoute(api: WebApi, routeFunc: (api: WebApi) => void) {
	routeFunc(api);
}



export function apiValidatorParam(api: WebApi, selector: string): ValidationChain {
	return api.method == 'post' ? body(selector) : query(selector);
}