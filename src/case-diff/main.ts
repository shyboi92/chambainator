import fs from 'fs';

import callDiffUbuntu from './callDiff';
import callDolos from './processDolosResult';
import { makeTheQuestionForChatGPT, callChatGPT, getTheRateSimilar } from './callChatGPT.js'
import { makeResult } from './processResult';
import { executeDolos } from './runDolosFromLinux';

import db from '../inc/database.js';
import { LANG_EXT_MAP } from '../inc/execution.js';

/**
* Kiểm tra các bài làm trong một bài thi
* @param {Number} id ID của bài thi
* @returns {Promise<Object>} Kết quả so sánh
*/
export default async function main(id: number): Promise<Object | null> {
	// Lấy danh sách các câu hỏi
	const quesion_idArr = await db.query("SELECT id, exercise_id FROM exam_cont WHERE exam_id = ?", [id]);

	quesion_idArr.forEach(async (quesion_ID: number) => {

		/**
		* UUID các bài nộp mới nhất của tất cả sinh viên cho câu hỏi này
		*/
		//////////////////////////////////////////////////////////////////////////////////////////////
		///// TODO: điền nốt câu query  . Đại khái là
		///// select * from submit where exam_cont_id = ? group by student_id ...
		//////////////////////////////////////////////////////////////////////////////////////////////
		const latestSubmissions: Array<any> = await db.query(" WHERE exam_cont_id = ?", [quesion_ID])

		// Nếu ko có từ 2 bài trở lên thì thôi
		if (!(latestSubmissions.length >= 2)) {
			return null
		}

		for (let i = 0; i < latestSubmissions.length; i++) {
			// File gốc

			const nameBaseFile = latestSubmissions[i].uuid + '.' + LANG_EXT_MAP[latestSubmissions[i].language];
			const pathBaseFile = `${process.env.SUBMISSION_PATH}/${nameBaseFile}`
			let contentBaseFile = fs.readFileSync(pathBaseFile, 'utf-8')
			let sizeBaseFile = fs.statSync(pathBaseFile).size
			let lineBaseFile = contentBaseFile.split('\n').length;

			let checkComp = false;

			for (let j = i + 1; j < latestSubmissions.length; j++) {
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
						return mang
					}
				}
			}
		}
	})

	return null;
}