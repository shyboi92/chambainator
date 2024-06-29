const fs = require('fs');
const OpenAI = require('openai');



//hàm kết nối ChatGPT, hỏi và nhận lại câu trả lời
const callChatGPT = async (theQuestion) => {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_KEY
    })
    try {
        const chatCompletion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ "role": "user", "content": theQuestion}],
            max_tokens: 15
        });

        const theResultOfChatGPT = chatCompletion.choices[0].message.content;
        return theResultOfChatGPT;
    } catch (error) {
        console.error('Lỗi khi gọi ChatGPT:', error);
        throw error;
    }
}



//hàm trả về dữ liệu file code




//hàm nhận nội dung 2 file và tạo ra câu hỏi ChatGPT
function makeTheQuestionForChatGPT(contentRootFile, contentCompFile){
    let theQuestion = `What is the percentage of similarity of the following 2 codes? Show only conclusion and don't include any explanation.\n`
                    + `Code 1:\n"`
                    + contentRootFile + `".\n`
                    + `Code 2:\n"`
                    + contentCompFile + `".`;
    return theQuestion;
}



//hàm phân tích câu trả lời của ChatGPT và lấy ra con số tỷ lệ giống
function getTheRateSimilar(theAnswerFromChatPGT){
    const targetChar = '%';
    let rateSimilarFromChatGPT = '';
    for(let i=0; i<theAnswerFromChatPGT.length; i++){
        let currentChar = theAnswerFromChatPGT[i];
        if(currentChar === targetChar){
            let x = i-1;
            while(x > -1 && theAnswerFromChatPGT[x]!==' '){
                rateSimilarFromChatGPT = theAnswerFromChatPGT[x] + rateSimilarFromChatGPT;
                x--;
            }
            //rateSimilarFromChatGPT = theAnswerFromChatPGT[i-3] + theAnswerFromChatPGT[i-2] + theAnswerFromChatPGT[i-1];
            return rateSimilarFromChatGPT;
        }
    }
    if( rateSimilarFromChatGPT === ''){
        return -1;
    }
}

//demo();

module.exports = {
    callChatGPT: callChatGPT,
    makeTheQuestionForChatGPT: makeTheQuestionForChatGPT,
    getTheRateSimilar: getTheRateSimilar,
}