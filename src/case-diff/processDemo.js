const fs = require('fs');
const directoryAddress = require('./directoryAddress');
const getFileProperties = require('./getFileProperties');
const callDiffUbuntu = require('./callDiffUbuntu');
const { dir } = require('console');
const { mainModule } = require('process');
const processUbtResult = require('./processUbtResult');
const { get } = require('http');
const { type } = require('os');

const bai4 = directoryAddress.pathFolderSaveAssignmentsUbuntu + 'bai4.cpp';
const bai44 = directoryAddress.pathFolderSaveAssignmentsUbuntu + 'bai3.cpp';
const bai4Win = directoryAddress.pathFolderSaveAssignmentsWindow + 'bai4.cpp';
const bai44Win = directoryAddress.pathFolderSaveAssignmentsWindow + 'bai3.cpp';
const ansUbt = `7,9c7
< float cal_delta(float a, float b, float c){
<     return b*b-4*a*c;
< }
---
> float cal_delta(float a, float b, float c);
11,19c9
< void cal_equation(){    
<     if(del<0) cout<<"   - PT vo nghiem!"<<endl;
<     else if(del==0) {
<         cout<<"   - PT co nghiem don: x="<< (-b)/(2*a)<<endl;
<     }
<     else {
<         cout<<"   - PT co nghiem kep: x1="<< (-b+sqrt(del))/(2*a)<<" ; x2="<< (-b-sqrt(del))/(2*a)<<endl;
<     }
< }
---
> void cal_equation();
32a23,36
> }
> 
> float cal_delta(float a, float b, float c){
>     return b*b-4*a*c;
> }
> 
> void cal_equation(){    
>     if(del<0) cout<<"   - PT vo nghiem!"<<endl;
>     else if(del==0) {
>         cout<<"   - PT co nghiem don: x="<< (-b)/(2*a)<<endl;
>     }
>     else {
>         cout<<"   - PT co nghiem kep: x1="<< (-b+sqrt(del))/(2*a)<<" ; x2="<< (-b-sqrt(del))/(2*a)<<endl;
>     }`;

//lấy nội dung bài code chia thành từng dòng
function chiaDong(noiDungCode) {
	const codeLineArr = noiDungCode.split('\n');
	return codeLineArr;
}

//loại bỏ comment trong code
function loaiBoComment(codeLine) {
	return codeLine.map(line => line.replace(/\/\/.*/, ''));
}
//loại bỏ các dòng trống không
function loaiBoTrong(codeLine) {
	return codeLine.filter(line => line.trim() !== '');
}
//loại bỏ các dấu cách
function loaiDauCach(codeLine) {
	return codeLine.map(line => line.replace(/\s+/g, ''));
}

//ghép lại thành 1 string duy nhất
function ghepDong(codeLine) {
	return codeLine.join('\n');
}

let VD = `#include <iostream> //đây là thư viện khởi tạo
using namespace std; //sử dụng khoảng trống std

//đây là hàm main của ctr
int      main() {      
	int     a    , b   ,     c     ;  //khai báo các biến kiểu int
	cin>> a    >>   b;  //gán giá trị cho a, b
	c = a + b     ;   //tính c
	cout   <<"a     + b = "<<c    <<endl;  //in ra kết quả
	return     0;
	  }`


//tổng hợp các bước biến đổi
function all(theData) {
	let duLieu = chiaDong(theData);
	duLieu = loaiBoComment(duLieu);
	duLieu = loaiBoTrong(duLieu);
	duLieu = loaiDauCach(duLieu);
	//duLieu = ghepDong(duLieu);
	return duLieu;
}

//so sánh 2 chuỗi string
function soSanh(lineA, lineB) {
	if (lineA.length !== lineB.length) {
		return false;
	}
	else {
		for (let i = 0; i < lineA.length; i++) {
			if (lineA[i] !== lineB[i]) {
				return false;
			}
		}
	}
	return true;
}


//

async function demo() {
	try {
		let noiDungcode1 = await getFileProperties.getFileData(bai4Win);
		let noiDungcode2 = await getFileProperties.getFileData(bai44Win);

		noiDungcode1 = all(noiDungcode1);
		//console.log('Code1: ',noiDungcode1);
		noiDungcode2 = all(noiDungcode2);
		//console.log('Code2: ',noiDungcode2);

		let soDongCode1 = noiDungcode1.length; console.log(soDongCode1);
		let soDongCode2 = noiDungcode2.length; console.log(soDongCode2);

		let soDongGiongCode1 = 0;
		let soDongGiongCode2 = 0;
		let mangDongCode1 = new Array(soDongCode1).fill(false);
		let mangDongCode2 = new Array(soDongCode2).fill(false);

		for (let i = 0; i < soDongCode1; i++) {
			for (let y = 0; y < soDongCode2; y++) {
				if (noiDungcode1[i] === noiDungcode2[y]) {
					mangDongCode1[i] = true;
					mangDongCode2[y] = true;
				}
			}
		}

		for (let i = 0; i < soDongCode1; i++) {
			if (mangDongCode1[i] === true) soDongGiongCode1++;
		}
		for (let y = 0; y < soDongCode2; y++) {
			if (mangDongCode2[y] === true) soDongGiongCode2++;
		}

		console.log('Số dòng code 1 giống: ', soDongGiongCode1);
		console.log('Số dòng code 2 giống: ', soDongGiongCode2);

		const x1 = 'PTconghiemdon';
		const x2 = 'PTconghiemdon';

		let bien1 = 5;
		let bien2 = 55;
		let bien3 = bien1 - bien2;
		console.log(bien3);
	} catch (error) {
		console.error(error);
	}
}

demo();



