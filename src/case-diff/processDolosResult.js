function getRateSimilarDolos(resultOfDolos, contentRootFile, contentCompFile) {
	let rateSimilarChar = {
		rateSimilarRootFile: null,
		rateSimilarCompFile: null,
	};

	let totalCharRootFile = 0;
	let totalCharCompFile = 0;
	let totalSimilarCharRootFile = 0;
	let totalSimilarCharCompFile = 0;
	let contentRootFileCutLine = contentRootFile.split('\n');
	let contentCompFileCutLine = contentCompFile.split('\n');
	let arrTotalRoot = new Array(contentRootFileCutLine.length);
	let arrTotalComp = new Array(contentCompFileCutLine.length);

	// tính rate file thứ nhất
	for (let i = 0; i < contentRootFileCutLine.length; i++) {
		arrTotalRoot[i] = new Array(contentRootFileCutLine[i].length).fill(0);
		totalCharRootFile += contentRootFileCutLine[i].length;
	}

	for (let i = 0; i < resultOfDolos.length; i++) {
		let startRow = resultOfDolos[i].Root.startRow;
		let startCol = resultOfDolos[i].Root.startCol;
		let endRow = resultOfDolos[i].Root.endRow;
		let endCol = resultOfDolos[i].Root.endCol;

		if (startRow !== endRow) {
			for (let x = startCol; x <= contentRootFileCutLine[startRow].length; x++) {
				arrTotalRoot[startRow][x] = 1;
			}
			for (let x = startRow + 1; x < endRow - 1; x++) {
				for (let y = 0; y < arrTotalRoot[x].length; y++) {
					arrTotalRoot[x][y] = 1;
				}
			}
			for (let x = 0; x <= endCol; x++) {
				arrTotalRoot[endRow][x] = 1;
			}
		} else {
			for (let x = startCol; x < endCol; x++) {
				arrTotalRoot[startRow][x] = 1;
			}
		}
	}

	for (let i = 0; i < contentRootFileCutLine.length; i++) {
		for (let y = 0; y < arrTotalRoot[i].length; y++) {
			if (arrTotalRoot[i][y] === 1) {
				totalSimilarCharRootFile++;
			}
		}
	}

	// tính rate file thứ 2
	for (let i = 0; i < contentCompFileCutLine.length; i++) {
		totalCharCompFile += contentCompFileCutLine[i].length;
		arrTotalComp[i] = new Array(contentCompFileCutLine[i].length).fill(false);
	}

	for (let i = 0; i < resultOfDolos.length; i++) {
		let startRow = resultOfDolos[i].Comp.startRow;
		let startCol = resultOfDolos[i].Comp.startCol;
		let endRow = resultOfDolos[i].Comp.endRow;
		let endCol = resultOfDolos[i].Comp.endCol;

		if (startRow !== endRow) {
			for (let x = startCol; x <= contentCompFileCutLine[startRow].length; x++) {
				arrTotalComp[startRow][x] = true;
			}
			for (let x = startRow + 1; x < endRow - 1; x++) {
				arrTotalComp[x].fill(true);
			}
			for (let x = 0; x <= endCol; x++) {
				arrTotalComp[endRow][x] = true;
			}
		} else {
			for (let x = startCol; x < endCol; x++) {
				arrTotalComp[startRow][x] = true;
			}
		}
	}

	for (let i = 0; i < contentCompFileCutLine.length; i++) {
		for (let y = 0; y < arrTotalComp[i].length; y++) {
			if (arrTotalComp[i][y] === true) {
				totalSimilarCharCompFile++;
			}
		}
	}

	rateSimilarChar.rateSimilarRootFile = Number(((totalSimilarCharRootFile / totalCharRootFile) * 100).toFixed(2));
	rateSimilarChar.rateSimilarCompFile = Number(((totalSimilarCharCompFile / totalCharCompFile) * 100).toFixed(2));

	return rateSimilarChar;
}


function makeContenSimilarDolos(theAnswerFromDolos) {
	let contentSimilar = [];
	let contentSimilarRootFile = [];
	let contentSimilarCompFile = [];
	for (let i = 0; i < theAnswerFromDolos.length; i++) {
		let areaRoot = [];
		let areaComp = [];
		areaRoot.push(theAnswerFromDolos[i].Root.startRow);
		areaRoot.push(theAnswerFromDolos[i].Root.endRow);
		contentSimilarRootFile.push(areaRoot);
		areaComp.push(theAnswerFromDolos[i].Comp.startRow);
		areaComp.push(theAnswerFromDolos[i].Comp.endRow);
		contentSimilarCompFile.push(areaComp);
	}
	contentSimilar.push(contentSimilarRootFile);
	contentSimilar.push(contentSimilarCompFile);

	return contentSimilar;
}

export default {
	getRateSimilarDolos,
	makeContenSimilarDolos,
}