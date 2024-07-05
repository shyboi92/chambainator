import db from '../inc/database.js';

export function changeNull(dataUUID, newData) {
	db.query('UPDATE submission SET checked = ? WHERE uuid = ?', [newData, dataUUID])
}

export function addCheckSub(uuid1, uuid2, content, question_id) {
	db.insert('check_sub', {
		sub_id1: uuid1,
		sub_id2: uuid2,
		result: content,
		question_id
	})

	console.log(`So sánh thành công hai bài làm ${uuid1} và ${uuid2}. Xem dữ liệu trong bảng kết quả so sánh.`);
}