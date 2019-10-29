#!/usr/bin/env node
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const express = require('express');
const socketio_auth = require('socketio-auth');
const axios = require('axios');
const path = require('path');
const mfo = require('mf-obj');
const http = require('http');
const qs = require('querystring');

const app = express();
const httpServer = http.createServer(app);
const io = require('socket.io')(httpServer);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, "views"));
app.use(express.static('static'));
app.use(express.static('dist'));
app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);

app.route('/').get((req, res) => {
    res.render('index', { self });
});

app.route('/_findAuth').get(async function(req, res) {
    const stuff = await axios.get("https://indieweb-endpoints.cc/search", {"params": {"url": req.query.url}});
    res.send(stuff.data.authorization_endpoint);
});

const self = "https://indiewebchat.glitch.me";

async function authenticate(client, data, callback) {
    const code = data.code;
    const request = await axios.get("https://indieweb-endpoints.cc/search", {"params": {"url": data.me}})
    const endpoint = request.data.authorization_endpoint;
    try {
        var authResponse = await axios.post(endpoint, qs.stringify({"code": code, "redirect_uri": self, "client_id": self}), {"headers": {"Accept": "application/json"}})
        if (authResponse.data.me !== undefined) {
            callback(null, true);
        } else {
            callback("auth failed");
        }
    } catch (e) {
        callback(e);
    }
}
                                                            
async function postAuthenticate (client, data) {
    const author = await mfo.getCard(data.me);
    console.log(author);
    io.emit("chataction", {"author": author, "action": "connected"});
    client.on('sendmsg', (msg) => {
        console.log('message: ' + msg);
        if (msg.split()[0] == "/me") {
            io.emit('chataction', {"author": author, "action": msg.split().slice(1).join(' ')});
        } else {
            io.emit('chatmessage', {"author": author, "message": msg});
        }
    });
    client.on('disconnect', () => {
        console.log('user disconnected');
        io.emit('chataction', {"author": author, "action": "disconnected"});
    });
};

socketio_auth(io, { authenticate, postAuthenticate, timeout: 10000 });

httpServer.listen(8000, () => {
    console.log('Example app listening on port 8000!')
});

/*if (cluster.isMaster) {
      for (let i = 0; i < numCPUs; i++) {
          cluster.fork();
      }
} else {
}*/
