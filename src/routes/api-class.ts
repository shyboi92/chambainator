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
	apiValidatorParam(api, 'start_date').optional().isDate().toDate(),
	apiValidatorParam(api, 'end_date').optional().isDate().toDate(),
	
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

bindApiWithRoute(API_CLASS.CLASS__DELETE, api => apiRoute(router, api,
    apiValidatorParam(api, 'class_id').notEmpty().isInt().toInt(),

    async (req: ApiRequest, res: Response) => {
        const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
        const r = await db.query("SELECT teacher_id FROM class WHERE class.id = ?", [req.api.params.class_id]);
        const result = r[0]['teacher_id'];
        const notAdmin = (userInfo.role !== Roles.SYSTEM_ADMIN);

        if (!AUTHENTICATED_ROLES.includes(userInfo.role))
            return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

        if (result !== userInfo.id && notAdmin)
            return req.api.sendError(ErrorCodes.NO_PERMISSION);

        // Xóa các bản ghi liên quan trong bảng `check_sub`
        await db.query(`
            DELETE cs FROM check_sub cs
            JOIN submission s1 ON cs.sub_id1 = s1.uuid
            JOIN submission s2 ON cs.sub_id2 = s2.uuid
            JOIN exam_cont ec ON s1.exam_cont_id = ec.id
            JOIN exam e ON ec.exam_id = e.id
            WHERE e.class_id = ?
        `, [req.api.params.class_id]);

        // Xóa các bản ghi liên quan trong bảng `submission`
        await db.query(`
            DELETE s FROM submission s
            JOIN exam_cont ec ON s.exam_cont_id = ec.id
            JOIN exam e ON ec.exam_id = e.id
            WHERE e.class_id = ?
        `, [req.api.params.class_id]);

        // Xóa các bản ghi liên quan trong bảng `exam_cont`
        await db.query(`
            DELETE ec FROM exam_cont ec
            JOIN exam e ON ec.exam_id = e.id
            WHERE e.class_id = ?
        `, [req.api.params.class_id]);

        // Xóa các bản ghi liên quan trong bảng `exam`
        await db.query("DELETE FROM exam WHERE class_id = ?", [req.api.params.class_id]);

        // Xóa các bản ghi liên quan trong bảng `student`
        await db.query("DELETE FROM student WHERE class_id = ?", [req.api.params.class_id]);

        // Cuối cùng, xóa bản ghi trong bảng `class`
        await db.query("DELETE FROM class WHERE id = ?", [req.api.params.class_id]);

        req.api.sendSuccess();
    }
));


bindApiWithRoute(API_CLASS.CLASS__UPDATE_INFO, api => apiRoute(router, api,
	apiValidatorParam(api, 'class_id').notEmpty().isInt().toInt(),
	apiValidatorParam(api, 'name').trim().notEmpty(),
	apiValidatorParam(api, 'start_date').notEmpty().isDate().toDate(),
	apiValidatorParam(api, 'end_date').notEmpty().isDate().toDate(),

	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
		const r= await db.query("SELECT teacher_id FROM class WHERE class.id = ?",[req.api.params.class_id])
		const result = r[0]['teacher_id'];
		const notAdmin = (userInfo.role !== Roles.SYSTEM_ADMIN)
		if (!AUTHENTICATED_ROLES.includes(userInfo.role))
			return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		if (result!== userInfo.id && notAdmin)
		return req.api.sendError(ErrorCodes.NO_PERMISSION);
		else await db.query('UPDATE class SET name = ?, start_date = ?, end_date = ? where id = ?', [req.api.params.name, req.api.params.start_date,req.api.params.end_date,req.api.params.class_id]);

		req.ctx.logActivity('Sửa thông tin lớp học', { user_id: req.api.params.class_id });
		req.api.sendSuccess();
	}
))


bindApiWithRoute(API_CLASS.CLASS__GET, api => apiRoute(router, api,
	apiValidatorParam(api, 'class_id').notEmpty().isInt().toInt(),
	
	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
		
		let queryResult ;

		if (userInfo.role == Roles.SYSTEM_ADMIN){
			queryResult = await db.query("SELECT * FROM class WHERE id = ?", [req.api.params.class_id])
		} else if (userInfo.role == Roles.TEACHER) {
			queryResult = await db.query("SELECT * FROM class WHERE id = ? AND teacher_id = ?", [req.api.params.class_id, userInfo.id])
		} else if (userInfo.role == Roles.STUDENT) {
			queryResult = await db.query("SELECT * FROM student INNER JOIN class ON student.class_id=class.id WHERE student.user_id = ? AND student.class_id = ?",[userInfo.id, req.api.params.class_id ])
		}	

		let classData = queryResult[0];
		if (!AUTHENTICATED_ROLES.includes(userInfo.role))
			return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		req.api.sendSuccess(classData)
	}
))


bindApiWithRoute(API_CLASS.CLASS__LIST, api => apiRoute(router,api,

	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
		let r;
		if (userInfo.role == Roles.SYSTEM_ADMIN) 
		 r= await db.query("SELECT * FROM class ")
		else if (userInfo.role == Roles.TEACHER)
		 r= await db.query("SELECT * FROM class WHERE teacher_id = ?",[userInfo.id ])
		else if (userInfo.role == Roles.STUDENT)
		 r= await db.query("SELECT class.id, class.name, class.start_date, class.end_date FROM student INNER JOIN class ON student.class_id = class.id WHERE student.user_id = ?",[userInfo.id])
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
		const r= await db.query("SELECT teacher_id FROM class WHERE id = ? ",[req.api.params.class_id ])
		const result = r[0]['teacher_id'];
		
		if (!AUTHENTICATED_ROLES.includes(userInfo.role))
			return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		if (result!== userInfo.id && userInfo.role !== Roles.SYSTEM_ADMIN)
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
    try {
        const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
        if (!userInfo) {
            return req.api.sendError(ErrorCodes.INVALID_PARAMETERS, 'User information not found');
        }

		const querystudent = await db.query("SELECT id FROM student WHERE user_id = ? AND class_id = ?",[req.api.params.user_id,req.api.params.class_id]);
		// Kiểm tra nếu truy vấn trả về rỗng
        if (!querystudent || querystudent.length === 0) {
            return req.api.sendError(ErrorCodes.NOT_FOUND, 'Student not found for the given user ID and class ID');
        }
		const studentid = querystudent[0]['id']
        const r = await db.query("SELECT class.teacher_id FROM student INNER JOIN class ON student.class_id = class.id WHERE student.id = ?", [studentid]);
        
        if (!r || r.length === 0 || !r[0]) {
            return req.api.sendError(ErrorCodes.NOT_FOUND, 'Teacher not found for the given student ID');
        }
        
        const result = r[0]['teacher_id'];

        if (!AUTHENTICATED_ROLES.includes(userInfo.role)) {
            return req.api.sendError(ErrorCodes.INVALID_PARAMETERS, 'User role not authenticated');
        }

        if (result !== userInfo.id && userInfo.role !== Roles.SYSTEM_ADMIN) {
            return req.api.sendError(ErrorCodes.NO_PERMISSION, 'User does not have permission');
        }

        await db.query('DELETE FROM student WHERE id = ?', [studentid]);

        req.ctx.logActivity('xoa trong lop hoc', { student_id: studentid });
        req.api.sendSuccess();
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
}));

bindApiWithRoute(API_CLASS.CLASS__LIST__USER, api => apiRoute( router, api,
	apiValidatorParam(api, 'class_id').notEmpty().isInt().toInt(),
	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
		const notAdmin = (userInfo.role !== Roles.SYSTEM_ADMIN)

		if (!AUTHENTICATED_ROLES.includes(userInfo.role))
			return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		const checkTeacherQuery = await db.query('SELECT teacher_id FROM class WHERE id = ?', [req.api.params.class_id])
		const requiredTeacherId = checkTeacherQuery[0]['teacher_id'];

		if ( requiredTeacherId != userInfo.id && notAdmin)
			return req.api.sendError(ErrorCodes.NO_PERMISSION);

		const students = await db.query(`select
			s.id,
			u.id user_id,
			u.username ,
			u.fullname ,
			u.enabled ,
			u.creation_time ,
			u.last_login_time ,
			u.last_update_time 
		from student s join \`user\` u on u.id = s.user_id where s.class_id = ?`, [req.api.params.class_id])

		req.api.sendSuccess({ students: students })
	}
))


bindApiWithRoute(API_CLASS.STUDENT__LIST, api => apiRoute(router, api,

	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
	
		if ( !HIGHER_ROLES.includes(userInfo.role))
			return req.api.sendError(ErrorCodes.NO_PERMISSION);

		const students = await db.query(`select 
			id user_id,
			username ,
			fullname ,
			enabled ,
			creation_time ,
			last_login_time ,
			last_update_time 
		from user where role = 3`)

		req.api.sendSuccess({ students: students })
	}
))