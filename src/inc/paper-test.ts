import { execFileSync } from "child_process";
import db from "../inc/database.js";

export type MultipleChoiceAnswer = "A" | "B" | "C" | "D";

export async function evaluate(examId: number, uuid: string) {
	const submitPath = process.env["PAPER_TEST_PATH"];
	const imagePath = submitPath + "/" + uuid;

	const output = execFileSync(
		"/root/Auto-Scores-National-Multiple-Choice-Test/env/bin/python",
		["/root/auto_score.py", imagePath],
		{
			encoding: "utf-8",
			env: {
				TF_CPP_MIN_LOG_LEVEL: "3",
			},
		}
	);
	const resultJson: { [key: string]: MultipleChoiceAnswer[] } =
		JSON.parse(output);

	// Lấy danh sách đáp án đúng của đề thi này

	const correctAnswersQuery = `
		SELECT
			eqm.question_index AS question_number,
			qam_correct.answer_index AS choice
		FROM paper_exam_mapping AS eqm
		JOIN (
			SELECT
				qam.exam_mapping_id,
				qam.answer_index
			FROM paper_exam_qa_mapping AS qam
			JOIN paper_question_answer qa ON qam.answer_id = qa.id
			WHERE correct = TRUE
		) AS qam_correct ON eqm.id = qam_correct.exam_mapping_id
		WHERE eqm.exam_id = ?`;

	const correctAnswersSql = (await db.query(correctAnswersQuery, [
		examId,
	])) as {
		question_number: number;
		choice: MultipleChoiceAnswer;
	}[];

	const correctAnswers = Array<MultipleChoiceAnswer | null>(
		correctAnswersSql.length
	).fill(null);
	correctAnswersSql.forEach(
		(q) => (correctAnswers[q.question_number] = q.choice)
	);

	if (correctAnswers.every((v) => v === null)) {
		throw new Error("Đề thi này chưa được lập bảng đáp án đúng.");
	}

	const studentAnswers = Array<MultipleChoiceAnswer | null>(
		correctAnswers.length
	).fill(null);
	Object.entries(resultJson).forEach(([qNo, choices]) => {
		if (choices.length == 1) studentAnswers[Number(qNo)] = choices[0];

		// Nếu chọn nhiều đáp án thì coi như sai
	});

	// Tạo mảng kết quả chấm (đúng/sai/không có đáp án) và điền giá trị
	// dựa vào hai cái trên

	const result = correctAnswers.map((q, qNo) => {
		if (q) {
			return q == studentAnswers[qNo];
		}

		return null;
	});

	// Chấm điểm
	// (là tỷ lệ đáp án đúng trên tổng số những cái có đáp án)

	const baseScore = 10; // Thang điểm
	let correctCount = 0,
		totalCount = 0;
	result.forEach((a) => {
		if (a !== null) {
			totalCount++;
			if (a) correctCount++;
		}
	});

	const finalScore = baseScore * (correctCount / totalCount);
	await db.query("UPDATE paper_submission SET score = ? WHERE uuid = ?", [
		finalScore,
		uuid,
	]);
	console.info(
		`Đã cập nhật điểm của bài làm trắc nghiệm ${uuid}, bài đạt ${finalScore}/${baseScore} điểm.`
	);
}
