var express = require('express');

var app = express();

var bodyParser = require('body-parser');

var mysql = require('mysql');

var db = require('./db.js');

function BD() {

    var connection = db.getConnection();

    connection.connect(function(error){
      if(error)
         throw error;
    });
	return connection;
}


app.listen(8080);

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({
   extended: true
}));

app.get('/', function(req, res){

   res.end('Servidor ON!');
});

app.get('/users', function(req, res){
   
   	var objBD = BD();
	objBD.query('SELECT * FROM cartao_virtual.User', function(err, rows) {
        if (err)
        	res.json(error);
        else
        	res.json(rows);
    });

});

app.get('/users/:id', function(req, res){
   
   var objBD = BD();
   var id = req.param('id');

   objBD.query('SELECT * FROM cartao_virtual.User WHERE id = ?', id, function(error, user) {
        if (error) {
            res.json(error);
        } else {
            res.json(user);    
        }
    });

});

app.post('/users', function(req, res){

   var objBD = BD();
   var post = {
        name: req.body.name,
        post: req.body.post,
        phone: req.body.phone,
        email: req.body.email,
        business: req.body.business,
        username: req.body.username,
        password: req.body.password
    };

    objBD.query('INSERT INTO cartao_virtual.User SET ?', post, function(error) {
        if (error) {
            console.log(error);
            res.json(error);
        } else {
            res.json('Sucess');    
        }
    });

});

app.delete('/users/:id', function(req, res){
   res.end('Servidor ON! delete');
});


app.post('/login', function(req, res){

	var username = req.body.username;
	var password = req.body.password;

	if(!username){
		res.json('Usuario deve ser inserido');
	}
	if(!password){
		res.json('Password deve ser inserido');
	}

	if(username || password){

		var objBD = BD();
	 

	    objBD.query('SELECT * FROM cartao_virtual.User WHERE username = ? and password = ?', [username, password], function(error, user) {
	        if (error) {
	            res.json(error);
	        } else {
	        	if(user[0])
	            	res.json(user);
	            else
	            	res.json({error: "Usuario ou Senha incorreto."});    
	        }
	    });  
	}

	//SELECT * FROM cartao_virtual.User WHERE username = 'victor' and password = '123456';
	
});