import { Dolos } from "@dodona/dolos-lib";

export async function executeDolos(files) {
	const dolos = new Dolos();
	const report = await dolos.analyzePaths(files);
	let ketQua = [];

	for (const pair of report.allPairs()) {
		for (const fragment of pair.buildFragments()) {
			const left = fragment.leftSelection;
			const right = fragment.rightSelection;
			const newItem = {
				"Root": {
					"startRow": left.startRow,
					"startCol": left.startCol,
					"endRow": left.endRow,
					"endCol": left.endCol,
				},
				"Comp": {
					"startRow": right.startRow,
					"startCol": right.startCol,
					"endRow": right.endRow,
					"endCol": right.endCol,
				}
			};
			ketQua.push(newItem);
		}
	}

	return ketQua;
}