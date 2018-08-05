//
// # SimpleServer
//
// A simple chat server using Socket.IO, Express, and Async.
//
var http = require('http');
var path = require('path');

var async = require('async');
var socketio = require('socket.io');
var express = require('express');
//Criar
var bodyParser = require('body-parser');
var request = require('request');

//
// ## SimpleServer `SimpleServer(obj)`
//
// Creates a new instance of SimpleServer with the following options:
//  * `port` - The HTTP port to listen on. If `process.env.PORT` is set, _it overrides this value_.
//
var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);

router.use(express.static(path.resolve(__dirname, 'client')));
//Criar
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
          //console.log(event.message);
          tratarMensagem(event);
        } else {
          if (event.postback && event.postback.payload){
            //console.log("Achamos payload. Ele é", event.postback.payload);
            switch (event.postback.payload){
              case 'clicou_comecar':
                sendTextMessage(event.sender.id, 'Como euposso te ajudar? Veja as opções abaixo:');
                sendFirstMenu(event.sender.id);
              default:
                break;

            }
          }
        }
      })
    })
    res.sendStatus(200);
  }

});

function tratarMensagem (event) {
   var senderId = event.sender.id;
   var recipientId = event.recipient.id;
   var timeOfMessage = event.timestamp;
   var message = event.message;

   console.log("Mensagem recebida pelo usuário %d pela página %d", senderId, recipientId)

   var messageId = message.mid;
   var messageText = message.text;
   var files = message.attachments;

   if (messageText) {
     switch(messageText){
        case 'oi':
          sendTextMessage(senderId, 'Oi, tudo bem com você');
          break;
        case 'tchau':
          sendTextMessage(senderId, 'Até mais...');
          break;
        default:
          sendTextMessage(senderId, 'Não entendi o que você disse...');
          break;
      }
    }else if (attachments){
      //Tratar anexos
      console.log("Enviaram anexos");
   }
}

//Prepara o objeto no formato que o facebook espera
function sendTextMessage (recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText
    }
  }
  //Envia via esta função
  callSendApi(messageData);
}


function sendFirstMenu (recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: 'template',
        payload: {
         template_type: 'button',
         text: 'O que você procura?',
         buttons: [

           {
             type: 'web_url',
             url: 'https://www.google.com',
             title: 'Acesse nosso site!'
           },

           {
             type: 'postback',
             title: 'Preço de entrada',
             payload: 'clicou_preco'
           },

           {
             type: 'postback',
             title: 'Banda de hoje',
             payload: 'clicou_banda'
           }
         ]
        }
      }
    }
  };
  //Envia via esta função
  callSendApi(messageData);
}



//Função default do Facebook para responder a requisições (Enviar mensagem para o usuário)
function callSendApi (messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: 'EAAEF25KV2QgBAKsMhsc3ue7wN6Ta4lF4ZCyxRD9Vf9oxnNe36RnPOvqhMK2cYfoaKGMnswTN6L0fHAY85SRxMgORY4ZAau1LjxfYSzdkBkCOtFTTASgg9ZCRBa40dUEuCAK3HIZACCGllZB21V9YV9PxflOZCOe8IjxD8o5qQewOjL23mSPP8B' },
    method: 'POST',
    json: messageData
  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      console.log("Enviada com sucesso!");
      var recipientId = body.recipientId;
      var messageId = body.messageId;

    }else{
      console.log("Não foi possível enviar!");
      console.log(error);
    }
  })
}


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
