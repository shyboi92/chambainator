const mysql2 = require('mysql2');

async function get_question_id(id){
    try{
        const connection = mysql2.createConnection({
            host: 'localhost',
            user: 'root',
            password: '1',
            database: 'sys'
        });

        let quesion_idArr = [];
        quesion_idArr = await new Promise((resolve, reject) => {
            connection.query('SELECT id FROM exam_cont WHERE exam_id = ?', [id], (err, results, fields) => {
                if(err){
                    console.error(err);
                    connection.end();
                    reject(err);
                }else{
                    if(results.length === 0){
                        connection.end();
                        results(null);
                    }else{
                        connection.end();
                        resolve(results.map(row => row.id));
                    }
                }
            });
        });
        return quesion_idArr;
    }catch(err){
        console.error(err);
        throw err;
    }
}


module.exports = {
    get_question_id
}