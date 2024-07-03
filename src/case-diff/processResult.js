//hàm kiểm tra xem có phải ký tự đầu dòng không
export function checkFirstLineChar(theAnswer, n) {
	if (n === 0)
		return true;
	else {
		const previousChar = theAnswer[n - 1];
		const currentChar = theAnswer[n];
		if (previousChar === '\n' && currentChar !== '\n') return true;
		else return false;
	}
}

//hàm kiểm tra đây phải ký tự số không
export function checkCharNum(theAnswer, n) {
	return (theAnswer[n] === '0' ||
			theAnswer[n] === '1' ||
			theAnswer[n] === '2' ||
			theAnswer[n] === '3' ||
			theAnswer[n] === '4' ||
			theAnswer[n] === '5' ||
			theAnswer[n] === '6' ||
			theAnswer[n] === '7' ||
			theAnswer[n] === '8' ||
			theAnswer[n] === '9')
}

//hàm chuyễn chuỗi string số thành số
export function findRealNumber(theAnswer, n) {
	let numNum = new Array(5);
	let countNum = 0;
	while (checkCharNum(theAnswer, n)) {
		numNum[countNum] = parseInt(theAnswer.charAt(n));
		countNum++;
		n++;
	}
	let realValue = 0;
	for (let i = 0; i < countNum; i++) {
		realValue = realValue * 10 + numNum[i];
	}
	return realValue;
}

//hàm đếm xem dãy ký tự số có bao nhiêu chữ số
export function findRealStep(theAnswer, n) {
	let countNum = 0;
	while (checkCharNum(theAnswer, n)) {
		countNum++;
		n++;
	}
	return countNum;
}

//hàm tạo kết quả so sánh thành chuỗi string
export function makeStringResult(lineCode) {
	let chuoiString = '';
	let chuoiNumber = [];
	let dau = cuoi = 1;
	while (dau <= (lineCode.length - 1)) {
		if (lineCode[dau] === true) {
			for (let i = dau + 1; i <= (lineCode.length - 1); i++) {
				if (lineCode[i] === false) {
					cuoi = i - 1;
					break;
				}
				else {
					cuoi = i;
				}
			}
			if (dau === cuoi) {
				chuoiString += ` - The line ${dau}.\n`;
				let areaNumber = [dau, dau];
				chuoiNumber.push(areaNumber);
				dau = cuoi + 2;
				cuoi = dau;
			}
			else if (dau < cuoi) {
				chuoiString += ` - The line from ${dau} to ${cuoi}.\n`;
				let areaNumber = [dau, cuoi];
				chuoiNumber.push(areaNumber);
				dau = cuoi + 2;
				cuoi = dau;
			}
		}
		else {
			dau++;
			cuoi = dau;
		}
	}

	return chuoiNumber;  //trả về kiểu mảng số dòng
}

//hàm tạo kết quả
export function makeResult(theAnswer, lengthCode1, lengthCode2) {
	let lineCode1 = new Array(lengthCode1 + 1).fill(true);
	let lineCode2 = new Array(lengthCode2 + 1).fill(true);
	let numSimilarLine1 = 0;
	let numSimilarLine2 = 0;
	let numDiffLine1 = 0;
	let numDiffLine2 = 0;
	let rateSimilarCode1 = 0;
	let rateSimilarCode2 = 0;

	for (let i = 0; i < theAnswer.length; i++) {
		if (checkFirstLineChar(theAnswer, i) && checkCharNum(theAnswer, i)) {
			let strFile1;
			let endFile1;
			let strFile2;
			let endFile2;
			let typeDiff;
			let currentChar = i;
			let step = 1;

			strFile1 = findRealNumber(theAnswer, currentChar);
			step = findRealStep(theAnswer, currentChar);
			currentChar = currentChar + step;
			step = 1;

			if (theAnswer[currentChar] === ',') {
				currentChar = currentChar + step;
				endFile1 = findRealNumber(theAnswer, currentChar);
				step = findRealStep(theAnswer, currentChar);
				currentChar = currentChar + step;
				step = 1;
			} else {
				endFile1 = strFile1;
			}

			typeDiff = theAnswer[currentChar];
			currentChar = currentChar + step;
			strFile2 = findRealNumber(theAnswer, currentChar);
			step = findRealStep(theAnswer, currentChar);
			currentChar = currentChar + step;
			step = 1;

			if (theAnswer[currentChar] === ',') {
				currentChar = currentChar + step;
				endFile2 = findRealNumber(theAnswer, currentChar);
				step = findRealStep(theAnswer, currentChar);
				currentChar = currentChar + step;
				step = 1;
			} else {
				endFile2 = strFile2;
			}

			if (typeDiff === 'c') {
				for (let x = strFile1; x <= endFile1; x++) {
					lineCode1[x] = false;
				}
				for (let x = strFile2; x <= endFile2; x++) {
					lineCode2[x] = false;
				}
			}
			else if (typeDiff === 'a') {
				for (let x = strFile2; x <= endFile2; x++) {
					lineCode2[x] = false;
				}
			}
			else if (typeDiff === 'd') {
				for (let x = strFile1; x <= endFile1; x++) {
					lineCode1[x] = false;
				}
			}
		}
	}
	for (let a = 1; a <= lengthCode1; a++) {
		if (lineCode1[a] === true) numSimilarLine1++;
		if (lineCode1[a] === false) numDiffLine1++;
	}
	for (let a = 1; a <= lengthCode2; a++) {
		if (lineCode2[a] === true) numSimilarLine2++;
		if (lineCode2[a] === false) numDiffLine2++;
	}
	rateSimilarCode1 = Number(((numSimilarLine1 / (lengthCode1 - 1)) * 100).toFixed(2));
	rateSimilarCode2 = Number(((numSimilarLine2 / (lengthCode2 - 1)) * 100).toFixed(2));

	let resultCode1 = makeStringResult(lineCode1);
	let resultCode2 = makeStringResult(lineCode2);

	let childObj = {
		rateSimilarFileRoot: rateSimilarCode1,
		rateSimilarFileComp: rateSimilarCode2,
		stringResultFileRoot: resultCode1,
		stringResultFileComp: resultCode2
	}

	return childObj;
}