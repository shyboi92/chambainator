import { execSync } from "child_process";

export default function callDiff(pathFileCodeRoot: string, pathFileCodeCompare: string) {
	const result = execSync(`diff -iwB ${pathFileCodeRoot} ${pathFileCodeCompare}`, {
		encoding: "utf-8"
	});
	return result.trim()
}