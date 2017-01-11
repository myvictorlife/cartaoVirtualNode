// =======================
// get the packages we need ============
// =======================
var express     = require('express');
var app         = express();
var q = require('q');
var bodyParser  = require('body-parser');
var morgan      = require('morgan');
var db = require('./db.js');
var jwt    = require('jsonwebtoken'); // used to create, sign, and verify tokens

// =======================
// configuration =========
// =======================
var port = process.env.PORT || 8080; // used to create, sign, and verify tokens
app.set('superSecret', 'itsasecret') // Variável secret

// use body parser so we can get info from POST and/or URL parameters
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(function(req, res, next){
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type");
    res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT');
    next();
  },
  bodyParser.urlencoded({
   extended: true
  })
);

// use morgan to log requests to the console
app.use(morgan('dev'));


// =======================
// get connection bd =====
// =======================
function BD() {

    var connection = db.getConnection();

    connection.connect(function(error){
      if(error)
         throw error;
    });
    console.log("Connectado");
  return connection;
}

// =======================
// routes ================
// =======================
// basic route
app.get('/', function(req, res) {
    console.log("entrei");
    res.send('Hello! The API is at http://localhost:' + port + '/api');
});

// API ROUTES -------------------
// we'll get to these in a second

// get an instance of the router for api routes
var apiRoutes = express.Router(); 

// TODO: route to authenticate a user (POST http://localhost:8080/api/authenticate)
apiRoutes.post('/authenticate', function(req, res){

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
   

      objBD.query('SELECT * FROM cartao_virtual.User u, cartao_virtual.Card c WHERE u.username = ? and u.password = ? and u.card_id = c.id', [username, password], function(error, user) {
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

// TODO: route middleware to verify a token
var middleware = function(req, res, next){
  console.log("app.use");
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
};

// route to show a random message (GET http://localhost:8080/api/)
apiRoutes.get('/', function(req, res) {
  res.json({ message: 'Welcome to the coolest API on earth!' });
});

// route to return all users (GET http://localhost:8080/api/users)
apiRoutes.route('/users') //inserimos middleware como primeiro parâmetro
    .get(middleware, function(req, res){
    console.log("users get all");
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

apiRoutes.route('/users/:id') //inserimos middleware como primeiro parâmetro
    .get(middleware, function(req, res){
  console.log("user get id");
   var objBD = BD();
   var id = req.param('id');
   
   objBD.query('SELECT * FROM cartao_virtual.User u, cartao_virtual.Card c where u.id = ? and u.card_id = c.id', id, function(error, user) {
        
        if (error) {
            res.json(error);
        } else {
            res.json(user);      
        }
    });

});

apiRoutes.route('/users') //inserimos middleware como primeiro parâmetro
    .get(middleware, function(req, res){

  console.log("user post");
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

apiRoutes.route('/users/:id') //inserimos middleware como primeiro parâmetro
    .get(middleware, function(req, res){
  console.log("user delete");
   res.end('Servidor ON! delete');
});

// Tags
//***************************************************************************************************
apiRoutes.route('/tags') //inserimos middleware como primeiro parâmetro
    .get(middleware, function(req, res){
      console.log("tag get all");
      var objBD = BD();
      objBD.query('SELECT * FROM cartao_virtual.Tag', function(err, rows) {
        if (err)
          res.json(error);
        else
          res.json(rows);
      });
});

apiRoutes.route('/tags/:id') //inserimos middleware como primeiro parâmetro
    .get(middleware, function(req, res){
  console.log("tag get id");
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
   
apiRoutes.route('/tags') //inserimos middleware como primeiro parâmetro
    .post(middleware, function(req, res){
   
    // Tags recebida por parametro
    var tags = req.body.tags;
    var objBD = BD();

    function getTags(tags, cb) {
        var result = [];
        var arrayInsert = [];
        var pending = tags.length;

        for(var i in tags) {
            objBD.query('SELECT * FROM cartao_virtual.Tag t where upper(t.text) = upper(?)', tags[i].text, function(err, stu){
                if(stu.length !== 0){
                  result.push(stu);  
                }
                if( 0 === --pending ) {
                    cb(result, arrayInsert); //callback if all queries are processed
                }
            });
        }
    }

    function contains(a, obj) {
      for(var j in a){
          if (a[j][0].text === obj) {
              return true;
          }
      }
      return false;
    }

    
    getTags(tags, function(result){
        
        var arrayInsert = [], arrayExist = [];
        tags = req.body.tags;

        // Separar tags que já existe das que não existe
        for(var j in tags){
          if(contains(result, tags[j].text)){
            arrayExist.push(tags[j]);
          }else{
            arrayInsert.push(tags[j].text);
          }
        }
        
        // Montando objeto para inserir Ex: [ ["teste1", new Date()], ["teste2", new Date()] ]
        var tags = arrayInsert; 
        var insertTag = [];
        for (var i = 0; i < arrayInsert.length; i++) {
          var object = [arrayInsert[i], new Date()];
          insertTag.push(object);
        }

        // Existe tags para ser inseridas
        if(insertTag.length > 0){

            var sql = 'INSERT INTO cartao_virtual.Tag (text, create_date) VALUES ?';
            objBD.query(sql, [insertTag], function(error, result) {
              if (error) 
                throw error;
              
              var rowIds = [], count = 0;
              for (var i = result.insertId; i < result.insertId + result.affectedRows; i++) {
                rowIds.push({id: i, text: insertTag[count++][0]});
              };

              objBD.end();
              res.json(arrayExist.concat(rowIds));
              
            });
        }else{
          objBD.end();
          console.log("Else");
          res.json(arrayExist);
        }
          

    });    

});



// apply the routes to our application with the prefix /api
app.use('/api', apiRoutes);

// =======================
// start the server ======
// =======================
app.listen(port);
console.log('Magic happens at http://localhost:' + port);