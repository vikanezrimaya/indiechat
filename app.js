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

var crypto = require('crypto');

function random (howMany, chars) {
      chars = chars
        || 'abcdefghijklmnopqrstuwxyz0123456789';
    var rnd = crypto.randomBytes(howMany)
    var value = new Array(howMany)
    var len = len = Math.min(256, chars.length)
    var d = 256 / len

    for (var i = 0; i < howMany; i++) {
          value[i] = chars[Math.floor(rnd[i] / d)]
    };

    return value.join('');
}

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
    try {
        var author = await mfo.getCard(data.me);
    } catch (e) {
        console.log(e);
        var name = me;
        var author = {"name": name, "img": "https://cdn0.iconfinder.com/data/icons/unigrid-flat-human-vol-2/90/011_101_anonymous_anonym_hacker_vendetta_user_human_avatar-512.png", "url": "#"}
        var oldauthor = author;
        while (true) {
            try {
                author = await mfo.getCard(data.me);
                io.emit("chataction", {"author": oldauthor, "action": "is known now as " + author.name});
            } catch (e) {
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
        }
    }
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
