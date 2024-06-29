const fs = require('fs');
const path = require('path');
const directoryAddress = require('./directoryAddress');
const getFileNameExerciseArr = require('./getFileNameExerciseArr');
const callDiffUbuntu = require('./callDiffUbuntu');
const callChatGPT = require('./callChatGPT');
const processUbtResult = require('./processUbtResult');
const getFileProperties = require('./getFileProperties');
const makeResult = require('./makeResult');
const changeNull = require('./changeNull');
const demoGetFileNameExerciseArr = require('./demoGetFileNameExerciseArr');





async function main(){
    let start = Date.now();
    try {
        //truy cập vào database và lấy ra danh sách tên các bài submit sẽ so sánh
        let fileNameArr = await getFileNameExerciseArr.getFileNameExerciseArr(1);
        console.log(`VD: `, fileNameArr);
        console.log(typeof(fileNameArr));
        console.log(fileNameArr.length); 
        //console.log('__________________');
        fileNameArr = await demoGetFileNameExerciseArr.demoGetFileNameExerciseArr(directoryAddress.pathFolderSaveAssignmentsWindow);
        //console.log(`VD: `, fileNameArr);
        //console.log(typeof(fileNameArr));

        //Nếu chỉ lấy ra đc có 1 bài
        if(fileNameArr.length === 1){
            
            let childObj = 'JUST ONE ASSIGNMENT!';
            let obj = [];
            obj.push(childObj);
            let arrJSON = JSON.stringify(obj, null, 2);
            let nameJSONFile = 'checked_CaseDIFF_' + fileNameArr[0] + '.json';
            let pathResultFolder = directoryAddress.pathFolderSaveCheckResultWindow;
            let pathJSONFile = path.join(pathResultFolder, nameJSONFile);

            fs.writeFileSync(pathJSONFile, arrJSON);
            console.log('Hoàn thành!');
            changeNull.changeNull(fileNameArr[0], 'DONE');
        }
        //Lấy ra được nhiều hơn 1 bài thì thực hiện so sánh
        else if(fileNameArr.length > 1){
            for(let i=0;i<fileNameArr.length;i++){
                // let filePath = directoryAddress.pathFolderSaveAssignmentsWindow + VDuuidArr[i];
                // console.log('File Path: ', filePath);
                // let fileSize = await getFileProperties.getFileSize(filePath);
                // let fileLine = await getFileProperties.getFileTotalLines(filePath);
                // console.log('Name: ', VDuuidArr[i], ' - Size: ', fileSize, ' - Line: ', fileLine);

                console.log('#######################: ', fileNameArr[i]);

                let nameRootFile = fileNameArr[i];
                let pathRootFileWin = directoryAddress.pathFolderSaveAssignmentsWindow + fileNameArr[i];
                let pathRootFileUbt = directoryAddress.pathFolderSaveAssignmentsUbuntu + fileNameArr[i];
                let contentRootFile = await getFileProperties.getFileData(pathRootFileWin);
                let sizeRootFile = await getFileProperties.getFileSize(pathRootFileWin);
                let lineRootFile = await getFileProperties.getFileTotalLines(pathRootFileWin);
                // let obj = {
                //     DiffUbt: [],
                //     ChatGPT: []
                // };
                let obj = [];
                obj.push(nameRootFile);
                let checkComp = false;

                for(let j=0;j<fileNameArr.length;j++) {
                    
                    if(j !== i) {
                        //console.log(j);
                        let nameCompFile = fileNameArr[j];
                        let pathCompFileWin = directoryAddress.pathFolderSaveAssignmentsWindow + fileNameArr[j];
                        let sizeCompFile = await getFileProperties.getFileSize(pathCompFileWin);

                        //kiểm tra kích thước 2 bài code xấp xỉ nhau
                        if( (sizeRootFile/sizeCompFile) < 1.25 && (sizeRootFile/sizeCompFile) > 0.75 ) {
                            checkComp = true;
                            console.log('       - ', nameRootFile, 'so sánh', nameCompFile,'');
                            let contentCompFile = await getFileProperties.getFileData(pathCompFileWin);
                            let lineCompFile = await getFileProperties.getFileTotalLines(pathCompFileWin);
                            let pathCompFileUbt = directoryAddress.pathFolderSaveAssignmentsUbuntu + fileNameArr[j];
                            
                            let childObj = {};
                            
                            
                            //SO SÁNH BẰNG DIFF UBUNTU
                            //đưa vào Ubuntu để so sánh
                            let answerUbuntu = await callDiffUbuntu.callDiffUbuntu(pathRootFileUbt, pathCompFileUbt);
                            //console.log(nameRootFile,'-',nameCompFile,'answerUbt:', answerUbuntu);
                            

                            //xử lý lại kết quả ss từ Ubuntu
                            //Nếu kết quả từ Ubuntu là rỗng => hai bài giống hệt nhau, ko có điểm khác
                            if(answerUbuntu === '') {
                                //console.log('Giống hệt');
                                childObj.nameCompFile = nameCompFile;
                                childObj.rateSimilarRootFile = 100;
                                childObj.contentSimilarRootFile = 'COPY TOGETHER!';
                                
                            } 
                            else {
                                //console.log('Không giống hệt');
                                let objProcessUbtResult = processUbtResult.makeResult(answerUbuntu, lineRootFile, lineCompFile);
                                //console.log(objProcessUbtResult);
                                
                                //tạo đối tượng con (từng file compare)
                                childObj.nameCompFile = nameCompFile;
                                childObj.rateSimilarRootFile = objProcessUbtResult.rateSimilarFileRoot;
                                childObj.contentSimilarRootFile = objProcessUbtResult.stringResultFileRoot;
                                childObj.contentSimilarCompFile = objProcessUbtResult.stringResultFileCompare;
                            }

                            //SO SÁNH BẰNG CHATGPT
                            let theQuestionForChatGPT = callChatGPT.makeTheQuestionForChatGPT(contentRootFile, contentCompFile);
                            let theAnswerFromChatPGT = await callChatGPT.callChatGPT(theQuestionForChatGPT);
                            //console.log('Front');
                            //console.log(theAnswerFromChatPGT);
                            let rateSimilar = callChatGPT.getTheRateSimilar(theAnswerFromChatPGT);
                            if(rateSimilar === -1){
                                rateSimilar = 'Error in the answer of ChatGPT!';
                            }
                            else {
                                rateSimilar = parseFloat(rateSimilar);
                            }
                            //console.log('Back');
                            childObj.rateSimilarByChatGPT = rateSimilar;
                            childObj.theAnswerFromChatPGT = theAnswerFromChatPGT;
                            //console.log(childObj.rateSimilarByChatGPT);
                        

                            obj.push(childObj);
                        }
                    }
                }

                //Nếu không có file nào tương đương để so sánh
                if(checkComp === false) {
                    obj.push('NO SIMILAR FILE WAS FOUND!');
                }

                //đưa dữ liệu vào 1 file .JSON
                let arrJSON = JSON.stringify(obj, null, 2);
                let nameJSONFile = 'checked_CaseDIFF_' + nameRootFile + '.json';
                let pathResultFolder = directoryAddress.pathFolderSaveCheckResultWindow;
                let pathJSONFile = path.join(pathResultFolder, nameJSONFile);
                
                //thay đổi thuộc tính checked trong bảng submit thành khác NULL
                fs.writeFileSync(pathJSONFile, arrJSON);
                console.log('Hoàn thành!');
                changeNull.changeNull(nameRootFile, 'DONE');
            }
        }

    } catch (error) {
        console.error(error);
    }
    let end = Date.now();
    console.log('Thời gian chạy:',(end-start),'ms');
}

main();





//hàm nhận địa chỉ các file code và trả về chuỗi tên các file code .cpp hoặc .c
