import { Router, Response } from 'express';
import { scheduleJob } from 'node-schedule';

import { ErrorCodes, Roles, AUTHENTICATED_ROLES, UserInfo, API_EXAM } from '../inc/constants.js';
import db from '../inc/database.js';
import { apiRoute, bindApiWithRoute, apiValidatorParam, ApiRequest } from '../inc/api.js';
import doDiff from '../case-diff/main.js'

const router = Router();
export default router;


bindApiWithRoute(API_EXAM.EXAM__CREATE, api => apiRoute(router, api,
	apiValidatorParam(api, 'class_id').notEmpty().isInt().toInt(),
	apiValidatorParam(api, 'name').trim().optional(),
	apiValidatorParam(api, 'description').trim().optional(),
	apiValidatorParam(api, 'start_date').notEmpty().isISO8601().toDate(),
	apiValidatorParam(api, 'end_date').notEmpty().isISO8601().toDate(),
	apiValidatorParam(api, 'questions').isArray().toArray(),

	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
		const queryResult = await db.query("SELECT teacher_id FROM class WHERE id = ?", [req.api.params.class_id])
		const creatorId = queryResult[0]['teacher_id']

		const notAdmin = userInfo.role != Roles.SYSTEM_ADMIN

		if (notAdmin && (userInfo.id != creatorId))
			return req.api.sendError(ErrorCodes.NO_PERMISSION);

		const startDate = req.api.params.start_date
		const endDate = req.api.params.end_date

		const newExamId = (await db.insert('exam', {
			class_id: req.api.params.class_id,
			name: req.api.params.name,
			description: req.api.params.description,
			start_date: startDate,
			end_date: endDate
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

		// Thực hiện so sánh các bài làm khi tới thời điểm kết thúc của bài thi
		const job = scheduleJob(endDate, () => {
			console.log("Đang rà soát bài thi số", newExamId)
			doDiff(newExamId).catch(e => console.error(e))
		})
	}
))

bindApiWithRoute(API_EXAM.EXAM__DELETE, api => apiRoute(router, api,
	apiValidatorParam(api, 'exam_id').notEmpty().isInt().toInt(),

	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
		const r = await db.query("SELECT class.teacher_id FROM exam INNER JOIN class ON exam.class_id = class.id WHERE exam.id = ?", [req.api.params.exam_id])
		const result = r[0]['teacher_id'];
		const notAdmin = userInfo.role != Roles.SYSTEM_ADMIN;

		if (!AUTHENTICATED_ROLES.includes(userInfo.role))
			return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		if (result !== userInfo.id && notAdmin)
			return req.api.sendError(ErrorCodes.NO_PERMISSION);

		await db.query(`
            DELETE cs FROM check_sub cs
            JOIN submission s1 ON cs.sub_id1 = s1.uuid
            JOIN submission s2 ON cs.sub_id2 = s2.uuid
            JOIN exam_cont ec ON s1.question_id = ec.id
            WHERE ec.exam_id = ?
        `, [req.api.params.exam_id]);

        await db.query(`
            DELETE s FROM submission s
            JOIN exam_cont ec ON s.question_id = ec.id
            WHERE ec.exam_id = ?
        `, [req.api.params.exam_id]);

        await db.query("DELETE FROM exam_cont WHERE exam_id = ?", [req.api.params.exam_id]);

        await db.query("DELETE FROM exam WHERE id = ?", [req.api.params.exam_id]);
		
		req.api.sendSuccess();
	}
))

bindApiWithRoute(API_EXAM.EXAM__UPDATE_INFO, api => apiRoute(router, api,
	apiValidatorParam(api, 'exam_id').notEmpty().isInt().toInt(),
	apiValidatorParam(api, 'name').trim().optional(),
	apiValidatorParam(api, 'description').trim().optional(),
	apiValidatorParam(api, 'start_date').optional().isISO8601().toDate(),
	apiValidatorParam(api, 'end_date').optional().isISO8601().toDate(),
	apiValidatorParam(api, 'questions').isArray().toArray().optional(),

	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
		const r = await db.query(
			"SELECT class.teacher_id FROM exam INNER JOIN class ON exam.class_id = class.id WHERE exam.id = ?",
			[req.api.params.exam_id]
		);
		const result = r[0]['teacher_id'];
		const notAdmin = userInfo.role != Roles.SYSTEM_ADMIN;

		if (!AUTHENTICATED_ROLES.includes(userInfo.role)) {
			return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);
		}

		if (result !== userInfo.id && notAdmin) {
			return req.api.sendError(ErrorCodes.NO_PERMISSION);
		} else {
			await db.query(
				'UPDATE exam SET start_date = ?, end_date = ?, name = ?, description = ? WHERE id = ?',
				[req.api.params.start_date, req.api.params.end_date, req.api.params.name, req.api.params.description, req.api.params.exam_id]
			);
		}

		const questionIds = req.api.params.questions;
		if (questionIds && questionIds.length > 0) {
			await db.query(
				'DELETE FROM submission WHERE question_id IN (SELECT id FROM exam_cont WHERE exam_id = ?)',
				[req.api.params.exam_id]
			);
			await db.query('DELETE FROM exam_cont WHERE exam_id = ?', [req.api.params.exam_id]);
			for (const questionId of questionIds) {
				await db.insert('exam_cont', {
					exercise_id: questionId,
					exam_id: req.api.params.exam_id
				});
			}
		}

		req.ctx.logActivity('Sửa thông tin bài kiểm tra', { exam_id: req.api.params.exam_id });
		req.api.sendSuccess();
	}
));

bindApiWithRoute(API_EXAM.EXAM__GET, api => apiRoute(router, api,
	apiValidatorParam(api, 'exam_id').notEmpty().isInt().toInt(),

	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;

		let responseData;
		const queryResult = await db.query(
			"SELECT name, description, start_date, end_date FROM exam WHERE id = ?",
			[req.api.params.exam_id]
		);
		const examData = await db.query(
			"SELECT id,exercise_id FROM exam_cont WHERE exam_id = ?",
			[req.api.params.exam_id]
		);

		if (!AUTHENTICATED_ROLES.includes(userInfo.role)) {
			return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);
		}
		if (userInfo.role == Roles.STUDENT) {

			const queryclass = await db.query("SELECT class_id FROM exam WHERE id = ?", [req.api.params.exam_id]);
			const classId = queryclass[0]['class_id'];
			const querystudent = await db.query("SELECT id FROM student WHERE user_id = ? AND class_id = ?", [userInfo.id, classId]);

			console.log("exam qq", req.api.params.exam_id);
			console.log("useinfoid", userInfo.id);
			console.log("class_id la ", classId);
			
			const studentId = querystudent[0]['id'];

			const examconIds = examData.map(row => row.id);
			const examContPlaceholders = examconIds.map(() => '?').join(',');

			const submissionMap = {};
			for (const questionId of examconIds) {
				const querySubmit = await db.query(
					`SELECT uuid
					FROM submission
					WHERE question_id = ?
					AND student_id = ?
					ORDER BY date_time DESC
					LIMIT 1`,
					[questionId, studentId]
				);
				submissionMap[questionId] = querySubmit.length ? querySubmit[0].uuid : null;
			}

			const examCont = examData.map(row => ({
				questions_id: row.id,
				exercise_id: row.exercise_id,
				submitted: submissionMap[row.id] || null
			}));

			responseData = {
				exam: queryResult[0],
				exercise_ids: examCont
			}
		} else {
			responseData = {
				exam: queryResult[0],
				exercise_ids: examData.map((row: any) => row.exercise_id)
			}
		}

		req.api.sendSuccess(responseData);
	}
));

bindApiWithRoute(API_EXAM.EXAM__LIST, api => apiRoute(router, api,
	apiValidatorParam(api, 'class_id').notEmpty().isInt().toInt(),

	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
		const queryResult = await db.query("SELECT * FROM exam WHERE class_id = ?", [req.api.params.class_id])
		const examArray = queryResult

		req.api.sendSuccess({ exam: examArray })
	}
))

bindApiWithRoute(API_EXAM.EXAM__LIST__ALL, api => apiRoute(router, api,

	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;

		let finalResult;
		if (userInfo.role == Roles.STUDENT) {
			try {
				const queryclass = await db.query("SELECT class_id FROM student WHERE user_id = ?", [userInfo.id]);
				const classIds = queryclass.map(row => row.class_id);

				if (classIds.length === 0) {
					throw new Error(`Không tìm thấy class_id cho user_id ${userInfo.id}.`);
				}

				const placeholders = classIds.map(() => '?').join(',');
				const queryResult = await db.query(`SELECT * FROM exam WHERE class_id IN (${placeholders})`, classIds);

				const querystudent = await db.query(`SELECT id FROM student WHERE user_id = ? AND class_id IN (${placeholders})`, [userInfo.id, ...classIds]);
				const studentIds = querystudent.map(row => row.id);

				if (studentIds.length === 0) {
					throw new Error(`Không tìm thấy student_id cho user_id ${userInfo.id} và class_id ${classIds.join(', ')}.`);
				}

				const studentPlaceholders = studentIds.map(() => '?').join(',');

				finalResult = await Promise.all(queryResult.map(async (exam) => {
					try {
						const examCont = await db.query("SELECT id, exercise_id FROM exam_cont WHERE exam_id = ?", [exam.id]);

						if (!examCont || examCont.length === 0) {
							throw new Error(`Không tìm thấy exam_cont cho exam_id ${exam.id}. Cần cho thêm `);
						}

						const questionIdList = examCont.map(row => row.exercise_id);
						const examContIds = examCont.map(row => row.id);
						const examContPlaceholders = examContIds.map(() => '?').join(',');

						const querysubmit = await db.query(
							`SELECT question_id, COUNT(1) AS no_of_submit
							FROM submission
							WHERE question_id IN (${examContPlaceholders})
							AND student_id IN (${studentPlaceholders})
							GROUP BY question_id`,

							[...examContIds, ...studentIds]
						);

						const submissionMap = querysubmit.reduce((map, row) => {
							map[row.question_id] = row.no_of_submit > 0;
							return map;
						}, {});

						const examContDetails = examCont.map(row => ({
							questions_id: row.id,
							exercise_id: row.exercise_id,
							submitted: !!submissionMap[row.id]
						}));

						return {
							...exam,
							exam_cont: examContDetails
						};
					} catch (innerError) {
						console.error(`Error processing exam ${exam.id}:`, innerError);
						return {
							...exam,
							exam_cont: [],
							is_submitted: false,
							error: true
						};
					}
				}));

			} catch (error) {
				console.error('Error processing exams:', error);
			}

			req.api.sendSuccess({ exam: finalResult })
		}
	}))
