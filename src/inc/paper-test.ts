import { execFileSync } from "child_process";
import db from '../inc/database.js';

export async function evaluate(examId: number, uuid: string) {
    const submitPath = process.env['PAPER_TEST_PATH']
    const imagePath = submitPath + '/' + uuid

    const output = execFileSync('/root/auto_score.py', [imagePath], {
        encoding: 'utf-8',
    })
    const resultJson: { [key: string]: string[] } = JSON.parse(output);

    Object.values(resultJson).forEach((ans, q) => {
        
    })

    // lay danh sach dap an dung tu DB

    // lap danh sach dap an sinh vien da chon

    // tao mang dung-sai va tien hanh fill gia tri true dua vao 2 cai tren
    // sau do cham diem

    const result = Array(120).fill(false)
}