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
		const r= await db.query("SELECT course.user_id FROM exercise INNER JOIN course ON exercise.course_id = course.id WHERE exercise.id = ?",[req.api.params.exercise_id])
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
		else await db.query('UPDATE exercise SET name = ? start_date = ? end_date = ? description = ? where id = ?', [req.api.params.name, req.api.params.start_date,req.api.params.end_date,req.api.params.description,req.api.params.exercise_id]);

		req.ctx.logActivity('Sửa thông tin bai tap', { exercise_id: req.api.params.exercise_id });
		req.api.sendSuccess();
	}
))


bindApiWithRoute(API_EXERCISE.EXERCISE__GET, api => apiRoute(router, api,
	apiValidatorParam(api, 'exercise_id').notEmpty().isInt().toInt(),
	
	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
		const queryResult = await db.query("SELECT * FROM exercise WHERE id = ?", [req.api.params.exercise_id])
		const exerciseData = queryResult[0]

		if (!AUTHENTICATED_ROLES.includes(userInfo.role))
			return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		req.api.sendSuccess(exerciseData)
	}
))


bindApiWithRoute(API_EXERCISE.EXERCISE__LIST, api => apiRoute(router,api,
	apiValidatorParam(api, 'course_id').notEmpty().isInt().toInt(),

	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
		const queryResult = await db.query("SELECT * FROM exercise INNER JOIN course ON exercise.course_id = course.id WHERE exercise.course_id = ?", [req.api.params.course_id])
		const exerciseArray = queryResult

		req.api.sendSuccess({ exercises: exerciseArray })
	}
))

