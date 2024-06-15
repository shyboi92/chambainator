import {Router, Request, Response} from 'express';
import * as config from '../inc/config.js';
import {ErrorCodes, Roles, AUTHENTICATED_ROLES, API, API_COURSE, UserInfo, CourseInfo,API_CLASS, HIGHER_ROLES, API_EXERCISE, API_EXAM} from '../inc/constants.js';
import db from '../inc/database.js';
import * as session from '../inc/session.js';

import {apiRoute, bindApiWithRoute, apiValidatorParam, ApiRequest} from '../inc/api.js';

const router = Router();
export default router;


bindApiWithRoute(API_EXAM.EXAM__CREATE, api => apiRoute(router, api,
	apiValidatorParam(api, 'class_id').notEmpty().isInt().toInt(),
	apiValidatorParam(api, 'name').trim().optional(),
	apiValidatorParam(api, 'description').trim().optional(),
	apiValidatorParam(api, 'start_date').notEmpty().isDate().toDate(),
	apiValidatorParam(api, 'end_date').notEmpty().isDate().toDate(),
    apiValidatorParam(api, 'questions').isArray().toArray(),
	//[1,2,3,4,]
	//[{'input':'dat khoe vl','output':'vvv','timeout':'dd'},{dhbjscv}]
	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
		const queryResult = await db.query("SELECT teacher_id FROM class WHERE id = ?", [req.api.params.class_id])
		const creatorId = queryResult[0]['teacher_id']

		const notAdmin = userInfo.role != Roles.SYSTEM_ADMIN

		if (notAdmin && (userInfo.id != creatorId))
			return req.api.sendError(ErrorCodes.NO_PERMISSION);

		const newExamId = (await db.insert('exam', {
			class_id: req.api.params.class_id,
			name: req.api.params.name,
			description: req.api.params.description,
			start_date: req.api.params.start_date ,
			end_date: req.api.params.end_date
		}))?.insertId;

        if (!newExamId)
            return req.api.sendError(ErrorCodes.INTERNAL_ERROR);

        const questionIds = req.api.params.questions
        questionIds.forEach((questionId: Number) => {
            db.insert('exam_cont', {
                exercise_id: questionId,
                exam_id: newExamId
            })
        });

		req.ctx.logActivity('Tạo bai kiem tra mới', { exam_id: newExamId });
		req.api.sendSuccess({ exam_id: newExamId });
	}
))

bindApiWithRoute(API_EXAM.EXAM__DELETE, api => apiRoute( router, api,
	apiValidatorParam(api, 'exam_id').notEmpty().isInt().toInt(),

	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
		const r= await db.query("SELECT class.teacher_id FROM exam INNER JOIN class ON exam.class_id = class.id WHERE exam.id = ?",[req.api.params.exam_id])
		const result = r[0]['teacher_id'];
		const notAdmin = userInfo.role != Roles.SYSTEM_ADMIN;

		if (!AUTHENTICATED_ROLES.includes(userInfo.role))
			return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		if (result!== userInfo.id && notAdmin)
			return req.api.sendError(ErrorCodes.NO_PERMISSION);
		else {
			await db.query("DELETE FROM exam_cont WHERE exam_id = ?", [req.api.params.exam_id]);
			await db.query("DELETE FROM exam WHERE id = ?", [req.api.params.exam_id]);
		}
		req.api.sendSuccess();
	}
))

bindApiWithRoute(API_EXAM.EXAM__UPDATE_INFO, api => apiRoute(router, api,
	apiValidatorParam(api, 'exam_id').notEmpty().isInt().toInt(),
	apiValidatorParam(api, 'name').trim().optional(),
	apiValidatorParam(api, 'description').trim().optional(),
	apiValidatorParam(api, 'start_date').optional().isDate().toDate(),
	apiValidatorParam(api, 'end_date').optional().isDate().toDate(),
	apiValidatorParam(api, 'questions').isArray().toArray().optional(),

	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
		const r= await db.query("SELECT class.teacher_id FROM exam INNER JOIN class ON exam.class_id = class.id WHERE exam.id = ?",[req.api.params.exam_id])
		const result = r[0]['teacher_id'];
		const notAdmin = userInfo.role != Roles.SYSTEM_ADMIN;

		if (!AUTHENTICATED_ROLES.includes(userInfo.role))
			return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		if (result!== userInfo.id && notAdmin)
		return req.api.sendError(ErrorCodes.NO_PERMISSION);
		else await db.query('UPDATE exam SET start_date = ? end_date = ? name = ? description = ? where id = ?', [req.api.params.start_date,req.api.params.end_date,req.api.params.name,req.api.params.description,req.api.params.exam_id]);

		const questionIds = req.api.params.questions
		if (questionIds !== null) {
			await db.query('DELETE FROM exam_cont WHERE exam_id = ? '[req.api.params.exam_id]);
        	questionIds.forEach((questionId: Number) => {
            	db.insert('exam_cont', {
                	exercise_id: questionId,
                	exam_id: req.api.params.exam_id
            })
        });
		}
		req.ctx.logActivity('Sửa thông tin bài kiểm tra', { exam_id: req.api.params.exam_id });
		req.api.sendSuccess();
	}
))


bindApiWithRoute(API_EXAM.EXAM__GET, api => apiRoute(router, api,
	apiValidatorParam(api, 'exam_id').notEmpty().isInt().toInt(),
	
	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
		const queryResult = await db.query("SELECT name, description, start_date, end_date FROM exam WHERE id = ?", [req.api.params.exam_id])
		const examData = await db.query("SELECT id FROM exam_cont WHERE exam_id = ?", [req.api.params.exam_id])

		if (!AUTHENTICATED_ROLES.includes(userInfo.role))
			return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		req.api.sendSuccess(examData + queryResult)
	}
))

bindApiWithRoute(API_EXAM.EXAM__QUESTIONS__LIST, api => apiRoute(router, api,
	apiValidatorParam(api, 'exam_id').notEmpty().isInt().toInt(),
	
	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
		const queryResult = await db.query("SELECT id FROM exam_cont WHERE exam_id = ?", [req.api.params.exam_id])
		const examData = queryResult

		if (!AUTHENTICATED_ROLES.includes(userInfo.role))
			return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		req.api.sendSuccess(examData)
	}
))

bindApiWithRoute(API_EXAM.EXAM__LIST, api => apiRoute(router,api,
	apiValidatorParam(api, 'class_id').notEmpty().isInt().toInt(),

	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
		const queryResult = await db.query("SELECT * FROM exam WHERE class_id = ?", [req.api.params.class_id])
		const examArray = queryResult

		req.api.sendSuccess({ exam: examArray })
	}
))

