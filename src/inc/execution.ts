import { execSync } from 'child_process';
import db from '../inc/database.js';


const MS_PER_SEC = 1e3
const NS_PER_SEC = 1e9

export enum Language {
	C = 'C',
	CPP = 'C++'
}

export const LANG_EXT_MAP: { [key in Language]: string } = {
	[Language.C]: 'c',
	[Language.CPP]: 'cpp'
};

export const LANG_COMPILER_MAP: { [key in Language]: string } = {
	[Language.C]: 'gcc',
	[Language.CPP]: 'g++'
}

export function findLanguageByExtension(extension: string): string | null {
	for (const [language, extOfLang] of Object.entries(LANG_EXT_MAP)) {
		if (extOfLang == extension) {
			return language;
	  	}
	}
	return null;
}

export function getEnumEntry(value: string): Language | undefined {
	for (let key in Language) {
		if (Language[key as keyof typeof Language] === value) {
			return Language[key as keyof typeof Language];
		}
	}
	return undefined;
}

function findCompilerByLang(lang: Language): string {
	return LANG_COMPILER_MAP[lang]
}

interface SubmissionInfo {
	uuid: string,
	path: string,
	lang: Language
}


export async function evaluateSubmission({ uuid, path: sourceFilePath, lang }: SubmissionInfo) {
	const EXE_PATH = process.env['EXE_PATH'] + '/' + uuid

	let compileCmd: string
	if ([Language.C, Language.CPP].includes(lang)) {
		// Cú pháp câu lệnh biên dịch C và C++ là gần như tương tự nhau,
		// chỉ khác tên chương trình biên dịch (gcc và g++)

		const compiler = findCompilerByLang(lang)
		compileCmd = `${compiler} -o ${EXE_PATH} ${sourceFilePath}`
	} else {
		throw new Error("Không biết biên dịch ngôn ngữ " + lang + " kiểu gì.")
	}

	//#region Biên dịch chương trình
	try {
		execSync(compileCmd, {
			timeout: 1 * 60 * MS_PER_SEC	// Biên dịch tối đa trong 1 phút
		})
	} catch (error) {
		throw new Error(`Gặp lỗi khi biên dịch bài làm ${uuid}: ${error.message}`)
	}

	console.info(`Biên dịch thành công bài làm ${uuid}`)
	//#endregion

	//#region Lấy test case và các thông tin liên quan đến bài nộp
	const TEST_CASES = await db.query("SELECT * FROM test_case WHERE exercise_id = (SELECT ec.exercise_id FROM submission s JOIN exam_cont ec ON ec.id = s.question_id WHERE uuid = ?)", [uuid])

	/**
	 * Object lưu kết quả chạy của từng test case.
	 * Trong đó:
	 * 	- Key là ID của test case
	 * 	- Value là boolean, true nếu đạt, false nếu không đạt và null nếu chưa chấm
	 */
	const TEST_RESULT = {}
	TEST_CASES.forEach(c => {
		let testCaseId = c.id
		TEST_RESULT[testCaseId] = null
	})
	//#endregion

	//#region Chạy chương trình, với từng test case
	TEST_CASES.forEach(c => {
		const TEST_CASE_ID = c.id
		let execCmd = `/root/ptrace-v2 ${EXE_PATH}`
		let timeout = c.run_time
		let testInput = c.input
		let desiredOutput = c.output

		try {
			const actualOutput = execSync(execCmd, {
				timeout: timeout * MS_PER_SEC,
				input: testInput + '\n',
				encoding: 'utf-8'
			})

			const RESULT = actualOutput.trim() == desiredOutput.trim()
			TEST_RESULT[TEST_CASE_ID] = RESULT

			if (RESULT) {
				console.info(`Bài làm ${uuid}, test case ${TEST_CASE_ID}: Kết quả khớp`)
			} else {
				console.info(`Bài làm ${uuid}, test case ${TEST_CASE_ID}: Lệch kết quả`)
			}
		} catch (e) {
			TEST_RESULT[TEST_CASE_ID] = false

			if (e.code == 'ETIMEDOUT') {
				console.info(`Bài làm ${uuid}, test case ${TEST_CASE_ID}: Chạy quá thời gian (tối đa ${timeout} giây)`)
			} else {
				console.error(`Bài làm ${uuid}, test case ${TEST_CASE_ID}: Lỗi lạ: `, e)
			}
		}
	})

	// Tính điểm: Lấy thang điểm 10, chia cho tổng số case rồi nhân với số case đạt
	const MAX_SCORE = 10
	var SCORE = MAX_SCORE / TEST_CASES.length * Object.values(TEST_RESULT).filter(Boolean).length

	// Cập nhật kết quả chạy trong CSDL
	if (isNaN(SCORE)) SCORE = 0;
	await db.query("UPDATE submission SET score = ? WHERE uuid = ?", [SCORE, uuid])
	console.info(`Đã cập nhật điểm của bài làm ${uuid}, bài đạt ${SCORE}/${MAX_SCORE} điểm`)
	//#endregion
}