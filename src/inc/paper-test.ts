import { execFileSync } from "child_process";
import db from '../inc/database.js';

type Answer = 'A' | 'B' | 'C' | 'D'

export async function evaluate(examId: number, uuid: string) {
    const submitPath = process.env['PAPER_TEST_PATH']
    const imagePath = submitPath + '/' + uuid

    const output = execFileSync('/root/auto_score.py', [imagePath], {
        encoding: 'utf-8',
    })
    const resultJson: { [key: string]: Answer[] } = JSON.parse(output);

    // Lấy danh sách đáp án đúng của đề thi này
    const correctAnswersSql = await db.query("SELECT question_id, choice FROM paper_test_answer WHERE exam_id = ?", [examId]) as {
        question_id: number,
        choice: Answer
    }[]

    
    const correctAnswers = Array<Answer | null>(correctAnswersSql.length).fill(null)
    correctAnswersSql.forEach(q => correctAnswers[q.question_id] = q.choice)
    
    if (correctAnswers.every(v => v === null)) {
        throw new Error("Đề thi này chưa được lập bảng đáp án đúng.")
    }

    const studentAnswers = Array<Answer | null>(correctAnswers.length).fill(null)
    Object.entries(resultJson).forEach(([qNo, choices]) => {
        if (choices.length == 1)
            studentAnswers[Number(qNo)] = choices[0]
    })

    // Tạo mảng kết quả chấm (đúng/sai/không có đáp án) và điền giá trị
    // dựa vào hai cái trên

    const result = correctAnswers.map((q, qNo) => {
        if (q) {
            return q == studentAnswers[qNo]
        }

        return null;
    });

    // Chấm điểm
    // (là tỷ lệ đáp án đúng trên tổng số những cái có đáp án)

    const baseScore = 10        // Thang điểm
    let correctCount = 0, totalCount = 0
    result.forEach((a) => {
        if (a !== null) {
            totalCount++
            if (a) correctCount++
        }
    });

    const finalScore = baseScore * (correctCount / totalCount)
    await db.query("UPDATE paper_submission SET score = ? WHERE uuid = ?", [finalScore, uuid])
	console.info(`Đã cập nhật điểm của bài làm trắc nghiệm ${uuid}, bài đạt ${finalScore}/${baseScore} điểm.`)
}