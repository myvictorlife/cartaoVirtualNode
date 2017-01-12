// =======================
// get the packages we need ============
// =======================
var express     = require('express');
var app         = express();
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
                objBD.end();
                res.json(user[0]);
            } else{
                objBD.end();
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
              objBD.end();
              res.json(error);
          } else {
            jsonUser = users;
            objBD.end();
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
            objBD.end();
            res.json(error);
        } else {
            objBD.end();
            res.json(user);      
        }
    });

});

apiRoutes.post('/users', function(req, res){

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
              objBD.end();
              res.json({error:'Erro ao tentar inserir o usuario!'});
            });
          }  
          objBD.commit(function(err) {

            if (err) {
              return objBD.rollback(function() {
                console.log(err);
                objBD.end();
                res.json({error:'Erro ao tentar salvar o usuario!'});
              });
            }
            res.json({success:'success!', id: result.insertId});
          });
        });
      });
    });

});

apiRoutes.route('/users') //inserimos middleware como primeiro parâmetro
    .put(middleware, function(req, res){
  console.log("user put");

  var username = req.body.username;
  var card = req.body.profile;

   var objBD = BD();
  objBD.query('SELECT card_id FROM cartao_virtual.User u where u.username = ?', username, function(error, user) {
        
        if (error) {
            objBD.end();
            res.json(error);
        } else {
           if(user.length){

              var userID = user[0].card_id;
              card.updated_date = new Date();
              card.user_updated = username;

              var sql = "UPDATE cartao_virtual.Card SET ? WHERE id = ?"
              objBD.query(sql, [card, userID], function(error, result) {
                  if (error) {
                    objBD.end();
                    res.json(error);
                  }else{
                    res.json({error: '0', message: 'sucess'});  
                  }
              });
           }else{
            res.json({error: 'error'});
           }
        }
    });
  
   //res.json({card: card});
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
        if (err){
          objBD.end();
          res.json(error);
        } else{
          objBD.end();
          res.json(rows);
        }
      });
});

apiRoutes.route('/tags/:id') //inserimos middleware como primeiro parâmetro
    .get(middleware, function(req, res){
  console.log("tag get id");
   var objBD = BD();
   var id = req.param('id');

   objBD.query('SELECT * FROM cartao_virtual.Tag WHERE id = ?', id, function(error, user) {
        if (error) {
            objBD.end();
            res.json(error);
        } else {
            objBD.end();
            res.json(user);    
        }
    });

});
   
apiRoutes.route('/tags') //inserimos middleware como primeiro parâmetro
    .post(middleware, function(req, res){
   
    var tags = req.body.tags;
      if (tags !== undefined) {

          var objBD = BD();
          var tagsArray = [];
          var tagsInsert = [];

          for (var i in tags) {
              tagsArray.push(tags[i].text);
          }

          var promiseTag = new Promise(function (resolve, reject) {
              objBD.query("SELECT * FROM cartao_virtual.Tag t where t.text IN (" + "'" + tagsArray.join("','") + "')", function (error, result) {
                  if (error) reject(Error("Erro ao salvar a tag"))
                  resolve(result)
              });
          })

          promiseTag.then(function (result) {
              for (var i in result) {
                  var index = tagsArray.indexOf(result[i].text);
                  if(index != -1) {
                      tagsArray.splice(index, 1);
                  }
              }

              if (tagsArray.length != 0) {

                  for (var i in tagsArray) {
                      tagsInsert.push([tagsArray[i], new Date()])
                  }

                  objBD.query("INSERT INTO cartao_virtual.Tag (text, create_date) VALUES ?", [tagsInsert], function (error, result) {
                      if (error){
                        objBD.end();
                        return res.json(500, {"error": "Erro ao salvar cadastro"});
                      }
                      objBD.end();
                  });
              }
          }, function (err) {
              objBD.end();
              return res.json(500, {"error": err})
          });
      }
      return res.json({"success": true});

});

// Cards
//***************************************************************************************************
apiRoutes.route('/validate_card').post(middleware, function(req, res) {
    var objBD = BD()
    var error = false
    var card = req.body.card

    function similar_text(string, percent) {
        if((!string) && (percent < 1) && (percent > 100)) return '';

        var length = string.length * (percent/100);
        return string.slice(0, Math.ceil(length));
    }

    function validCard() {
        var validateCardPromise = new Promise(function (resolve, reject) {
            var name = similar_text(card.name, 80);
            var query = "SELECT * FROM cartao_virtual.Card where upper(name) LIKE upper(?) OR phone = ? " +
                        "OR email = ? AND flag_updated = 1 AND flag_private = 0 LIMIT 1;"
            objBD.query(query, [name + "%", card.phone, card.email], function (error, result) {
                if (error) reject(Error(error))
                resolve(result[0])
            })
        })

        Promise.all([validateCardPromise]).then(function (result) {
            console.log(result)
        }).catch(function (err) {
            error = true
            console.log(err); // some coding error in handling happened
        });

        if(error) return res.status(500).json({"message": "Erro na requisição"})
        return res.json(card);
    }


    if((!req.body.token) || (Object.keys(card).length === 0)) {
        res.status(400).json({'message': "error"})
    }
    validCard()
});

apiRoutes.route('/cards').post(middleware, function(req, res){

    var objBD = BD()
    var user = req.body.user
    var card = req.body.card

    function saveCard() {
        var validateUserPromise = new Promise(function (resolve, reject) {
            objBD.query("SELECT COUNT(1) AS count FROM cartao_virtual.User where id= ? and username = ?", [user.id, user.username], function (error, result) {
                if (error) reject(Error("Usuário não existe"))
                resolve(result[0].count)
            })
        })

        /*
            var saveCard = new Promise(function (resolve, reject) {
            });
        */

        Promise.all([validateUserPromise]).then(function (result) {
            console.log(result[0]);
        }).catch(function (err) {
            console.log(err); // some coding error in handling happened
        });
        res.json(card);
    }

    if(Object.keys(card).length < 11) {
        res.status(400).json({"message": "All data should be fulfilled"} );
    } else {
        card.created_date = new Date()
        saveCard();
    }

});



// apply the routes to our application with the prefix /api
app.use('/api', apiRoutes);

// =======================
// start the server ======
// =======================
app.listen(port);
console.log('Magic happens at http://localhost:' + port);