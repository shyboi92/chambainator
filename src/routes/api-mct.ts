import { Router, Response } from "express";
import { UserInfo, API_MCT } from "../inc/constants.js";
import {
	apiRoute,
	bindApiWithRoute,
	apiValidatorParam,
	ApiRequest,
} from "../inc/api.js";
import db from "../inc/database.js";

const router = Router();
export default router;

bindApiWithRoute(API_MCT.QUESTION_CREATE, (api) =>
	apiRoute(
		router,
		api,

		apiValidatorParam(api, "content").trim().notEmpty(),
		apiValidatorParam(api, "description").trim().optional(),
		apiValidatorParam(api, "course_id").notEmpty().isInt().toInt(),
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

			const newQuestionId = (await db.insert('exercise', {
				description: payload.content,
				on_paper: true,
				course_id: payload.courseId
			}))?.insertId;

			payload.answers.forEach(a => db.insert('paper_question_answer', {
				...a,
				question_id: newQuestionId
			}))

			req.ctx.logActivity('Tạo bai hoc mới', { questionId: newQuestionId });
			req.api.sendSuccess({ questionId: newQuestionId });
		}
	)
);
