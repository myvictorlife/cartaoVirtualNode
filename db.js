var mysql = require('mysql');

exports.getConnection = function BD() {
    var connection = mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'admin',
      database: 'cartao_virtual',
      port: 3306
   });

    return connection;
}