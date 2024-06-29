const fs = require('fs');
const directoryAddress = require('./directoryAddress');
const { dir } = require('console');
const { get } = require('http');





async function getFileSize(filePath){
    try {
        const stats = await fs.promises.stat(filePath);
        return stats.size;
    } catch (error) {
        console.error('ERROR GETTING FILE SIZE: ', error);
        return null;
    }
}
// fs.promises.stat phương thức lấy thông tin tệp tin
/* PT stat() trả về 1 fs.Stats object, chứa các thông tin: kt, date, ... của 1 file */





async function getFileTotalLines(filePath) {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const lines = fileContent.split('\n');
        return lines.length;
    } catch (error) {
        console.error(error);
        return -1;
    }
}



async function getFileTotalChars(filePath) {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        return fileContent.length;
    } catch (error) {
        console.error(error);
        return -1;
    }
}




async function getFileData(filePath){
    try{
        const dataFile = fs.readFileSync(filePath, 'utf-8');
        return dataFile;
    } catch (error) {
        console.error(error);
        return -1;
    }
}




//chạy thử hàm
async function demo(){
    try {
        let mang = ['bai0.cpp', 'bai1.cpp', 'bai2.cpp', 'bai3.cpp', 'bai4.cpp', 'bai5.cpp', 'bai6.cpp'];
        for(let i=0;i<mang.length;i++){
            let name = mang[i];
            let filePath = directoryAddress.pathFolderSaveAssignmentsWindow + mang[i];
            let fileSize = await getFileSize(filePath);
            let fileLines = await getFileTotalLines(filePath);
            let fileChars = await getFileTotalChars(filePath);
            console.log('Tên file: ', name, ' - Size: ', fileSize, ' - Line: ', fileLines, 'Char: ', fileChars );
        }
    } catch (error) {
        console.error(error);
    }
}

//demo();





module.exports = {
    getFileSize: getFileSize,
    getFileTotalLines: getFileTotalLines,
    getFileTotalChars: getFileTotalChars,
    getFileData: getFileData
}