import {Router} from 'express';
import {ErrorCodes, Roles, AUTHENTICATED_ROLES, UserInfo, API_SUBMISSION, HIGHER_ROLES} from '../inc/constants.js';
import db from '../inc/database.js';
import { LANG_EXT_MAP, Language, evaluateSubmission, findLanguageByExtension, getEnumEntry } from '../inc/execution.js';

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


bindApiWithRoute(API_SUBMISSION.SUBMISSION_LIST_LANGUAGES, api => apiRoute(
	router,
	api,

	async (req: ApiRequest) => {
		const arrayOfLangs = Object.values(Language)
		return req.api.sendSuccess(arrayOfLangs)
	}
))


bindApiWithRoute(API_SUBMISSION.SUBMISSION__CREATE__BYTEXT, api => apiRoute(router, api,
	apiValidatorParam(api, 'exam_id').trim().notEmpty().isInt().toInt(),
	apiValidatorParam(api, 'exercise_id').notEmpty().isInt().toInt(),
	apiValidatorParam(api, 'description').trim().optional(),
	apiValidatorParam(api, 'source_code').notEmpty(),
	apiValidatorParam(api, 'language').trim().notEmpty(),
	apiValidatorParam(api, 'class_id').notEmpty().isInt().toInt(),

	async (req: ApiRequest) => {
		//#region Nhận bài làm từ phía sinh viên gửi lên
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
		let targetQuestionId: Number, targetStudentId: Number;

		try {
			const question_id = await db.query('SELECT id FROM exam_cont WHERE exam_id = ? AND exercise_id = ?', [req.api.params.exam_id, req.api.params.exercise_id]);

			if (question_id.length === 0) {
				throw new Error('Không tìm thấy câu hỏi với exam_id và exercise_id đã cho.');
			}

			targetQuestionId = question_id[0]['id'];
		} catch (error) {
			console.error(error.message);
			return req.api.sendError(500)
		}

		if (!targetQuestionId) {
            return req.api.sendError(ErrorCodes.INVALID_PARAMETERS, 'Không tìm thấy câu hỏi.');
        }

		try {
			const student_id = await db.query('SELECT id FROM student WHERE user_id = ? AND class_id = ?', [userInfo.id, req.api.params.class_id]);

			//console.log('userid: ',userInfo.id, ' classid: ',req.api.params.class_id,' studentid: ', student_id);
			if (student_id.length === 0) {
				throw new Error('Không tìm thấy sinh viên với user_id với class_id đã cho.');
			}

			targetStudentId = student_id[0]['id'];
		} catch (error) {
			console.error(error.message);
			return req.api.sendError(500)
		}

		//console.log('resultstudentid', resultstudentid)

		if (!targetStudentId) {
            return req.api.sendError(ErrorCodes.INVALID_PARAMETERS, 'Không tìm thấy sinh viên trong lớp.');
        }

		if (!AUTHENTICATED_ROLES.includes(userInfo.role))
			return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		const codeInPlainText = req.api.params['source_code']

		// Bài làm là ngôn ngữ gì
		const lang = getEnumEntry(req.api.params['language'])
		if (!lang) {
			return req.api.sendError(ErrorCodes.INTERNAL_ERROR, 'Ngôn ngữ lập trình này không được hỗ trợ bởi hệ thống.')
		}

		// Tìm đuôi tương ứng (sẽ dùng khi ghi file bài làm vào kho)
		const ext = LANG_EXT_MAP[lang]
		//#endregion


		//#region Lưu thông tin ban đầu của bài làm vào CSDL
		const NEW_SUBMISSION_UUID = randomUUID()
		const submitDate = new Date();
		const isoDate = submitDate.toISOString().slice(0, 19).replace('T', ' ')

		const endtimequery = await db.query("SELECT end_date FROM exam WHERE id = ?",[req.api.params.exam_id]);
		const endtimeresult = new Date(endtimequery[0]['end_date']);
		if (submitDate > endtimeresult) return req.api.sendError(ErrorCodes.INTERNAL_ERROR, 'quá hạn nộp bài rồi bn ơi');
		try {
			await db.insert('submission', {
				uuid: NEW_SUBMISSION_UUID,
				student_id: targetStudentId,
				date_time: isoDate,
				question_id: targetQuestionId,
				description: req.api.params.description || null,
				language: lang,
				name: null
			})

			console.info('Ghi nhận bài làm mới với UUID:', NEW_SUBMISSION_UUID)
		} catch (e) {
			return req.api.sendError(ErrorCodes.INTERNAL_ERROR);
		}

	   	req.ctx.logActivity('New submission', { submission_id: NEW_SUBMISSION_UUID });
	   	//#endregion

		//#region Lưu bài làm vào kho bài gửi lên
		const SUBMIT_PATH = process.env['SUBMISSION_PATH']
		const FILE_PATH = SUBMIT_PATH + '/' + NEW_SUBMISSION_UUID + '.' + ext
		fs.writeFileSync(FILE_PATH, codeInPlainText);
		//#endregion

		req.api.sendSuccess({ submission_id: NEW_SUBMISSION_UUID });

		//#region Tiến hành chấm bài (trên một luồng riêng)
		evaluateSubmission({ uuid: NEW_SUBMISSION_UUID, path: FILE_PATH, lang })
		//#endregion
	}
))

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
		let targetQuestionId: Number, targetStudentId: Number;

		try {
			const question_id = await db.query('SELECT id FROM exam_cont WHERE exam_id = ? AND exercise_id = ?', [req.api.params.exam_id, req.api.params.exercise_id]);

			if (question_id.length === 0) {
				throw new Error('Không tìm thấy câu hỏi với exam_id và exercise_id đã cho.');
			}

			targetQuestionId = question_id[0]['id'];
		} catch (error) {
			console.error(error.message);
			return req.api.sendError(500)
		}

		if (!targetQuestionId) {
            return req.api.sendError(ErrorCodes.INVALID_PARAMETERS, 'Không tìm thấy câu hỏi.');
        }

		try {
			const student_id = await db.query('SELECT id FROM student WHERE user_id = ? AND class_id = ?', [userInfo.id, req.api.params.class_id]);

			//console.log('userid: ',userInfo.id, ' classid: ',req.api.params.class_id,' studentid: ', student_id);
			if (student_id.length === 0) {
				throw new Error('Không tìm thấy sinh viên với user_id với class_id đã cho.');
			}

			targetStudentId = student_id[0]['id'];
		} catch (error) {
			console.error(error.message);
			return req.api.sendError(500)
		}

		//console.log('resultstudentid', resultstudentid)

		if (!targetStudentId) {
            return req.api.sendError(ErrorCodes.INVALID_PARAMETERS, 'Không tìm thấy sinh viên trong lớp.');
        }

		if (!AUTHENTICATED_ROLES.includes(userInfo.role))
			return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		if (!req.files?.data_file)
			return req.api.sendError(ErrorCodes.INVALID_PARAMETERS, 'Chưa gửi file bài làm');

		const originalFileExt = path.extname(req.files.data_file.name).toLowerCase().slice(1);
		const fileNameWithoutExt = path.parse(req.files.data_file.name).name

		const acceptedExts = LANG_EXT_MAP['C'].concat(LANG_EXT_MAP['C++'])
		if (!acceptedExts.includes(originalFileExt))
			return req.api.sendError(ErrorCodes.INVALID_UPLOAD_FILE_TYPE, 'Hệ thống chỉ nhận file mã nguồn C, C++');

		const BINARY_DATA = req.files.data_file.data

		// Bài làm là ngôn ngữ gì
		const lang = findLanguageByExtension(originalFileExt) as Language
		if (lang == null) {
			return req.api.sendError(ErrorCodes.INTERNAL_ERROR, 'Chả biết bài làm là ngôn ngữ gì.')
		}

		//#endregion


		//#region Lưu thông tin ban đầu của bài làm vào CSDL
		const NEW_SUBMISSION_UUID = randomUUID()
		
		const submitDate = new Date();
		const isoDate = submitDate.toISOString().slice(0, 19).replace('T', ' ')
		console.log("ngay nop bai", submitDate);
		const endtimequery = await db.query("SELECT end_date FROM exam WHERE id = ?",[req.api.params.exam_id]);
		const endtimeresult = new Date(endtimequery[0]['end_date']);
		console.log("ngay het han", endtimeresult);
		console.log("so sanh", submitDate > endtimeresult);
		if (submitDate > endtimeresult) return req.api.sendError(ErrorCodes.INTERNAL_ERROR, 'quá hạn nộp bài rồi bn ơi');
		try {
			await db.insert('submission', {
				uuid: NEW_SUBMISSION_UUID,
				student_id: targetStudentId,
				date_time: isoDate,
				// exercise_id: req.api.params.exercise_id,
				question_id: targetQuestionId,
				description: req.api.params.description || null,
				language: lang,
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
		const FILE_PATH = SUBMIT_PATH + '/' + NEW_SUBMISSION_UUID + '.' + originalFileExt
		fs.writeFileSync(FILE_PATH, BINARY_DATA);
		//#endregion

		req.api.sendSuccess({ submission_id: NEW_SUBMISSION_UUID });

		//#region Tiến hành chấm bài (trên một luồng riêng)
		evaluateSubmission({ uuid: NEW_SUBMISSION_UUID, path: FILE_PATH, lang })
		//#endregion
	}
))

bindApiWithRoute(API_SUBMISSION.SUBMISSION__GET, api => apiRoute( router, api,

	apiValidatorParam(api, 'submission_id').notEmpty().isString(),

	async (req: ApiRequest) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
		// const r = await db.query("SELECT course.user_id FROM exercise INNER JOIN course ON exercise.course_id = course.id WHERE exercise.id = ?",[req.api.params.class_id])
		// const result = r[0]['user_id'];

		if (!AUTHENTICATED_ROLES.includes(userInfo.role))
			return req.api.sendError(ErrorCodes.NO_PERMISSION);

		const querystudentexam = await db.query("SELECT student_id, question_id FROM submission WHERE uuid = ?",[req.api.params.submission_id]);
		const resultquerystudent = querystudentexam[0]['student_id'];
		const resultqueryexamcont = querystudentexam[0]['question_id'];
		const student = await db.query("SELECT user_id FROM student WHERE id = ?",[resultquerystudent]) ;
		const userId = student[0]['user_id'];
		const examcont = await db.query("SELECT exam_id, exercise_id FROM exam_cont WHERE id = ?",[resultqueryexamcont]);
		const exam_id = examcont[0]['exam_id'];
		const exercise_id = examcont[0]['exercise_id'];
		const res = await db.query("SELECT date_time, score, description, name, language FROM submission WHERE uuid = ?", [req.api.params.submission_id])
		return req.api.sendSuccess( {
			result: res[0],
			exam_id: exam_id,
			exercise_id: exercise_id,
			user_id: userId
		})
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

bindApiWithRoute(API_SUBMISSION.SUBMISSION__CHECK, api => apiRoute(router, api,

	apiValidatorParam(api, 'exam_id').notEmpty().isInt().toInt(),
	apiValidatorParam(api, 'exercise_id').notEmpty().isInt().toInt(),

	async (req: ApiRequest) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;

		// Truy vấn để lấy teacher_id
		const r = await db.query("SELECT c.teacher_id FROM class c JOIN exam e ON c.id = e.class_id WHERE e.id = ?", [req.api.params.exam_id]);
		if (r == null || r.length == 0) {
			return req.api.sendError(ErrorCodes.INTERNAL_ERROR, "Không tìm thấy thông tin lớp học");
		}
		const result = r[0]['teacher_id'];

		// Truy vấn để lấy question_id
		const questionquery = await db.query("SELECT id FROM exam_cont WHERE exam_id = ? AND exercise_id = ?", [req.api.params.exam_id, req.api.params.exercise_id]);
		if (questionquery == null || questionquery.length == 0) {
			return req.api.sendError(ErrorCodes.INTERNAL_ERROR, "Không tìm thấy câu hỏi");
		}
		const questionresult = questionquery[0]['id'];

		// Kiểm tra quyền truy cập
		if (!AUTHENTICATED_ROLES.includes(userInfo.role))
			return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		if (result != userInfo.id && ![Roles.SYSTEM_ADMIN].includes(userInfo.role))
			return req.api.sendError(ErrorCodes.NO_PERMISSION);

		// Truy vấn để lấy thông tin kiểm tra
		const res = await db.query("SELECT result FROM check_sub WHERE question_id = ?", [questionresult]);
		if (res == null || res.length == 0) {
			return req.api.sendError(ErrorCodes.INTERNAL_ERROR, "Chưa hết hạn kiểm tra hoặc kiểm tra trùng lặp chưa chạy");
		}

		return req.api.sendSuccess(res);
	}
));



