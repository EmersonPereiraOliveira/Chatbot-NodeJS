//
// Servidor padrão simples
//
// Servidor usando Socket.IO, Express, e Async.
//
var http = require('http');
var path = require('path');

var async = require('async');
var socketio = require('socket.io');
var express = require('express');
///
//Criar
//
var bodyParser = require('body-parser');
var request = require('request');

var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);

router.use(express.static(path.resolve(__dirname, 'client')));
//
//Criar
//
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));

var messages = [];
var sockets = [];

//
//Alterações - início
//

//Endereço de callback
//router.get('/webhook', function (req, res) {
//  res.send('ok');
//});


//Endereço de callback
router.get('/webhook', function (req, res) {
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === 'senha123') {
    console.log('Validação ok!')
    res.status(200).send(req.query['hub.challenge']);
  }else{
    console.log('Validação falhou!')
    res.sendStatus(403);
  }
});


router.post('/webhook', function (req, res){
  var data = req.body;
  //É necessário primeiro percorrer toda a estrutura para verificar se está correta
  if (data && data.object === 'page') {
    //Percorrer entradas entry
    data.entry.forEach(function (entry) {
      var pageID = entry.id;
      var timeOfEvent =entry.time;

      //Percorrer mensagens, e apresentá-las no console
      entry.messaging.forEach(function (event) {
        if (event.message) {
          console.log(event.message);
        }
      })
    })
    res.sendStatus(200);
  }
});

//
//Alterações - Fim
//


io.on('connection', function (socket) {
    messages.forEach(function (data) {
      socket.emit('message', data);
    });

    sockets.push(socket);

    socket.on('disconnect', function () {
      sockets.splice(sockets.indexOf(socket), 1);
      updateRoster();
    });

    socket.on('message', function (msg) {
      var text = String(msg || '');

      if (!text)
        return;

      socket.get('name', function (err, name) {
        var data = {
          name: name,
          text: text
        };

        broadcast('message', data);
        messages.push(data);
      });
    });

    socket.on('identify', function (name) {
      socket.set('name', String(name || 'Anonymous'), function (err) {
        updateRoster();
      });
    });
  });

function updateRoster() {
  async.map(
    sockets,
    function (socket, callback) {
      socket.get('name', callback);
    },
    function (err, names) {
      broadcast('roster', names);
    }
  );
}

function broadcast(event, data) {
  sockets.forEach(function (socket) {
    socket.emit(event, data);
  });
}

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});
