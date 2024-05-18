import { execSync } from 'child_process';
import db from '../inc/database.js';

/**
 * Đổi đường dẫn Windows sang WSL
 * @param {String} windowsPath Đường dẫn trên Windows
 * @returns Đường dẫn trên Linux (WSL)
 */
function convertWindowsPathToWslPath(windowsPath) {
	// Regular expression to match Windows drive letters followed by a colon
	const driveLetterRegex = /([A-Z]):/g;

	// Replace all occurrences of Windows drive letters with their WSL paths
	const wslPath = windowsPath.replace(driveLetterRegex, (match, driveLetter) => {
		// Convert the drive letter to lowercase and prepend "/mnt/"
		return `/mnt/${driveLetter.toLowerCase()}`;
	});

	// Replace backslashes with forward slashes
	return wslPath.replace(/\\/g, '/');
}

const MS_PER_SEC = 1e3
const NS_PER_SEC = 1e9

export async function evaluateSubmission({ uuid, path: sourceFilePath }) {
	const EXE_PATH = process.env['EXE_PATH_WSL'] + '/' + uuid
	let srcPathWsl = convertWindowsPathToWslPath(sourceFilePath)

	let compileCmd = `wsl -e gcc -o ${EXE_PATH} ${srcPathWsl}`

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
	const TEST_CASES = await db.query("SELECT * FROM test_case WHERE exercise_id = (SELECT ec.exercise_id FROM submit s JOIN exam_cont ec ON ec.id = s.question_id WHERE uuid = ?)", [uuid])
	
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
		let execCmd = `wsl -e ${EXE_PATH}`
		let timeout = c.run_time
		let testInput = c.input
		let desiredOutput = c.output

		// let timeRun = null

		try {
			// const TIME_START = process.hrtime()

			const actualOutput = execSync(execCmd, {
				timeout: timeout * MS_PER_SEC,
				input: testInput + '\n',
				encoding: 'utf-8'
			})

			// const TIME_DIFF = process.hrtime(TIME_START)
			// timeRun = (TIME_DIFF[0] * NS_PER_SEC + TIME_DIFF[1]) / NS_PER_SEC

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
			}
		}
	})

	// Tính điểm:
	// Lấy thang điểm 10, chia cho tổng số case rồi nhân với số case đạt
	const MAX_SCORE = 10
	const SCORE = MAX_SCORE / TEST_CASES.length * Object.values(TEST_RESULT).filter(Boolean).length

	// Cập nhật kết quả chạy trong CSDL
	await db.query("UPDATE submit SET score = ? WHERE uuid = ?", [SCORE, uuid])
	console.info(`Đã cập nhật điểm của bài làm ${uuid}, bài đạt ${SCORE}/${MAX_SCORE} điểm`)
	//#endregion
}