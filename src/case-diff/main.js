const fs = require('fs');
const path = require('path');
const util = require('util')

const directoryAddress = require('./directoryAddress');
const getFileNameExerciseArr = require('./getFileNameExerciseArr');
const getQuestion_id = require('./getQuestion_id');
const callDiffUbuntu = require('./callDiff');
const callChatGPT = require('./callChatGPT');
const callDolos = require('./callDolos');
const processUbtResult = require('./processUbtResult');
const getFileProperties = require('./getFileProperties');
const makeResult = require('./makeResult');
const changeNull = require('./changeNull');
const { executeDolos } = require('./runDolosFromLinux');


/**
 * Kiểm tra các bài làm trong một bài thi
 * @param {Number} id ID của bài thi 
 */
async function main(id) {
    let start = Date.now();
    try {
        let quesion_idArr = [];
        quesion_idArr = await getQuestion_id.get_question_id(id);
        //kết quả sẽ là mảng {id: x},{id: y}
        console.log('Số question_id:', quesion_idArr.length);
        //console.log(quesion_idArr);

        //console.log(quesion_idArr);
        for (let number_question_id = 0; number_question_id < quesion_idArr.length; number_question_id++) {

            let quesion_ID = quesion_idArr[number_question_id];

            //truy cập vào database và lấy ra danh sách tên các bài submit sẽ so sánh
            // let fileNameArr = await getFileNameExerciseArr.getFileNameExerciseArr(1);
            // console.log(`VD: `, fileNameArr);
            // console.log(typeof (fileNameArr));
            // console.log(fileNameArr.length);
            //console.log('__________________');
            // fileNameArr = await demoGetFileNameExerciseArr.demoGetFileNameExerciseArr(directoryAddress.pathFolderSaveAssignmentsWindow);
            //console.log(`VD: `, fileNameArr);
            //console.log(typeof(fileNameArr));

            console.log('Tại question_id=', quesion_idArr[number_question_id]);
            let fileNameCArr = [];
            let fileNameCppArr = [];
            try {
                fileNameCArr = await getFileNameExerciseArr.getFileNameExerciseCArr(quesion_idArr[number_question_id]);
                fileNameCppArr = await getFileNameExerciseArr.getFileNameExerciseCppArr(quesion_idArr[number_question_id]);
                // console.log('filenameCArr:', fileNameCArr);
                // console.log('fileNameCppArr:', fileNameCppArr);

                //VD
                // fileNameCArr = ['bai0', 'bai1', 'bai2', 'bai3', 'bai4'];
                // fileNameCppArr = ['bai0', 'bai1', 'bai2', 'bai3', 'bai4','bai5', 'bai6', 'bai7', 'bai8', 'bai9', 'bai10', 'bai11', 'bai12','bai44', 'bai66', 'bai441'];
                
                for (let C = 0; C < fileNameCArr.length; C++) {
                    fileNameCArr[C] = fileNameCArr[C] + '.c';
                }
                for (let Cpp = 0; Cpp < fileNameCppArr.length; Cpp++) {
                    fileNameCppArr[Cpp] = fileNameCppArr[Cpp] + '.cpp';
                }
                // console.log('filenameCArr:', fileNameCArr);
                // console.log('fileNameCppArr:', fileNameCppArr);
                let fileNameArr = [];
                fileNameArr.push(fileNameCArr);
                fileNameArr.push(fileNameCppArr);
                //đưa hai mảng C và Cpp vào 1 mảng lớn
                console.log(fileNameArr);

                for (let lang = 0; lang < fileNameArr.length; lang++) {
                    try {
                        if (fileNameArr[lang].length === 1) {

                            // let childObj = 'JUST ONE ASSIGNMENT!';
                            // let obj = [];
                            // obj.push(childObj);
                            // let arrJSON = JSON.stringify(obj, null, 2);
                            // let nameJSONFile = 'checked_CaseDIFF_' + fileNameArr[0] + '.json';
                            // let pathResultFolder = directoryAddress.pathFolderSaveCheckResultWindow;
                            // let pathJSONFile = path.join(pathResultFolder, nameJSONFile);

                            //fs.writeFileSync(pathJSONFile, arrJSON);
                            //console.log('Hoàn thành!');

                            //thay đổi checked thành khác null
                            changeNull.changeNull(fileNameArr[lang][0], 1);
                        }
                        //Lấy ra được nhiều hơn 1 bài thì thực hiện so sánh
                        else if (fileNameArr[lang].length > 1) {
                            for (let i = 0; i < fileNameArr[lang].length; i++) {

                                try {

                                    console.log('#######################:', fileNameArr[lang][i]);

                                    let nameRootFile = fileNameArr[lang][i];
                                    let pathRootFileWin = directoryAddress.pathFolderSaveAssignmentsWindow + fileNameArr[lang][i];
                                    let pathRootFileUbt = directoryAddress.pathFolderSaveAssignmentsUbuntu + fileNameArr[lang][i];
                                    let contentRootFile = await getFileProperties.getFileData(pathRootFileWin);
                                    let sizeRootFile = await getFileProperties.getFileSize(pathRootFileWin);
                                    let lineRootFile = await getFileProperties.getFileTotalLines(pathRootFileWin);


                                    let checkComp = false;

                                    for (let j = i + 1; j < fileNameArr[lang].length; j++) {

                                        try {

                                            if (j !== i) {
                                                //console.log(j);
                                                let nameCompFile = fileNameArr[lang][j];
                                                let pathCompFileWin = directoryAddress.pathFolderSaveAssignmentsWindow + fileNameArr[lang][j];
                                                let sizeCompFile = await getFileProperties.getFileSize(pathCompFileWin);

                                                //kiểm tra kích thước 2 bài code xấp xỉ nhau
                                                if ((sizeRootFile / sizeCompFile) < 1.25 && (sizeRootFile / sizeCompFile) > 0.75) {
                                                    checkComp = true;
                                                    console.log('       - ', nameRootFile, 'so sánh', nameCompFile, '');
                                                    let contentCompFile = await getFileProperties.getFileData(pathCompFileWin);
                                                    let lineCompFile = await getFileProperties.getFileTotalLines(pathCompFileWin);
                                                    let pathCompFileUbt = directoryAddress.pathFolderSaveAssignmentsUbuntu + fileNameArr[lang][j];

                                                    let mang = [];

                                                    let obj0 = {
                                                        nameFile1: nameRootFile,
                                                        nameFile2: nameCompFile,
                                                    };
                                                    mang.push(obj0);

                                                    let objDiff = {
                                                        comparisonMethod: 'DIFF(LINUX)',
                                                        rateSimilar: null,
                                                        contentSimilarFile1: null,
                                                        contentSimilarFile2: null,
                                                    };
                                                    let objDolos = {
                                                        comparisonMethod: 'Dolos-lib',
                                                        rateSimilar: null,
                                                        contentSimilarFile1: null,
                                                        contentSimilarFile2: null,
                                                    };
                                                    let objChatGPT = {
                                                        comparisonMethod: 'ChatGPT',
                                                        rateSimilar: null,
                                                        contentSimilarFile1: null,
                                                        contentSimilarFile2: null,
                                                    };

                                                    for (let theMethod = 1; theMethod <= 3; theMethod++) {
                                                        if (theMethod === 1) {
                                                            try {
                                                                //1.SO SÁNH BẰNG DIFF UBUNTU:
                                                                //đưa vào Ubuntu để so sánh
                                                                let answerUbuntu = await callDiffUbuntu(pathRootFileUbt, pathCompFileUbt);
                                                                //console.log(nameRootFile,'-',nameCompFile,'answerUbt:', answerUbuntu);


                                                                //xử lý lại kết quả ss từ Ubuntu
                                                                //Nếu kết quả từ Ubuntu là rỗng => hai bài giống hệt nhau, ko có điểm khác
                                                                if (answerUbuntu === '') {

                                                                    // childObj.nameCompFile = nameCompFile;
                                                                    // childObj.rateSimilarRootFile = 100;
                                                                    // childObj.contentSimilarRootFile = 'COPY TOGETHER!';

                                                                    objDiff.rateSimilar = 100;
                                                                    objDiff.contentSimilarFile1 = 'COPY IDENTICALLY!';
                                                                    objDiff.contentSimilarFile2 = 'COPY IDENTICALLY!';

                                                                }
                                                                else {
                                                                    //console.log('Không giống hệt');
                                                                    let objProcessUbtResult = processUbtResult.makeResult(answerUbuntu, lineRootFile, lineCompFile);
                                                                    /*
                                                                        let childObj = {
                                                                            rateSimilarFileRoot: rateSimilarCode1,
                                                                            rateSimilarFileCompare: rateSimilarCode2,
                                                                            stringResultFileRoot: resultCode1,
                                                                            stringResultFileCompare: resultCode2  
                                                                        }
                                                                    */
                                                                    //console.log(objProcessUbtResult);

                                                                    //tạo đối tượng con (từng file compare)
                                                                    // childObj.nameCompFile = nameCompFile;
                                                                    // childObj.rateSimilarRootFile = objProcessUbtResult.rateSimilarFileRoot;
                                                                    // childObj.contentSimilarRootFile = objProcessUbtResult.stringResultFileRoot;
                                                                    // childObj.contentSimilarCompFile = objProcessUbtResult.stringResultFileCompare;
                                                                    let a = objProcessUbtResult.rateSimilarFileRoot;
                                                                    let b = objProcessUbtResult.rateSimilarFileComp;
                                                                    objDiff.rateSimilar = (a > b) ? a : b;
                                                                    objDiff.contentSimilarFile1 = objProcessUbtResult.stringResultFileRoot;
                                                                    objDiff.contentSimilarFile2 = objProcessUbtResult.stringResultFileComp;

                                                                }
                                                            } catch (error) {
                                                                console.error(error);
                                                                continue;
                                                            }
                                                        }
                                                        else if (theMethod === 2) {
                                                            try {
                                                                //2.SO SÁNH BẰNG CHATGPT

                                                                let theQuestionForChatGPT = callChatGPT.makeTheQuestionForChatGPT(contentRootFile, contentCompFile);
                                                                let theAnswerFromChatPGT = await callChatGPT.callChatGPT(theQuestionForChatGPT);
                                                                //console.log('Front');
                                                                //console.log(theAnswerFromChatPGT);
                                                                let rateSimilarChatGPT = callChatGPT.getTheRateSimilar(theAnswerFromChatPGT);
                                                                if (rateSimilarChatGPT === -1) {
                                                                    rateSimilarChatGPT = 'ERROR!';
                                                                }
                                                                else {
                                                                    rateSimilarChatGPT = parseFloat(rateSimilarChatGPT);
                                                                }
                                                                //console.log('Back');
                                                                // childObj.rateSimilarByChatGPT = rateSimilar;
                                                                // childObj.theAnswerFromChatPGT = theAnswerFromChatPGT;
                                                                //console.log(childObj.rateSimilarByChatGPT);
                                                                //obj.push(childObj);
                                                                objChatGPT.rateSimilar = rateSimilarChatGPT;

                                                            } catch (error) {
                                                                console.error(error);
                                                                continue;
                                                            }
                                                        }
                                                        else if (theMethod === 3) {
                                                            try {
                                                                //3.SO SÁNH BẰNG DOLOS

                                                                //lấy kết quả so sánh từ Dolos trong wsl
                                                                let theAnswerFromDolos = await executeDolos(pathRootFileUbt, pathCompFileUbt);
                                                                //console.log('Gọi Dolos:',theAnswerFromDolos);
                                                                if (theAnswerFromDolos.length > 0) {
                                                                    let rateDolos = callDolos.getRateSimilarDolos(theAnswerFromDolos, contentRootFile, contentCompFile);
                                                                    let a = rateDolos.rateSimilarRootFile;
                                                                    let b = rateDolos.rateSimilarCompFile;
                                                                    objDolos.rateSimilar = (a > b) ? a : b;
                                                                    let contentSimilarDolos = callDolos.makeContenSimilarDolos(theAnswerFromDolos);
                                                                    let contentSimilarDolosRootFile = contentSimilarDolos[0];
                                                                    let contentSimilarDolosCompFile = contentSimilarDolos[1];
                                                                    objDolos.contentSimilarFile1 = contentSimilarDolosRootFile;
                                                                    objDolos.contentSimilarFile2 = contentSimilarDolosCompFile;
                                                                } else {
                                                                    objDolos.rateSimilar = 0;
                                                                }

                                                            } catch (error) {
                                                                console.error(error);
                                                                continue;
                                                            }
                                                        }
                                                    }

                                                    mang.push(objDiff);
                                                    mang.push(objChatGPT);
                                                    mang.push(objDolos);

                                                    if (objDiff.rateSimilar > 0 || objChatGPT.rateSimilar > 0 || objDolos.rateSimilar > 0) {
                                                        //console.log(util.inspect(mang, {depth: null, colors: true}));

                                                        //đưa dữ liệu vào 1 file .JSON
                                                        // Replacer function to handle "skills" array
                                                        function replacer(key, value) {
                                                            if (key === "contentSimilarFile1" || key === "contentSimilarFile2") {
                                                                return JSON.stringify(value);
                                                            }
                                                            return value;
                                                        }

                                                        let arrJSON = JSON.stringify(mang, replacer, 2);
                                                        arrJSON = arrJSON.replace(/"\[(.*?)\]"/, "[$1]");

                                                        let nameJSONFile = 'resultCompare_' + nameRootFile + '_vs_' + nameCompFile + '.json';
                                                        let pathResultFolder = directoryAddress.pathFolderSaveCheckResultWindow;
                                                        let pathJSONFile = path.join(pathResultFolder, nameJSONFile);
                                                        //Lưu kết quả so sánh vào thư mục máy tính
                                                        fs.writeFileSync(pathJSONFile, arrJSON);
                                                        //Lưu kết quả so sánh lên cơ sở dữ liệu
                                                        let uuid1 = nameRootFile.replace(/\.(cpp|c)$/, '');
                                                        let uuid2 = nameCompFile.replace(/\.(cpp|c)$/, '');
                                                        changeNull.add_check_sub(uuid1, uuid2, arrJSON, quesion_ID); 
                                                        



                                                    }
                                                    //lưu kq sao sánh vào cơ sở dữ liệu
                                                }
                                            }

                                        } catch (error) {
                                            console.error(error);
                                            continue;
                                        }

                                    }

                                    //Nếu không có file nào tương đương để so sánh
                                    if (checkComp === false) {
                                        //obj.push('NO SIMILAR FILE WAS FOUND!');
                                    }

                                    //đưa dữ liệu vào 1 file .JSON
                                    // let arrJSON = JSON.stringify(obj, null, 2);
                                    // let nameJSONFile = 'checked_' + nameRootFile + '/' + nameCompFile + '.json';
                                    // let pathResultFolder = directoryAddress.pathFolderSaveCheckResultWindow;
                                    // let pathJSONFile = path.join(pathResultFolder, nameJSONFile);
                                    // fs.writeFileSync(pathJSONFile, arrJSON);

                                    //thay đổi thuộc tính checked trong bảng submit thành khác NULL
                                    changeNull.changeNull(nameRootFile, 1);

                                } catch (error) {
                                    console.error(error);
                                    continue;
                                }


                            }
                        }
                    } catch (error) {
                        console.error(error);
                        continue;
                    }
                }
            } catch (error) {
                console.error(error);
                continue;
            }
        }

    } catch (error) {
        console.error(error);
    }
    let end = Date.now();
    console.log('Thời gian chạy:', (end - start), 'ms');
}

//main(2);




module.exports = main