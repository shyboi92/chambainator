import {Router, Request, Response} from 'express';
import * as config from '../inc/config.js';
import {ErrorCodes, Roles, AUTHENTICATED_ROLES, API, API_COURSE, UserInfo, CourseInfo,API_CLASS, HIGHER_ROLES, API_EXERCISE} from '../inc/constants.js';
import db from '../inc/database.js';
import * as session from '../inc/session.js';

import {apiRoute, bindApiWithRoute, apiValidatorParam, ApiRequest} from '../inc/api.js';

const router = Router();
export default router;


	//#region api voi class
bindApiWithRoute(API_EXERCISE.EXERCISE__CREATE, api => apiRoute(router, api,
	apiValidatorParam(api, 'exercise_name').trim().notEmpty(),
	apiValidatorParam(api, 'description').trim().optional(),
	apiValidatorParam(api, 'course_id').notEmpty().isInt().toInt(),
	
	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;

		if (!AUTHENTICATED_ROLES.includes(userInfo.role))
			return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		const notTeacher = !HIGHER_ROLES.includes(userInfo.role)

		if ( notTeacher)
			return req.api.sendError(ErrorCodes.NO_PERMISSION);

		const newExerciseId = (await db.insert('exercise', {
			course_id: req.api.params.course_id,
			name: req.api.params.exercise_name,
			description: req.api.params.description || null
		}))?.insertId;

		if (!newExerciseId)
		 	return req.api.sendError(ErrorCodes.INTERNAL_ERROR);

		
		req.ctx.logActivity('Tạo bai hoc mới', { exercise: newExerciseId });
		req.api.sendSuccess({ exercise_id: newExerciseId });
	}
))

bindApiWithRoute(API_EXERCISE.EXERCISE__DELETE, api => apiRoute( router, api,
	apiValidatorParam(api, 'exercise_id').notEmpty().isInt().toInt(),

	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
		
		if (!AUTHENTICATED_ROLES.includes(userInfo.role))
			return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		const notTeacher = !HIGHER_ROLES.includes(userInfo.role)

		if ( notTeacher)
			return req.api.sendError(ErrorCodes.NO_PERMISSION);
		
		await db.query(`
            DELETE cs FROM check_sub cs
            JOIN submission s1 ON cs.sub_id1 = s1.uuid
            JOIN submission s2 ON cs.sub_id2 = s2.uuid
            JOIN exam_cont ec ON s1.question_id = ec.id
            WHERE ec.exercise_id = ?
        `, [req.api.params.exercise_id]);

        await db.query(`
            DELETE s FROM submission s
            JOIN exam_cont ec ON s.question_id = ec.id
            WHERE ec.exercise_id = ?
        `, [req.api.params.exam_id]);
		await db.query("DELETE FROM exam_cont WHERE exercise_id = ?", [req.api.params.exercise_id]);
		await db.query("DELETE FROM test_case WHERE exercise_id = ?", [req.api.params.exercise_id]);
		await db.query("DELETE FROM exercise WHERE id = ?", [req.api.params.exercise_id]);
		
		req.api.sendSuccess();
	}
))

bindApiWithRoute(API_EXERCISE.EXERCISE__UPDATE_INFO, api => apiRoute(router, api,
	apiValidatorParam(api, 'exercise_id').notEmpty().isInt().toInt(),
	apiValidatorParam(api, 'name').trim().notEmpty(),
	apiValidatorParam(api, 'description').trim().notEmpty(),

	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
		
		if (!AUTHENTICATED_ROLES.includes(userInfo.role))
			return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		const notTeacher = !HIGHER_ROLES.includes(userInfo.role)

		if ( notTeacher)
			return req.api.sendError(ErrorCodes.NO_PERMISSION);
		else await db.query('UPDATE exercise SET name = ?, description = ? where id = ?', [req.api.params.name, req.api.params.description,req.api.params.exercise_id]);

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
		const queryResult = await db.query("SELECT * FROM exercise WHERE course_id = ?", [req.api.params.course_id])
		const exerciseArray = queryResult

		req.api.sendSuccess({ exercises: exerciseArray })
	}
))
	//#endregion
	//#region api vs test case

	bindApiWithRoute(API_EXERCISE.TEST_CASE__CREATE, api => apiRoute(router, api,
		apiValidatorParam(api, 'exercise_id').notEmpty().isInt().toInt(),
		apiValidatorParam(api, 'test_cases'),
		async (req: ApiRequest, res: Response) => {
			const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
	
			if (!HIGHER_ROLES.includes(userInfo.role))
				return req.api.sendError(ErrorCodes.NO_PERMISSION);

			const exerciseId = req.api.params.exercise_id
			let args = []
			
			let sql2 = "INSERT INTO test_case (exercise_id, input, output, run_time) VALUES";
			let test_cases = req.api.params.test_cases

			test_cases.forEach((c: any) => {
				const values = ` (?, ?, ?, ?),`
				args = args.concat(exerciseId, c.input, c.output, c.run_time)
				sql2 += values
			});

			sql2 = sql2.replace(/,\s*$/, "");		// Bỏ dấu phẩy ở cuối

			db.query(sql2, args)

			req.api.sendSuccess();
		}
	))
bindApiWithRoute(API_EXERCISE.TEST_CASE__DELETE, api => apiRoute( router, api,
	apiValidatorParam(api, 'test_case_id').notEmpty().isInt().toInt(),

	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
		
		if (!AUTHENTICATED_ROLES.includes(userInfo.role))
			return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		const notTeacher = !HIGHER_ROLES.includes(userInfo.role)

		if ( notTeacher)
			return req.api.sendError(ErrorCodes.NO_PERMISSION);
		else await db.query("DELETE FROM test_case WHERE id = ?", [req.api.params.test_case_id]);
		
		req.api.sendSuccess();
	}
))

bindApiWithRoute(API_EXERCISE.TEST_CASE__UPDATE_INFO, api => apiRoute(router, api,
	apiValidatorParam(api, 'test_case_id').notEmpty().isInt().toInt(),
	apiValidatorParam(api, 'input').trim().notEmpty(),
	apiValidatorParam(api, 'output').trim().notEmpty(),
	apiValidatorParam(api, 'run_time').isFloat().toFloat().notEmpty(),

	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
		
		if (!AUTHENTICATED_ROLES.includes(userInfo.role))
			return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		const notTeacher = !HIGHER_ROLES.includes(userInfo.role)

		if ( notTeacher)
			return req.api.sendError(ErrorCodes.NO_PERMISSION);
		else await db.query('UPDATE test_case SET input = ? output = ? run_time = ? where id = ?', [req.api.params.input, req.api.params.output,req.api.params.run_time, req.api.params.test_case_id]);

		req.ctx.logActivity('Sửa thông tin tập test', {test_case_id: req.api.params.test_case_id });
		req.api.sendSuccess();
	}
))


bindApiWithRoute(API_EXERCISE.TEST_CASE__GET, api => apiRoute(router, api,
	apiValidatorParam(api, 'test_case_id').notEmpty().isInt().toInt(),
	
	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
		const queryResult = await db.query("SELECT * FROM test_case WHERE id = ?", [req.api.params.test_case_id])
		const testcaseData = queryResult[0]

		if (!AUTHENTICATED_ROLES.includes(userInfo.role))
			return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		req.api.sendSuccess(testcaseData)
	}
))


bindApiWithRoute(API_EXERCISE.TEST_CASE__LIST, api => apiRoute(router,api,
	apiValidatorParam(api, 'exercise_id').notEmpty().isInt().toInt(),

	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
		const queryResult = await db.query("SELECT * FROM test_case WHERE exercise_id = ?", [req.api.params.exercise_id])
		const exerciseArray = queryResult

		req.api.sendSuccess({ testcase: exerciseArray })
	}
))
	//#endregion