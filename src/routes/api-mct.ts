import { Router, Response } from "express";
import {
	UserInfo,
	API_MCT,
	ErrorCodes,
	Roles,
	API_EXAM,
} from "../inc/constants.js";
import {
	apiRoute,
	bindApiWithRoute,
	apiValidatorParam,
	ApiRequest,
} from "../inc/api.js";
import db from "../inc/database.js";
import { MultipleChoiceAnswer } from "../inc/paper-test.js";

const router = Router();
export default router;

bindApiWithRoute(API_MCT.QUESTION_CREATE, (api) =>
	apiRoute(
		router,
		api,

		apiValidatorParam(api, "content").trim().notEmpty(),
		apiValidatorParam(api, "description").trim().optional(),
		apiValidatorParam(api, "courseId").notEmpty().isInt().toInt(),
		apiValidatorParam(api, "answers").isArray().toArray(),

		async (req: ApiRequest, res: Response) => {
			const userInfo = (await req.ctx.getUser()?.getInfo()) as UserInfo;
			const payload = req.api.params as {
				content: string;
				courseId: number;
				answers: {
					content: string;
					correct: boolean;
				}[];
			};

			const newQuestionId = (
				await db.insert("exercise", {
					description: payload.content,
					on_paper: true,
					course_id: payload.courseId,
				})
			).insertId as number;

			payload.answers.forEach((a) =>
				db.insert("paper_question_answer", {
					...a,
					question_id: newQuestionId,
				})
			);

			req.ctx.logActivity("Tạo bai hoc mới", {
				questionId: newQuestionId,
			});
			req.api.sendSuccess({ questionId: newQuestionId });
		}
	)
);

bindApiWithRoute(API_EXAM.EXAM_PAPER_CREATE, (api) =>
	apiRoute(
		router,
		api,

		apiValidatorParam(api, "classId").notEmpty().isInt().toInt(),
		apiValidatorParam(api, "name").trim().optional(),
		apiValidatorParam(api, "description").trim().optional(),
		apiValidatorParam(api, "startDate").notEmpty().isISO8601().toDate(),
		apiValidatorParam(api, "endDate").notEmpty().isISO8601().toDate(),
		apiValidatorParam(api, "questions").isArray().toArray(),

		async (req: ApiRequest, res: Response) => {
			const userInfo = (await req.ctx.getUser()?.getInfo()) as UserInfo;
			const queryResult = await db.query(
				"SELECT teacher_id FROM class WHERE id = ?",
				[req.api.params.class_id]
			);
			const creatorId = queryResult[0]["teacher_id"];
			const notAdmin = userInfo.role != Roles.SYSTEM_ADMIN;
			if (notAdmin && userInfo.id != creatorId)
				return req.api.sendError(ErrorCodes.NO_PERMISSION);

			const payload = req.api.params as {
				classId: number;
				name: string;
				description: string;
				startDate: Date;
				endDate: Date;
				questions: {
					index: number;
					questionId: number;
					answers: {
						index: MultipleChoiceAnswer;
						answerId: number;
					}[];
				}[];
			};

			const newExamId = (
				await db.insert("exam", {
					class_id: payload.classId,
					name: payload.name,
					description: payload.description,
					start_date: payload.startDate,
					end_date: payload.endDate,
					on_paper: true,
				})
			)?.insertId;

			if (!newExamId) return req.api.sendError(ErrorCodes.INTERNAL_ERROR);

			payload.questions.forEach((q) => {
				db.insert("paper_exam_mapping", {
					question_index: q.index,
					question_id: q.questionId,
					exam_id: newExamId,
				}).then((result) => {
					const questionMappingId = result.insertId as number;
					q.answers.forEach((a) => {
						db.insert("paper_exam_qa_mapping", {
							exam_mapping_id: questionMappingId,
							answer_index: a.index,
							answer_id: a.answerId,
						});
					});
				});
			});

			req.ctx.logActivity("Tạo bài thi trên giấy mới", {
				exam_id: newExamId,
			});
			req.api.sendSuccess({ exam_id: newExamId });
		}
	)
);
