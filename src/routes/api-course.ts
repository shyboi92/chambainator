import {Router, Request, Response} from 'express';
import * as config from '../inc/config.js';
import {ErrorCodes, Roles, AUTHENTICATED_ROLES, API, API_COURSE, UserInfo, CourseInfo, NotificationInfo, HIGHER_ROLES} from '../inc/constants.js';
import db from '../inc/database.js';
import * as session from '../inc/session.js';

import {apiRoute, bindApiWithRoute, apiValidatorParam, ApiRequest} from '../inc/api.js';

const router = Router();
export default router;


bindApiWithRoute(API_COURSE.COURSE__CREATE, api => apiRoute(router, api,
	apiValidatorParam(api, 'course_name').trim().notEmpty(),
	apiValidatorParam(api, 'description').trim().optional(),
	apiValidatorParam(api, 'code').trim().notEmpty(),

	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;

		// if (!AUTHENTICATED_ROLES.includes(userInfo.role))
		// 	return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		// if (!HIGHER_ROLES.includes(userInfo.role))
		// 	return req.api.sendError(ErrorCodes.NO_PERMISSION);

		const newCourseId = (await db.insert('course', {
			user_id: userInfo.id,
			course_name: req.api.params.course_name,
			description: req.api.params.description || null,
			code: req.api.params.code
		}))?.insertId;
		if (!newCourseId) return req.api.sendError(ErrorCodes.INTERNAL_ERROR);

		req.ctx.logActivity('Tạo khoa hoc mới', {user_id: newCourseId});

		req.api.sendSuccess({ course_id: newCourseId });
	}
))

bindApiWithRoute(API_COURSE.COURSE__DELETE, api => apiRoute(router, api,
	apiValidatorParam(api, 'course_id').isInt().toInt().notEmpty(),

	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
		const r = await db.query("SELECT user_id FROM course WHERE id = ?", [req.api.params.course_id])
		const result = r[0]['user_id']

		// if (!AUTHENTICATED_ROLES.includes(userInfo.role))
		// 	return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		// const notAdmin = userInfo.role != Roles.SYSTEM_ADMIN;

		// if (notAdmin && userInfo.id != result )
		// 	return req.api.sendError(ErrorCodes.NO_PERMISSION);
		
		await db.query("DELETE FROM course WHERE id = ?", [req.api.params.course_id])

		req.api.sendSuccess()
	}
))

bindApiWithRoute(API_COURSE.COURSE__UPDATE_INFO, api => apiRoute(router, api,
	apiValidatorParam(api, 'course_id').trim().notEmpty(),
	apiValidatorParam(api, 'course_name').trim().optional(),
	apiValidatorParam(api, 'description').trim().optional(),
	apiValidatorParam(api, 'code').trim().optional(),

	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
		
		// if (!AUTHENTICATED_ROLES.includes(userInfo.role))
		// 	return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);
		// if (!HIGHER_ROLES.includes(userInfo.role))
		// 	return req.api.sendError(ErrorCodes.NO_PERMISSION);

		await db.query('UPDATE course SET course_name = ?, description = ?, code = ? WHERE id = ?', [req.api.params.course_name, req.api.params.description, req.api.params.code, req.api.params.course_id]);
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
			const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
			// if (!AUTHENTICATED_ROLES.includes(userInfo.role))
			// 	return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);
			
			const queryResult = await db.query("SELECT * FROM course")
			const coursesArray = queryResult

			req.api.sendSuccess({ courses: coursesArray })
	}
))

bindApiWithRoute(API_COURSE.COURSE__USER__LIST, api => apiRoute( router, api,
	apiValidatorParam(api, 'course_id').notEmpty().isInt().toInt(),
	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
		//const notAdmin = (userInfo.role !== Roles.SYSTEM_ADMIN)

		// if (!AUTHENTICATED_ROLES.includes(userInfo.role))
		// 	return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		// if ( !HIGHER_ROLES.includes(userInfo.role))
		// 	return req.api.sendError(ErrorCodes.NO_PERMISSION);

		const students = await db.query(`SELECT DISTINCT u.id AS user_id, u.username, u.fullname
			FROM course c
			JOIN class cl ON c.id = cl.course_id
			JOIN student s ON cl.id = s.class_id
			JOIN user u ON s.user_id = u.id
			WHERE c.id = ? `, [req.api.params.course_id])

		req.api.sendSuccess({ students: students })
	}
))
