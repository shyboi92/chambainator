import {Router} from 'express';
import {ErrorCodes, Roles, AUTHENTICATED_ROLES, UserInfo, API_SUBMISSION, HIGHER_ROLES} from '../inc/constants.js';
import db from '../inc/database.js';
import { evaluateSubmission } from '../inc/execution.js';

import {apiRoute, bindApiWithRoute, apiValidatorParam, ApiRequest} from '../inc/api.js';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

const router = Router();
export default router;


function getFileByUUID(directory: string, uuid: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        fs.readdir(directory, (err, files) => {
            if (err) {
                reject(err);
                return;
            }

            const matchingFile = files.find(file => {
                const [fileUUID, ext] = file.split('.');
                return fileUUID === uuid;
            });

            if (!matchingFile) {
                reject(new Error(`File with UUID ${uuid} not found in directory ${directory}`));
                return;
            }

            const filePath = path.join(directory, matchingFile);
            resolve(filePath);
        });
    });
}


bindApiWithRoute(API_SUBMISSION.SUBMISSION__CREATE, api => apiRoute(
	router, 
	api,
	
	apiValidatorParam(api, 'exam_id').trim().notEmpty().isInt().toInt(),
	apiValidatorParam(api, 'exercise_id').notEmpty().isInt().toInt(),
	apiValidatorParam(api, 'description').trim().optional(),
	apiValidatorParam(api, 'class_id').notEmpty().isInt().toInt(),
	
	async (req: ApiRequest) => {
		//#region Nhận bài làm từ phía sinh viên gửi lên
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
		let resultquestionid, resultstudentid;
		try {
			const question_id = await db.query('SELECT id FROM exam_cont WHERE exam_id = ? AND exercise_id = ?', [req.api.params.exam_id, req.api.params.exercise_id]);
			
			if (question_id.length === 0) {
				throw new Error('Không tìm thấy câu hỏi với exam_id và exercise_id đã cho.');
			}

			resultquestionid = question_id[0]['id'];
		} catch (error) {
			console.error(error.message);
		}
		if (!resultquestionid) {
            return req.api.sendError(ErrorCodes.INVALID_PARAMETERS, 'Không tìm thấy câu hỏi.');
        }

		try {
			const student_id = await db.query('SELECT id FROM student WHERE user_id = ? AND class_id = ?', [userInfo.id, req.api.params.class_id]);
			
			//console.log('userid: ',userInfo.id, ' classid: ',req.api.params.class_id,' studentid: ', student_id);
			if (student_id.length === 0) {
				throw new Error('Không tìm thấy sinh viên với user_id với class_id đã cho.');
			}
		
			resultstudentid = student_id[0]['id'];
		} catch (error) {
			console.error(error.message);
		}
		//console.log('resultstudentid', resultstudentid)
		if (!resultstudentid) {
            return req.api.sendError(ErrorCodes.INVALID_PARAMETERS, 'Không tìm thấy sinh vien trong lop.');
        }
		if (!AUTHENTICATED_ROLES.includes(userInfo.role))
			return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);


		if (!req.files?.data_file)
			return req.api.sendError(ErrorCodes.INVALID_PARAMETERS, 'Chưa gửi file bài làm');
		
		const originalFileExt = path.extname(req.files.data_file.name).toLowerCase();
		const fileNameWithoutExt = path.parse(req.files.data_file.name).name

		if (!['.c'].includes(originalFileExt))
			return req.api.sendError(ErrorCodes.INVALID_UPLOAD_FILE_TYPE, 'Hệ thống chỉ nhận file mã nguồn C');

		const BINARY_DATA = req.files.data_file.data
		//#endregion
		
		//#region Lưu thông tin ban đầu của bài làm vào CSDL
		const NEW_SUBMISSION_UUID = randomUUID()

		try {
			await db.insert('submission', {
				uuid: NEW_SUBMISSION_UUID,
				student_id: resultstudentid,
				date_time: new Date().toISOString().slice(0, 19).replace('T', ' '),
				// exercise_id: req.api.params.exercise_id,
				question_id: resultquestionid,
				description: req.api.params.description || null,
				name: fileNameWithoutExt
			})

			console.info('Ghi nhận bài làm mới với UUID:', NEW_SUBMISSION_UUID)
		} catch (e) {
			return req.api.sendError(ErrorCodes.INTERNAL_ERROR);
		}

	   	req.ctx.logActivity('New submission', { submission_id: NEW_SUBMISSION_UUID });
	   	//#endregion

		//#region Lưu bài làm vào kho bài gửi lên
		const SUBMIT_PATH = process.env['SUBMISSION_PATH']
		const FILE_PATH = SUBMIT_PATH + '/' + NEW_SUBMISSION_UUID + originalFileExt
		fs.writeFileSync(FILE_PATH, BINARY_DATA);
		//#endregion

		req.api.sendSuccess({ submission_id: NEW_SUBMISSION_UUID });
		
		//#region Tiến hành chấm bài (trên một luồng riêng)
		evaluateSubmission({ uuid: NEW_SUBMISSION_UUID, path: FILE_PATH })
		//#endregion
	}
))

bindApiWithRoute(API_SUBMISSION.SUBMISSION__GET, api => apiRoute(
	router,
	api,

	apiValidatorParam(api, 'submission_id').notEmpty().isString(),

	async (req: ApiRequest) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
		// const r = await db.query("SELECT course.user_id FROM exercise INNER JOIN course ON exercise.course_id = course.id WHERE exercise.id = ?",[req.api.params.class_id])
		// const result = r[0]['user_id'];
		
		if (!AUTHENTICATED_ROLES.includes(userInfo.role))
			return req.api.sendError(ErrorCodes.NO_PERMISSION);

		const res = db.query("SELECT * FROM submission WHERE uuid = ?", [req.api.params.submission_id])
		req.api.sendSuccess(res[0])
	}
))

bindApiWithRoute(API_SUBMISSION.SUBMISSION__GET_FILE, api => apiRoute(
	router,
	api,

	apiValidatorParam(api, 'submission_id').notEmpty().isString(),

	async (req: ApiRequest) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
		// const r = await db.query("SELECT course.user_id FROM exercise INNER JOIN course ON exercise.course_id = course.id WHERE exercise.id = ?",[req.api.params.class_id])
		// const result = r[0]['user_id'];
		
		if (!AUTHENTICATED_ROLES.includes(userInfo.role))
			return req.api.sendError(ErrorCodes.NO_PERMISSION);

		const SUB_ID = req.api.params.submission_id
		const SUBMIT_PATH = process.env['SUBMISSION_PATH']

		if (!SUBMIT_PATH) {
			return req.api.sendError(ErrorCodes.INTERNAL_ERROR, "Duong dan luu bai nop chua duoc chi dinh!")
		}

		getFileByUUID(SUBMIT_PATH, SUB_ID)
			.then(filePath => {
				fs.readFile(filePath, (err, data) => {
					if (err) {
						return req.api.sendError(ErrorCodes.INTERNAL_ERROR, "Khong the doc file voi UUID " + SUB_ID)
					}
					
					const filename = path.basename(filePath);
					
					req.api.res.setHeader('Content-Type', 'text/plain')
					req.api.res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
					req.api.res.write(data)
					req.api.res.end()
				})				
			})
			.catch(err => {
				console.error('Error:', err);
			});
	}
))

bindApiWithRoute(API_SUBMISSION.SUBMISSION__LIST, api => apiRoute( router, api,
	apiValidatorParam(api, 'exam_id').notEmpty().isInt().toInt(),
	apiValidatorParam(api, 'exercise_id').notEmpty().isInt().toInt(),
	apiValidatorParam(api, 'class_id').notEmpty().isInt().toInt(),

	async (req: ApiRequest) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
		let result;
		let creator, resultquestionid ;
		try {
			const question_id = await db.query('SELECT id FROM exam_cont WHERE exam_id = ? AND exercise_id = ?', [req.api.params.exam_id, req.api.params.exercise_id]);
			
			if (question_id.length === 0) {
				throw new Error('Không tìm thấy câu hỏi với exam_id và exercise_id đã cho.');
			}
			console.log (question_id)
			resultquestionid = question_id[0]['id'];
		} catch (error) {
			console.error(error.message);
		}
		if (!resultquestionid) {
            return req.api.sendError(ErrorCodes.INVALID_PARAMETERS, 'Không tìm thấy câu hỏi.');
        }

		console.log(resultquestionid)
		if (userInfo.role == Roles.STUDENT) {
		creator = await db.query("SELECT id FROM student WHERE user_id = ? AND class_id = ? ",[userInfo.id, req.api.params.class_id])
		const result1 = creator[0]['id'];
		result= await db.query("SELECT * FROM submission WHERE student_id = ? AND question_id = ?",[result1, resultquestionid])
		} else {
			result = await db.query("SELECT * FROM submission WHERE question_id = ?", [resultquestionid]);
		}
		
		if (!AUTHENTICATED_ROLES.includes(userInfo.role))
			return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		if (creator == null && !HIGHER_ROLES.includes(userInfo.role))
			return req.api.sendError(ErrorCodes.NO_PERMISSION);
		
		req.api.sendSuccess({list_submission : result});
	}
))
