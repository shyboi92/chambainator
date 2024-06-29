const directoryAddress = require('./directoryAddress');

const example = `5,13c5
< int main(){
<     float a, b, c;
<     cout<<"Giai PT mot an bac hai: a.x^2 + b.x + c = 0 "<<endl;
<     cout<<" - Nhap gia tri a: ";
<     cin>>a;
<     cout<<" - Nhap gia tri b: ";
<     cin>>b;
<     cout<<" - Nhap gia tri c: ";
<     cin>>c;
---
> float a, b, c, x, x1, x2, del;
15,22c7,14
<     float delta = b*b-4*a*c;
<     cout<<"Ket qua: "<<endl;
<         cout<<"<PT vo nghiem!>"<<endl;
<     else if(delta==0){
<         float x = (-b)/(2*a);
<         cout<<"<PT có nghiem don: x1 = x2 = "<<x<<endl;
---
> float cal_delta(float a, float b, float c){
>     return b*b-4*a*c;
> }
>
> void cal_equation(){
>     if(del<0) cout<<"   - PT vo nghiem!"<<endl;
>     else if(del==0) {
>         cout<<"   - PT co nghiem don: x="<< (-b)/(2*a)<<endl;        
25,29c17
<         float x1 = (-b + sqrt(delta))/(2*a);
<         float x2 = (-b - sqrt(delta))/(2*a);
<         cout<<"<PT co nghiem kep>"<<endl;
<         cout<<" - x1 = "<<x1<<endl;
<         cout<<" - x2 = "<<x2<<endl;
---
>         cout<<"   - PT co nghiem kep: x1="<< (-b+sqrt(del))/(2*a)<<" 
; x2="<< (-b-sqrt(del))/(2*a)<<endl;                                   ; x2="<< (-b-sqrt(del))
30a19,31
> }
>
> int main(){
>     cout<<"Chuong trinh giai he PT mot nghiem bac 2."<<endl;
>     cout<<"   - Nhap gai tri a: ";
>     cin>>a;
>     cout<<"   - Nhap gia tri b: ";
>     cin>>b;
>     cout<<"   - Nhap gia tri c: ";
>     cin>>c;
>     del = cal_delta(a, b, c);
>     cal_equation();
>`;

const lengthCode1 = 32;
const lengthCode2 = 33;




//hàm kiểm tra xem có phải ký tự đầu dòng không
function checkFirstLineChar(theAnswer, n){
    if(n===0) return true;
    else {
        const previousChar = theAnswer[n-1];
        const currentChar = theAnswer[n];
        if(previousChar === '\n' && currentChar !== '\n') return true;
        else return false;
    }
}





//hàm kiểm tra đây phải ký tự số không
function checkCharNum(theAnswer, n){
    if(
        theAnswer[n] === '0' ||
        theAnswer[n] === '1' ||
        theAnswer[n] === '2' ||
        theAnswer[n] === '3' ||
        theAnswer[n] === '4' ||
        theAnswer[n] === '5' ||
        theAnswer[n] === '6' ||
        theAnswer[n] === '7' ||
        theAnswer[n] === '8' ||
        theAnswer[n] === '9' ) 
    {
            return true;
    }
    return false;
}




//hàm chuyễn chuỗi string số thành số
function findRealNumber(theAnswer, n){  
    let numNum = new Array(5);
    let countNum = 0;
    while (checkCharNum(theAnswer, n)) {   
        numNum[countNum] = parseInt( theAnswer.charAt(n) ); 
        countNum++;
        n++;
    }
    let realValue = 0;
    for (let i=0; i < countNum;i++) {
        realValue = realValue*10+numNum[i];
    }
    return realValue;
}




//hàm đếm xem dãy ký tự số có bao nhiêu chữ số
function findRealStep(theAnswer, n){
    let countNum = 0;
    while(checkCharNum(theAnswer, n)){
        countNum++;
        n++;
    }
    return countNum;
}




//hàm tạo kết quả so sánh thành chuỗi string
function makeStringResult(lineCode) {
    //console.log('HIHI', lineCode.length);
    let chuoiString = '';    //kiểu string
    let chuoiNumber = [];
    let dau = cuoi = 1;
    while(dau <= (lineCode.length - 1)){
        if(lineCode[dau] === true){
            for(let i=dau+1;i<=(lineCode.length-1);i++) {
                if(lineCode[i] === false) {
                    cuoi = i - 1;
                    break;
                } 
                else {
                    cuoi = i;
                }
            }
            if(dau === cuoi) {
                chuoiString += ` - The line ${dau}.\n`;  
                let areaNumber = [dau, dau];
                chuoiNumber.push(areaNumber);
                dau = cuoi + 2;
                cuoi = dau;
            }
            else if(dau < cuoi) {
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
    //console.log('HAHA', chuoiString);
    return chuoiNumber;  //trả về kiểu mảng số dòng
    //return chuoiString; //trả về kiểu chữ viết chỉ số dòng
}




//hàm tạo kết quả
function makeResult(theAnswer, lengthCode1, lengthCode2){
    let lineCode1 = new Array(lengthCode1+1).fill(true);
    let lineCode2 = new Array(lengthCode2+1).fill(true);
    let numSimilarLine1 = 0;
    let numSimilarLine2 = 0;
    let numDiffLine1 = 0;
    let numDiffLine2 = 0;
    let rateSimilarCode1 = 0;
    let rateSimilarCode2 = 0; 

    for(let i=0;i<theAnswer.length;i++){
        
        if(checkFirstLineChar(theAnswer, i) && checkCharNum(theAnswer, i)){
            let strFile1;
            let endFile1;
            let strFile2;
            let endFile2;
            let typeDiff;
            let currentChar = i;
            let step = 1;

            strFile1 = findRealNumber(theAnswer, currentChar );
            step = findRealStep(theAnswer, currentChar);
            currentChar = currentChar + step;
            step = 1;

            if(theAnswer[currentChar] === ','){
                currentChar = currentChar + step;
                endFile1 = findRealNumber(theAnswer, currentChar);
                step = findRealStep(theAnswer, currentChar);
                currentChar = currentChar + step;
                step = 1;
            }
            else {
                endFile1 = strFile1;
            }
            typeDiff = theAnswer[currentChar];
            currentChar = currentChar + step;
            strFile2 = findRealNumber(theAnswer, currentChar);
            step = findRealStep(theAnswer, currentChar);
            currentChar = currentChar + step;
            step = 1;
            if(theAnswer[currentChar] === ','){
                currentChar = currentChar + step;
                endFile2 = findRealNumber(theAnswer, currentChar);
                step = findRealStep(theAnswer, currentChar);
                currentChar = currentChar + step;
                step = 1;
            }
            else {
                endFile2 = strFile2;
            }
            //console.log(`(${strFile1}-${endFile1})-${typeDiff}-(${strFile2}-${endFile2})`);
            if(typeDiff === 'c'){
                for(let x=strFile1;x<=endFile1;x++) {
                    lineCode1[x]=false;
                }
                for(let x=strFile2;x<=endFile2;x++) {
                    lineCode2[x]=false;
                }
            }
            else if(typeDiff === 'a'){
                for(let x=strFile2;x<=endFile2;x++) {
                    lineCode2[x]=false;
                }
            }
            else if(typeDiff === 'd'){
                for(let x=strFile1;x<=endFile1;x++) {
                    lineCode1[x]=false;
                }
            }
        }
    }
    for(let a=1;a<=lengthCode1;a++){
        if(lineCode1[a] === true) numSimilarLine1++;
        if(lineCode1[a] === false) numDiffLine1++;
    }
    for(let a=1;a<=lengthCode2;a++){
        if(lineCode2[a] === true) numSimilarLine2++;
        if(lineCode2[a] === false) numDiffLine2++;
    }
    rateSimilarCode1 = Number(((numSimilarLine1 / (lengthCode1-1)) * 100).toFixed(2));
    rateSimilarCode2 = Number(((numSimilarLine2 / (lengthCode2-1)) * 100).toFixed(2));
    //console.log(` Tỷ lệ code1 = ${rateSimilarCode1}`);
    //console.log(` Tỷ lệ code2 = ${rateSimilarCode2}`);
    //console.log(lengthCode1, " - ", numDiffLine1, " - ", numSimilarLine1);
    //console.log(lengthCode2, " - ", numDiffLine2, " - ", numSimilarLine2);

    let resultCode1 = makeStringResult(lineCode1);
    let resultCode2 = makeStringResult(lineCode2);
    //console.log('Kết quả code1:\n',resultCode1);
    //console.log('Kết quả code2:\n', resultCode2);

    let childObj = {
        rateSimilarFileRoot: rateSimilarCode1,
        rateSimilarFileComp: rateSimilarCode2,
        stringResultFileRoot: resultCode1,
        stringResultFileComp: resultCode2  
    }
    //console.log(childObj);
    return childObj;
}




//makeResult(example, lengthCode1, lengthCode2);





module.exports = {
    checkFirstLineChar: checkFirstLineChar,
    checkCharNum: checkCharNum,
    findRealNumber: findRealNumber,
    findRealStep: findRealStep,
    makeStringResult: makeStringResult,
    makeResult: makeResult
}




