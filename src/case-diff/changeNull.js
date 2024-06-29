const mysql2 = require('mysql2');



//hàm thay đổi checked thành khác null
function changeNull(dataUUID, newData) {

    const connection = mysql2.createConnection({
        host: 'localhost',
        user: 'root',
        password: '1',
        database: 'sys'
    });

    connection.query('UPDATE submit SET checked = ? WHERE uuid = ?',
                [newData, dataUUID],
                (err, results) => {
        if(err) {
            console.error(err);
            connection.end();
            return;
        }
        //console.log(`CÓ ${results.affectedRows} BẢN GHI ĐC UPDATE checked.`);
    }); 
    connection.end();
}


//tải kết quả lên database
function add_check_sub(uuid1, uuid2, content, question_id){

    const connection = mysql2.createConnection({
        host: 'localhost',
        user: 'root',
        password: '1',
        database: 'sys'
    });

    const query = 'INSERT INTO check_sub (sub_id1, sub_id2, result, question_id) VALUES (?, ?, ?, ?)';
    connection.query(query, [uuid1, uuid2, content, question_id], (err, results) => {
        if(err) {
            console.error(err);
            console.log('Lỗi không thể thêm check_sub!');
        } else {
            console.log('Đã thêm bài check_sub!');
        }
    });

    connection.end();

}




module.exports = {
    changeNull,
    add_check_sub,
}