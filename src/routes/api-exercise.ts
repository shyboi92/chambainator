import {Router, Request, Response} from 'express';

import * as config from '../inc/config.js';
import {ErrorCodes, Roles, AUTHENTICATED_ROLES, API, API_COURSE, UserInfo, CourseInfo,API_CLASS, HIGHER_ROLES, API_EXERCISE} from '../inc/constants.js';
import db from '../inc/database.js';
import * as session from '../inc/session.js';

import {apiRoute, bindApiWithRoute, apiValidatorParam, ApiRequest} from '../inc/api.js';

const router = Router();
export default router;

bindApiWithRoute(API_EXERCISE.EXERCISE__CREATE, api => apiRoute(router, api,
	apiValidatorParam(api, 'exercise_name').trim().notEmpty(),
	apiValidatorParam(api, 'description').trim().optional(),
	apiValidatorParam(api, 'course_id').notEmpty().isInt().toInt(),
	apiValidatorParam(api, 'start_date').notEmpty().isDate().toDate(),
	apiValidatorParam(api, 'end_date').notEmpty().isDate().toDate(),
	
	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
		const queryResult = await db.query("SELECT user_id FROM course WHERE id = ?", [req.api.params.course_id])
		const creatorId = queryResult[0]['user_id']

		if (!AUTHENTICATED_ROLES.includes(userInfo.role))
			return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		const notAdmin = userInfo.role != Roles.SYSTEM_ADMIN

		if (!(!notAdmin || (userInfo.id == creatorId)))
			return req.api.sendError(ErrorCodes.NO_PERMISSION);

		const newExerciseId = (await db.insert('exercise', {
			course_id: req.api.params.course_id,
			name: req.api.params.exercise_name,
			start_date: req.api.params.start_date ,
			end_date: req.api.params.end_date,
			description: req.api.params.description || null
		}))?.insertId;

		if (!newExerciseId)
		 	return req.api.sendError(ErrorCodes.INTERNAL_ERROR);

		req.ctx.logActivity('Tạo bai hoc mới', { class_id: newExerciseId });
		req.api.sendSuccess({ class_id: newExerciseId });
	}
))

bindApiWithRoute(API_EXERCISE.EXERCISE__DELETE, api => apiRoute( router, api,
	apiValidatorParam(api, 'exercise_id').notEmpty().isInt().toInt(),

	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
		const r= await db.query("SELECT course.user_id FROM exercise INNER JOIN course ON exercise.course_id = course.id WHERE exercise.id = ?",[req.api.params.class_id])
		const result = r[0]['user_id'];
		
		if (!AUTHENTICATED_ROLES.includes(userInfo.role))
			return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		if (result!== userInfo.role || ![Roles.SYSTEM_ADMIN].includes(userInfo.role))
			return req.api.sendError(ErrorCodes.NO_PERMISSION);
		else await db.query("DELETE FROM exercise WHERE id = ?", [req.api.params.exercise_id]);
		
		req.api.sendSuccess();
	}
))

bindApiWithRoute(API_EXERCISE.EXERCISE__UPDATE_INFO, api => apiRoute(router, api,
	apiValidatorParam(api, 'exercise_id').notEmpty().isInt().toInt(),
	apiValidatorParam(api, 'name').trim().notEmpty(),
	apiValidatorParam(api, 'description').trim().notEmpty(),
	apiValidatorParam(api, 'start_date').notEmpty().isDate().toDate(),
	apiValidatorParam(api, 'end_date').notEmpty().isDate().toDate(),

	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
		const r= await db.query("SELECT course.user_id FROM class INNER JOIN course ON class.course_id = course.id WHERE class.id = ?",[req.api.params.class_id])
		const result = r[0]['user_id'];
		
		if (!AUTHENTICATED_ROLES.includes(userInfo.role))
			return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		if (result!== userInfo.role || !HIGHER_ROLES.includes(userInfo.role))
		return req.api.sendError(ErrorCodes.NO_PERMISSION);
		else await db.query('UPDATE class SET name = ? startDate = ? endDate = ? where id = ?', [req.api.params.name, req.api.params.start_date,req.api.params.end_date,req.api.params.class_id]);

		req.ctx.logActivity('Sửa thông tin lớp học', { user_id: req.api.params.class_id });
		req.api.sendSuccess();
	}
))


bindApiWithRoute(API_CLASS.CLASS__GET, api => apiRoute(router, api,
	apiValidatorParam(api, 'class_id').notEmpty().isInt().toInt(),
	
	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
		const queryResult = await db.query("SELECT * FROM class WHERE id = ?", [req.api.params.class_id])
		const classData = queryResult[0]

		if (!AUTHENTICATED_ROLES.includes(userInfo.role))
			return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		req.api.sendSuccess(classData)
	}
))


bindApiWithRoute(API_CLASS.CLASS__LIST, api => apiRoute(router,api,
	apiValidatorParam(api, 'course_id').notEmpty().isInt().toInt(),

	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
		const queryResult = await db.query("SELECT * FROM class INNER JOIN course ON class.course_id = course.id WHERE class.course_id = ?", [req.api.params.course_id])
		const classesArray = queryResult

		req.api.sendSuccess({ courses: classesArray })
	}
))

bindApiWithRoute(API_CLASS.CLASS__ADD__USER, api => apiRoute(router, api,
	apiValidatorParam(api, 'class_id').notEmpty().isInt().toInt(),
	apiValidatorParam(api, 'user_id').notEmpty().isInt().toInt(),

	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
		const r= await db.query("SELECT course.user_id FROM class INNER JOIN course ON class.course_id = course.id WHERE class.id = ?",[req.api.params.class_id])
		const result = r[0]['user_id'];
		
		if (!AUTHENTICATED_ROLES.includes(userInfo.role))
			return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		if (result!== userInfo.role || !HIGHER_ROLES.includes(userInfo.role))
		return req.api.sendError(ErrorCodes.NO_PERMISSION);
		else await db.query('INSERT INTO user_class(user_id,class_id) VALUES(?,?)', [req.api.params.user_id, req.api.params.class_id]);

		req.ctx.logActivity('Them vao lớp học', { user_class_id: req.api.params.class_id });
		req.api.sendSuccess();
	}
))

bindApiWithRoute(API_CLASS.CLASS__DELETE__USER, api => apiRoute(router, api,
	apiValidatorParam(api, 'user_id').notEmpty().isInt().toInt(),
	apiValidatorParam(api, 'class_id').notEmpty().isInt().toInt(),

	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
		const r= await db.query("SELECT course.user_id FROM class INNER JOIN course ON class.course_id = course.id WHERE class.id = ?",[req.api.params.class_id])
		const result = r[0]['user_id'];
		
		if (!AUTHENTICATED_ROLES.includes(userInfo.role))
			return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		if (result!== userInfo.role || !HIGHER_ROLES.includes(userInfo.role))
		return req.api.sendError(ErrorCodes.NO_PERMISSION);
		else await db.query('DETELE FROM user_class(user_id,class_id) VALUES(?,?)', [req.api.params.user_id, req.api.params.class_id]);

		req.ctx.logActivity('Them vao lớp học', { user_class_id: req.api.params.class_id });
		req.api.sendSuccess();
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

