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
    console.log("Connectado");
  return connection;
}

app.get('/', function(req, res){

   res.end('Servidor ON!');
});

// route to authenticate a user (POST http://****:*****/api/authenticate)
app.post('/api/authenticate', function(req, res){

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
                var token = jwt.sign(user[0], app.get('superSecret'), {
                  expiresIn: '1440m'
                }); // Aqui dizemos que o Token expira em 1440 minutos (24 hrs)
                user[0].token = token;

                // Retornamos um json dizendo que deu certo junto com o seu Token
                res.json(user[0]);
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

// middleware para validar o Token
// app.use((req, res, next) => {
//   // Aqui vamos verificar o header da requisição, os parametros e o corpo da requisição, procurando o token
//   var token = req.body.token || req.query.token || req.headers['x-access-token']

//   // Se o token existir
//   if (token) {
//     // Verificamos se o token está batendo com a nossa Secret
//     jwt.verify(token, app.get('superSecret'), (err, decoded) => {
//       if (err) {
//         return res.json({
//           success: false,
//           message: 'A autenticação com o token falhou.'
//         })
//       } else {
//         // Se o token estiver válido, então salvamos ele e liberamos o acesso, fazemos o trabalho do porteiro de um prédio aqui.
//         req.decoded = decoded
//         next()
//       }
//     })
//   } else {
//     // Se quem requisitou não informou o token, devolvemos um erro para ele.
//     return res.status(403).send({
//       success: false,
//       message: 'Nenhum token foi informado.'
//     })
//   }
// });

// Uses
//***************************************************************************************************
app.get('/users', function(req, res){

    var objBD = BD();

     var jsonUser = {};
     console.log("/Users");
     objBD.query('SELECT * FROM cartao_virtual.User u, cartao_virtual.Card c where u.card_id = c.id', function(error, users) {
          if (error) {
              res.json(error);
          } else {
            jsonUser = users;
            res.json(jsonUser);
          }
      });
});


app.get('/users/:id', function(req, res){
   
   var objBD = BD();
   var id = req.param('id');
   
   objBD.query('SELECT * FROM cartao_virtual.User u, cartao_virtual.Card c where u.id = ? and u.card_id = c.id', id, function(error, user) {
        console.log(user[0].card_id);
        if (error) {
            res.json(error);
        } else {
            res.json(user);      
        }
    });

});


app.post('/users', function(req, res){

   var postUser = {
      username: req.body.username,
      password: req.body.password,
      create_date: new Date(),
      card_id: 0
    };
    
    var card = req.body.card;
    var postCard = {
      name: card.name,
      position: card.position,
      phone: card.phone,
      email: card.email,
      company: card.company,
      flag_private: 1,
      flag_updated: null,
      created_date: new Date(), 
      user_created: req.body.username,
      user_updated: null
    };

    var objBD = BD();
    objBD.beginTransaction(function(err) {
      if (err) { throw err; }
      objBD.query('INSERT INTO cartao_virtual.Card SET ?', postCard, function(err, result) {
        if (err) {
          return objBD.rollback(function() {
            console.log(err);
            res.json({error:'Erro ao tentar salvar o cartao!'});
          });
        }

        console.log('Post ' + result.insertId + ' added'); 

        postUser.card_id = result.insertId;

        objBD.query('INSERT INTO cartao_virtual.User SET ?', postUser, function(err, result) {

          if (err) {
            return objBD.rollback(function() {
              console.log(err);
              res.json({error:'Erro ao tentar inserir o usuario!'});
            });
          }  
          objBD.commit(function(err) {

            if (err) {
              return objBD.rollback(function() {
                console.log(err);
                res.json({error:'Erro ao tentar salvar o usuario!'});
              });
            }
            res.json({success:'success!', id: result.insertId});
          });
        });
      });
    });

});


app.delete('/users/:id', function(req, res){
   res.end('Servidor ON! delete');
});

// Tags
//***************************************************************************************************
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


var port = process.env.PORT || 8080;
app.listen(port, function(){
	console.log('Listening on ' + port);
});

app.options(/\.*/, function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type");
    res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT');
    res.send(200);
});

app.all('/*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type");
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT');
  next();
});