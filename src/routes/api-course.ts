import {Router, Request, Response} from 'express';

import * as config from '../inc/config.js';
import {ErrorCodes, Roles, AUTHENTICATED_ROLES, API, API_COURSE, UserInfo, CourseInfo, NotificationInfo} from '../inc/constants.js';
import db from '../inc/database.js';
import * as session from '../inc/session.js';

import {apiRoute, bindApiWithRoute, apiValidatorParam, ApiRequest} from '../inc/api.js';

const router = Router();
export default router;

bindApiWithRoute(API_COURSE.COURSE__CREATE, api => apiRoute(router, api,
	apiValidatorParam(api, 'course_name').trim().notEmpty(),
	apiValidatorParam(api, 'description').trim().optional(),
	
	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;

		if (!AUTHENTICATED_ROLES.includes(userInfo.role))
			return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		const notAdmin = userInfo.role != Roles.SYSTEM_ADMIN
		const isNormalUser = Roles.STUDENT == userInfo.role
		if (notAdmin || isNormalUser)
			return req.api.sendError(ErrorCodes.NO_PERMISSION);

		const newCourseId = (await db.insert('course', {
			user_id: userInfo.id,
			course_name: req.api.params.course_name,
			description: req.api.params.description || null,
		}))?.insertId;
		if (!newCourseId) return req.api.sendError(ErrorCodes.INTERNAL_ERROR);

		req.ctx.logActivity('Tạo khoa hoc mới', {user_id: newCourseId});

		req.api.sendSuccess({ user_id: newCourseId });
	}
))

bindApiWithRoute(API_COURSE.COURSE__DELETE, api => apiRoute(
	router,
	api,
	apiValidatorParam(api, 'course_id').trim().notEmpty(),

	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
		const r = await db.query("SELECT user_id FROM course WHERE id = ?", [req.api.params.course_id])
		const result = r[0]['user_id']

		if (!AUTHENTICATED_ROLES.includes(userInfo.role))
			return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		const notAdmin = userInfo.role != Roles.SYSTEM_ADMIN
		const isNormalUser = Roles.STUDENT == userInfo.role
		if (notAdmin || isNormalUser)
			return req.api.sendError(ErrorCodes.NO_PERMISSION);

		if (!notAdmin || (result == userInfo.id))	
			await db.query("DELETE FROM course WHERE id = ?", [req.api.params.course_id])

		req.api.sendSuccess()
	}
))

bindApiWithRoute(API_COURSE.COURSE__UPDATE_INFO, api => apiRoute(router, api,
	apiValidatorParam(api, 'course_id').trim().notEmpty(),
	apiValidatorParam(api, 'course_name').trim().notEmpty(),
	apiValidatorParam(api, 'description').trim().notEmpty(),

	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;

		const queryResult = await db.query("SELECT user_id FROM course WHERE id = ?", [req.api.params.course_id])
		const creatorId = queryResult[0]['user_id']
		
		if (!AUTHENTICATED_ROLES.includes(userInfo.role))
			return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		const notAdmin = userInfo.role != Roles.SYSTEM_ADMIN

		if (!(!notAdmin || (userInfo.id == creatorId)))
			return req.api.sendError(ErrorCodes.NO_PERMISSION);

		await db.query('UPDATE course SET course_name = ?, description = ? WHERE id = ?', [req.api.params.course_name, req.api.params.description, req.api.params.course_id]);
		req.api.sendSuccess();
	}
))


bindApiWithRoute(API_COURSE.COURSE__GET, api => apiRoute(router, api,
	apiValidatorParam(api, 'course_id').notEmpty().isInt().toInt(),
	
	async (req: ApiRequest, res: Response) => {
		const queryResult = await db.query("SELECT * FROM course WHERE id = ?", [req.api.params['course_id']])
		const courseData = queryResult[0]

		req.api.sendSuccess(courseData)
	}
))


bindApiWithRoute(API_COURSE.COURSE__LIST, api => apiRoute(router,api,
	
	async (req: ApiRequest, res: Response) => {
			const queryResult = await db.query("SELECT * FROM course WHERE user_id = ?", [req.ctx.getUserId()])
			const coursesArray = queryResult

			req.api.sendSuccess({ courses: coursesArray })
	}
))


bindApiWithRoute(API.USER__LIST, api => apiRoute(router, api,
	apiValidatorParam(api, 'enabled').optional().isBoolean().toBoolean(),
	apiValidatorParam(api, 'paging.page').optional().isInt().toInt(),

	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;

		const params: any[] = [];
		const selectClause = 'select u.id, u.username, u.fullname, u.role, u.enabled, u.creation_time, u.last_login_time, u.last_update_time';
		const fromClause = 'from user u';
		let whereClause = 'where 1';

		if (req.api.params.hasOwnProperty('enabled')) {
			whereClause += ' and enabled = ?';
			params.push(req.api.params.enabled);
		}

		const item_count = await db.queryValue(`select count(*) ${fromClause} ${whereClause}`, params) as number;
		const page_count = Math.floor((item_count + config.LIST_ITEMS_PER_PAGE - 1) / config.LIST_ITEMS_PER_PAGE);

		let query = `${selectClause} ${fromClause} ${whereClause}`;
		if (req.api.params.paging?.page) {
			if (req.api.params.paging?.page <= 0 || req.api.params.paging?.page > page_count) req.api.sendError(ErrorCodes.PAGE_OUT_OF_RANGE);
			query += ` limit ${(req.api.params.paging.page - 1) * config.LIST_ITEMS_PER_PAGE}, ${config.LIST_ITEMS_PER_PAGE}`;
		}

		const list = await db.query(query, params);
		req.api.sendSuccess({
			item_count,
			page_count,
			user_info: list.map(e => {
				const item: UserInfo = {
					id: e.id,
					username: e.username,
					fullname: e.fullname,
					role: e.role,
					enabled: e.enabled == 1,
					creation_time: e.creation_time,
					last_login_time: e.last_login_time,
					last_update_time: e.last_update_time,
				}	
				return item;
			})
		});
	}
))

