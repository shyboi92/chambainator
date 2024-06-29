const { error } = require('console');
const { stdout, stderr, stdin } = require('process');


const baiRoot = '/mnt/c/Users/thaim/OneDrive/Do_an_tot_nghiep_ET4900/ExampleTest/bai1.txt';
const baiComp = '/mnt/c/Users/thaim/OneDrive/Do_an_tot_nghiep_ET4900/ExampleTest/bai2.txt';

async function callDiff (pathFileCodeRoot, pathFileCodeCompare) {
    const {exec} = require('child_process');
    const command = `diff -iwB ${pathFileCodeRoot} ${pathFileCodeCompare}`;
  
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
          if (stderr) {
            console.log('Lỗi khi gọi diff: ', stderr);
            reject(stderr);
          }
          if (stdout.trim() === '') {
            //resolve('COPY TOGETHER!');
            resolve(stdout);
          } else {
            //console.log('Kết quả trong hàm gọi: ', stdout);
            resolve(stdout);
          }
        });
      });
}

async function main() {
    let ketQua = 'Trống';
    try {
        ketQua = await callDiff(baiRoot, baiComp);
        if(ketQua === ''){
          ketQua = null;
          console.log('Ngoài hàm:\n',ketQua);
        }else {
          console.log('Ngoài hàm:\n',ketQua);
        }
    }
    catch (err) {
        console.log('Lỗi 3: ', err.message);
    }
}

main();

module.exports = {
    callDiff
}




