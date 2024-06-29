const mysql2 = require('mysql2');



//hàm truy vấn cơ sở dữ liệu và lấy ra các uuid cần check
/*Điều kiện:
    - Với mỗi 1 question_id (mã của bài tập) truyền vào.
    - Với mỗi 1 student_id(mã SV) thì chỉ lấy bài có date_time cuối cùng
    và checked = null.
*/
async function getFileNameExerciseArrDEMO(question_id) {
    try {
        const connection = mysql2.createConnection({
            host: 'localhost',
            user: 'root',
            password: '1',
            database: 'sys'
        });
  
        let uuidArr = [];
        uuidArr = await new Promise((resolve, reject) => {
            connection.query(
                `
                SELECT s.uuid 
                FROM submit s
                INNER JOIN (
                    SELECT student_id, MAX(date_time) AS max_date_time
                    FROM submit
                    WHERE question_id = ? AND checked IS NULL
                    GROUP BY student_id
                ) latest
                ON s.student_id = latest.student_id
                AND s.date_time = latest.max_date_time
                WHERE s.question_id = ?
                AND s.checked IS NULL
                `, [question_id, question_id], (err, results, fields) => {
                if (err) {
                    console.error(err);
                    connection.end();
                    reject(err);
                } else {
                    //const uuidArr = results.length === 0 ? 'NO SUBMISSIONS FOUND!' : results.map(row => row.uuid);
                    // if(results.length === 0) {
                    //     connection.end();
                    //     resolve(null);
                    // }
                    // else {
                    //     connection.end();
                    //     //console.log('results(trong): ', results);
                    //     resolve(results.map(row => row.uuid));
                    // }
                    connection.end();
                    resolve(results.map(row => row.uuid));
                    //resolve(results);
                }
            });
        });
        

        if(uuidArr === null) {
            //console.log(`uuidArr WITH quesion_id = ${question_id}:\n`,  `   NO SUBMISSIONS FOUND WITH question_id = ${question_id}!`);
        }
        else {
            //console.log(`uuidArr WITH quesion_id = ${question_id}:\n`, uuidArr);
            //console.log(typeof(uuidArr));
        }
        return uuidArr;
    } catch (err) {
        console.error(err);
        throw err;
    }
}


async function getFileNameExerciseCppArr(question_id) {
    try {
        const connection = mysql2.createConnection({
            host: 'localhost',
            user: 'root',
            password: '1',
            database: 'sys'
        });
  
        let uuidArr = [];
        uuidArr = await new Promise((resolve, reject) => {
            connection.query(
                `
                SELECT s.uuid 
                FROM submit s
                INNER JOIN (
                    SELECT student_id, MAX(date_time) AS max_date_time
                    FROM submit
                    WHERE question_id = ? AND checked IS NULL AND theLanguage = 'C++'
                    GROUP BY student_id
                ) latest
                ON s.student_id = latest.student_id
                AND s.date_time = latest.max_date_time
                WHERE s.question_id = ?
                AND s.checked IS NULL
                AND s.theLanguage = 'C++'
                `, [question_id, question_id], (err, results, fields) => {
                if (err) {
                    console.error(err);
                    connection.end();
                    reject(err);
                } else {
                    //const uuidArr = results.length === 0 ? 'NO SUBMISSIONS FOUND!' : results.map(row => row.uuid);
                    // if(results.length === 0) {
                    //     connection.end();
                    //     resolve(null);
                    // }
                    // else {
                    //     connection.end();
                    //     //console.log('results(trong): ', results);
                    //     resolve(results.map(row => row.uuid));
                    // }
                    connection.end();
                    resolve(results.map(row => row.uuid));
                }
            });
        });
        

        if(uuidArr === null) {
            //console.log(`uuidArr WITH quesion_id = ${question_id}:\n`,  `   NO SUBMISSIONS FOUND WITH question_id = ${question_id}!`);
        }
        else {
            //console.log(`uuidArr WITH quesion_id = ${question_id}:\n`, uuidArr);
            //console.log(typeof(uuidArr));
        }
        return uuidArr;
    } catch (err) {
        console.error(err);
        throw err;
    }
}


async function getFileNameExerciseCArr(question_id) {
    try {
        const connection = mysql2.createConnection({
            host: 'localhost',
            user: 'root',
            password: '1',
            database: 'sys'
        });
  
        let uuidArr = [];
        uuidArr = await new Promise((resolve, reject) => {
            connection.query(
                `
                SELECT s.uuid 
                FROM submit s
                INNER JOIN (
                    SELECT student_id, MAX(date_time) AS max_date_time
                    FROM submit
                    WHERE question_id = ? AND checked IS NULL AND theLanguage = 'C'
                    GROUP BY student_id
                ) latest
                ON s.student_id = latest.student_id
                AND s.date_time = latest.max_date_time
                WHERE s.question_id = ?
                AND s.checked IS NULL
                AND s.theLanguage = 'C'
                `, [question_id, question_id], (err, results, fields) => {
                if (err) {
                    console.error(err);
                    connection.end();
                    reject(err);
                } else {
                    //const uuidArr = results.length === 0 ? 'NO SUBMISSIONS FOUND!' : results.map(row => row.uuid);
                    // if(results.length === 0) {
                    //     connection.end();
                    //     resolve(null);
                    // }
                    // else {
                    //     connection.end();
                    //     //console.log('results(trong): ', results);
                    //     resolve(results.map(row => row.uuid));
                    // }
                    connection.end();
                    resolve(results.map(row => row.uuid));
                }
            });
        });
        

        if(uuidArr === null) {
            //console.log(`uuidArr WITH quesion_id = ${question_id}:\n`,  `   NO SUBMISSIONS FOUND WITH question_id = ${question_id}!`);
        }
        else {
            //console.log(`uuidArr WITH quesion_id = ${question_id}:\n`, uuidArr);
            //console.log(typeof(uuidArr));
        }
        return uuidArr;
    } catch (err) {
        console.error(err);
        throw err;
    }
}


//chạy thử hàm
async function demo(quesion_id){
    try {
        let bienDemo = [];
        bienDemo = await getFileNameExerciseArrDEMO(quesion_id);
        console.log('Kết quả Demo:',bienDemo);

        let bienCpp = "RỖNG";
        bienCpp = await getFileNameExerciseCppArr(quesion_id);
        console.log('Kết quả Cpp:\n',bienCpp);

        let bienC = "rỗng";
        bienC = await getFileNameExerciseCArr(quesion_id);
        console.log('Kết quả C:\n',bienC);

        console.log('Kết thúc');

    } catch (error) {
        console.error(error);
    }
}
//demo(1);



module.exports = {
    getFileNameExerciseCppArr,
    getFileNameExerciseCArr,
}