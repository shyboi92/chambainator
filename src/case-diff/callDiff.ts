import { execSync } from "child_process";

export default function callDiff(pathFileCodeRoot: string, pathFileCodeCompare: string) {
	let result: string
	try {
		result = execSync(`diff -iwB ${pathFileCodeRoot} ${pathFileCodeCompare}`, { encoding: "utf-8" });
	} catch (e) {
		if (e.status == 1) {
			result = e
		} else {
			console.error(e)
			return null
		}
	}

	return result.trim()
}