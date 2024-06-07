import {Router, Request, Response} from 'express';
import * as config from '../inc/config.js';
import {ErrorCodes, Roles, AUTHENTICATED_ROLES, API, API_COURSE, UserInfo, CourseInfo,API_CLASS, HIGHER_ROLES} from '../inc/constants.js';
import db from '../inc/database.js';
import * as session from '../inc/session.js';

import {apiRoute, bindApiWithRoute, apiValidatorParam, ApiRequest} from '../inc/api.js';

const router = Router();
export default router;


bindApiWithRoute(API_CLASS.CLASS__CREATE, api => apiRoute(router, api,
	apiValidatorParam(api, 'class_name').trim().notEmpty(),
	apiValidatorParam(api, 'course_id').notEmpty().isInt().toInt(),
	apiValidatorParam(api, 'startDate').optional().isDate().toDate(),
	apiValidatorParam(api, 'endDate').optional().isDate().toDate(),
	
	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;

		if (!AUTHENTICATED_ROLES.includes(userInfo.role))
			return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		const notAdmin = userInfo.role != Roles.SYSTEM_ADMIN

		if (!HIGHER_ROLES.includes(userInfo.role))
			return req.api.sendError(ErrorCodes.NO_PERMISSION);
		
		const newClassId = (await db.insert('class', {
			course_id: req.api.params.course_id,
			name: req.api.params.class_name,
			start_date: req.api.params.start_date || null,
			end_date: req.api.params.end_date || null,
			teacher_id: userInfo.id 
		}))?.insertId;

		if (!newClassId)
		 	return req.api.sendError(ErrorCodes.INTERNAL_ERROR);

		req.ctx.logActivity('Tạo lop hoc mới', { class_id: newClassId });
		req.api.sendSuccess({ class_id: newClassId });
	}
))

bindApiWithRoute(API_CLASS.CLASS__DELETE, api => apiRoute( router, api,
	apiValidatorParam(api, 'class_id').notEmpty().isInt().toInt(),

	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
		const r= await db.query("SELECT teacher_id FROM class WHERE class.id = ?",[req.api.params.class_id])
		const result = r[0]['teacher_id'];
		
		if (!AUTHENTICATED_ROLES.includes(userInfo.role))
			return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		if (result!== userInfo.id || !HIGHER_ROLES.includes(userInfo.role))
			return req.api.sendError(ErrorCodes.NO_PERMISSION);
		else await db.query("DELETE FROM class WHERE id = ?", [req.api.params.class_id]);
		
		req.api.sendSuccess();
	}
))

bindApiWithRoute(API_CLASS.CLASS__UPDATE_INFO, api => apiRoute(router, api,
	apiValidatorParam(api, 'class_id').notEmpty().isInt().toInt(),
	apiValidatorParam(api, 'name').trim().notEmpty(),
	apiValidatorParam(api, 'start_date').notEmpty().isDate().toDate(),
	apiValidatorParam(api, 'end_date').notEmpty().isDate().toDate(),

	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
		const r= await db.query("SELECT teacher_id FROM class WHERE class.id = ?",[req.api.params.class_id])
		const result = r[0]['teacher_id'];
		
		if (!AUTHENTICATED_ROLES.includes(userInfo.role))
			return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		if (result!== userInfo.id || !HIGHER_ROLES.includes(userInfo.role))
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

		const r= await db.query("SELECT * FROM student WHERE user_id = ? AND class_id = ? ",[userInfo.id, req.api.params.class_id ])
		const result = r[0]['user_id'];

		if (!AUTHENTICATED_ROLES.includes(userInfo.role))
			return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		if (result!== userInfo.id || !HIGHER_ROLES.includes(userInfo.role))
			return req.api.sendError(ErrorCodes.NO_PERMISSION);

		req.api.sendSuccess(classData)
	}
))


bindApiWithRoute(API_CLASS.CLASS__LIST, api => apiRoute(router,api,
	apiValidatorParam(api, 'course_id').isInt().toInt().optional(),

	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
		let r;
		if (userInfo.role == Roles.SYSTEM_ADMIN) 
		 r= await db.query("SELECT * FROM class WHERE course_id = ?",[req.api.params.course_id])
		else if (userInfo.role == Roles.TEACHER)
		 r= await db.query("SELECT * FROM class WHERE teacher_id = ?",[userInfo.id ])
		else if (userInfo.role == Roles.STUDENT)
		 r= await db.query("SELECT class.name,class.start_date ,class.end_date  FROM student INNER JOIN class ON student.class_id = class.id WHERE student.user_id = ",[userInfo.id])
		const classesArray = r;

		if (!AUTHENTICATED_ROLES.includes(userInfo.role))
			return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		req.api.sendSuccess({ classes: classesArray })
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
		else await db.query('INSERT INTO student(user_id,class_id) VALUES(?,?)', [req.api.params.user_id, req.api.params.class_id]);

		req.ctx.logActivity('Them vao lớp học', { student_id: req.api.params.class_id });
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
		else await db.query('DETELE FROM student(user_id,class_id) VALUES(?,?)', [req.api.params.user_id, req.api.params.class_id]);

		req.ctx.logActivity('xoa trong lớp học', { student_id: req.api.params.class_id });
		req.api.sendSuccess();
	}
))

bindApiWithRoute(API_CLASS.CLASS__LIST__USER, api => apiRoute(
	router,
	api,
	apiValidatorParam(api, 'class_id').notEmpty().isInt().toInt(),
	async (req: ApiRequest, res: Response) => {
		const classId = req.api.params.class_id
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;

		if (!AUTHENTICATED_ROLES.includes(userInfo.role))
			return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		const checkTeacherQuery = await db.query('SELECT teacher_id FROM class WHERE id = ?', [classId])
		const requiredTeacherId = checkTeacherQuery[0]['teacher_id']
		
		if (requiredTeacherId !== userInfo.id || !HIGHER_ROLES.includes(userInfo.role))
			return req.api.sendError(ErrorCodes.NO_PERMISSION);

		const students = await db.query(`select
			u.id user_id,
			u.username ,
			u.fullname ,
			u.enabled ,
			u.creation_time ,
			u.last_login_time ,
			u.last_update_time 
		from student s join \`user\` u on u.id = s.user_id where s.class_id = ?`, [classId])

		req.api.sendSuccess({ students: students })
	}
))