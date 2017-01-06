var express = require('express');
var app = express();

var bodyParser = require('body-parser');

var mysql = require('mysql');

var jwt = require('jsonwebtoken')

var db = require('./db.js');

app.set('superSecret', 'itsasecret') // Variável secret


app.use(bodyParser.json());

app.use(bodyParser.urlencoded({
   extended: true
}));

function BD() {

    var connection = db.getConnection();

    connection.connect(function(error){
      if(error)
         throw error;
    });
  return connection;
}

// middleware para validar o Token
/*app.use((req, res, next) => {
  // Aqui vamos verificar o header da requisição, os parametros e o corpo da requisição, procurando o token
  var token = req.body.token || req.query.token || req.headers['x-access-token']

  // Se o token existir
  if (token) {
    // Verificamos se o token está batendo com a nossa Secret
    jwt.verify(token, app.get('superSecret'), (err, decoded) => {
      if (err) {
        return res.json({
          success: false,
          message: 'A autenticação com o token falhou.'
        })
      } else {
        // Se o token estiver válido, então salvamos ele e liberamos o acesso, fazemos o trabalho do porteiro de um prédio aqui.
        req.decoded = decoded
        next()
      }
    })
  } else {
    // Se quem requisitou não informou o token, devolvemos um erro para ele.
    return res.status(403).send({
      success: false,
      message: 'Nenhum token foi informado.'
    })
  }
})*/

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

// Tags

app.get('/tags', function(req, res){

      var objBD = BD();
      objBD.query('SELECT * FROM cartao_virtual.Tag', function(err, rows) {
        if (err)
          res.json(error);
        else
          res.json(rows);
      });
});


app.get('/tags/:id', function(req, res){
   
   var objBD = BD();
   var id = req.param('id');

   objBD.query('SELECT * FROM cartao_virtual.Tag WHERE id = ?', id, function(error, user) {
        if (error) {
            res.json(error);
        } else {
            res.json(user);    
        }
    });

});


app.post('/tags', function(req, res){

   var objBD = BD();
   var post = {
        name: req.body.name
    };

    objBD.query('INSERT INTO cartao_virtual.Tag SET ?', post, function(error) {
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


app.post('/authenticate', function(req, res){

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
	        	if(user[0]){
                // Se não tiver nenhum erro, então criamos o Token para ele
                console.log(user[0]);
                var token = jwt.sign(user[0], app.get('superSecret'), {
                  expiresIn: '1440m'
                }); // Aqui dizemos que o Token expira em 1440 minutos (24 hrs)

                // Retornamos um json dizendo que deu certo junto com o seu Token
                res.json({
                  success: true,
                  message: 'Aproveite seu token!',
                  token: token
                });
            } else{
	            	res.json({
                          success: false,
                          message: 'A autenticação falhou, o usuário não foi encontrado :C'
                        }); 
              }   
              
	        }
	    });  
	}
	
});


var port = process.env.PORT || 8080;
app.listen(port, function(){
	console.log('Listening on ' + port);
});