import fs from 'fs';

import callDiffUbuntu from './callDiff.js';
import callDolos from './processDolosResult.js';
import { makeTheQuestionForChatGPT, callChatGPT, getTheRateSimilar } from './callChatGPT.js'
import { makeResult } from './processResult.js';
import { executeDolos } from './runDolosFromLinux.js';
import { addCheckSub, changeNull } from './dbHelpers.js';
import db from '../inc/database.js';
import { LANG_EXT_MAP } from '../inc/execution.js';

/**
* Kiểm tra các bài làm trong một bài thi
* @param {Number} id ID của bài thi
*/
export default async function main(id: number): Promise<void> {
	// Lấy danh sách các câu hỏi
	const zut: Array<any> = await db.query("SELECT id, exercise_id FROM exam_cont WHERE exam_id = ?", [id]);
	const questions: Array<number> = zut.map(z => z.id)

	questions.forEach(async (questionId: number) => {

		/**
		* UUID các bài nộp mới nhất của tất cả sinh viên cho câu hỏi này
		*/
		const latestSubmissions: Array<any> = await db.query(
			`SELECT
    s1.*
FROM
    submission s1
JOIN (
    SELECT
        student_id,
        MAX(date_time) AS latest_date_time
    FROM
        submission
    WHERE
        question_id = 100
    GROUP BY
        student_id
) s2 ON s1.student_id = s2.student_id AND s1.date_time = s2.latest_date_time
WHERE
    s1.question_id = 100
AND
    s1.uuid = (
        SELECT MIN(uuid)
        FROM submission
        WHERE student_id = s1.student_id AND date_time = s1.date_time AND question_id = s1.question_id
    )`,
			[questionId, questionId]
		)


		for (let i = 0; i < latestSubmissions.length; i++) {
			// File gốc

			const nameBaseFile = latestSubmissions[i].uuid + '.' + LANG_EXT_MAP[latestSubmissions[i].language];
			const pathBaseFile = `${process.env.SUBMISSION_PATH}/${nameBaseFile}`
			let contentBaseFile = fs.readFileSync(pathBaseFile, 'utf-8')
			let sizeBaseFile = fs.statSync(pathBaseFile).size
			let lineBaseFile = contentBaseFile.split('\n').length;

			let checkComp = false;

			for (let j = i + 1; j < latestSubmissions.length; j++) {
				console.log(`Đang so sánh bài làm ${latestSubmissions[i].uuid} và ${latestSubmissions[j].uuid}...`);

				// File so sánh cùng

				const nameCompFile = latestSubmissions[j].uuid + '.' + LANG_EXT_MAP[latestSubmissions[j].language];
				const pathCompFile = `${process.env.SUBMISSION_PATH}/${nameCompFile}`
				const sizeCompFile = fs.statSync(pathCompFile).size;

				const sizeRatio = sizeBaseFile / sizeCompFile

				if (sizeRatio < 1.25 && sizeRatio > 0.75) {
					// Trường hợp kích thước 2 bài code xấp xỉ nhau

					checkComp = true;

					const contentCompFile = fs.readFileSync(pathCompFile, 'utf-8');
					const lineCompFile = contentCompFile.split('\n').length;

					let mang: Array<Object> = [];

					let obj0 = {
						nameFile1: nameBaseFile,
						nameFile2: nameCompFile,
					};

					mang.push(obj0);

					let objDiff = {
						comparisonMethod: 'diff',
						rateSimilar: null as number | null,
						contentSimilarFile1: null as any,
						contentSimilarFile2: null as any,
					};

					let objDolos = {
						comparisonMethod: 'dolos',
						rateSimilar: null as number | null,
						contentSimilarFile1: null as any,
						contentSimilarFile2: null as any,
					};

					let objChatGPT = {
						comparisonMethod: 'chatgpt',
						rateSimilar: null as number | null,
						contentSimilarFile1: null as string | null,
						contentSimilarFile2: null as string | null,
					};

					///////////////////////
					// 1. SO SÁNH BẰNG DIFF
					///////////////////////

					const answerUbuntu = callDiffUbuntu(pathBaseFile, pathCompFile);

					if (answerUbuntu === '') {
						objDiff.rateSimilar = 100;
						objDiff.contentSimilarFile1 = 'Bài làm giống nhau';
						objDiff.contentSimilarFile2 = 'Bài làm giống nhau';

					} else {
						let objProcessUbtResult = makeResult(answerUbuntu, lineBaseFile, lineCompFile);
						let a = objProcessUbtResult.rateSimilarFileRoot;
						let b = objProcessUbtResult.rateSimilarFileComp;

						objDiff.rateSimilar = (a > b) ? a : b;
						objDiff.contentSimilarFile1 = objProcessUbtResult.stringResultFileRoot;
						objDiff.contentSimilarFile2 = objProcessUbtResult.stringResultFileComp;
					}

					//////////////////////////
					// 2. SO SÁNH BẰNG CHATGPT
					//////////////////////////

					let theQuestionForChatGPT = makeTheQuestionForChatGPT(contentBaseFile, contentCompFile);
					let theAnswerFromChatPGT = await callChatGPT(theQuestionForChatGPT);
					let rateSimilarChatGPT = getTheRateSimilar(theAnswerFromChatPGT);

					objChatGPT.rateSimilar = parseFloat(rateSimilarChatGPT as string);

					////////////////////////
					// 3. SO SÁNH BẰNG DOLOS
					////////////////////////

					let theAnswerFromDolos = await executeDolos([pathBaseFile, pathCompFile]);

					if (theAnswerFromDolos.length > 0) {
						let rateDolos = callDolos.getRateSimilarDolos(theAnswerFromDolos, contentBaseFile, contentCompFile);
						let a = rateDolos.rateSimilarRootFile;
						let b = rateDolos.rateSimilarCompFile;

						objDolos.rateSimilar = (a! > b!) ? a : b;

						let contentSimilarDolos = callDolos.makeContenSimilarDolos(theAnswerFromDolos);
						let contentSimilarDolosBaseFile = contentSimilarDolos[0];
						let contentSimilarDolosCompFile = contentSimilarDolos[1];

						objDolos.contentSimilarFile1 = contentSimilarDolosBaseFile;
						objDolos.contentSimilarFile2 = contentSimilarDolosCompFile;
					} else {
						objDolos.rateSimilar = 0;
					}


					mang.push(objDiff);
					mang.push(objChatGPT);
					mang.push(objDolos);

					 if (objDiff.rateSimilar > 0 || objChatGPT.rateSimilar > 0 || objDolos.rateSimilar! > 0) {
					//if (objDiff.rateSimilar > 0 || objDolos.rateSimilar! > 0) {
						const resultJson = JSON.stringify(mang, replacer, 2).replace(/"\[(.*?)\]"/, "[$1]");

						addCheckSub(latestSubmissions[i].uuid, latestSubmissions[j].uuid, resultJson, questionId);
					}
				}
			}

			changeNull(nameBaseFile, 1);
		}
	})
}

function replacer(key, value) {
	if (key === "contentSimilarFile1" || key === "contentSimilarFile2") {
		return JSON.stringify(value);
	}
	return value;
}