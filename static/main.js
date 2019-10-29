const io = require('socket.io-client');
const dialogPolyfill = require('dialog-polyfill');

const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has("code")) {
    var socket = io();
    socket.emit('authentication', {"code": urlParams.get("code"), "me": urlParams.get("me")});
    socket.on('authenticated', function() {
        // use the socket as usual
        const form = document.getElementById("chatform");
        const messageInput = document.getElementById("m");
        const messages = document.getElementById("messages");
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            console.log(m.value)
            socket.emit('sendmsg', m.value)
            m.value = '';
            return false;
        });
        socket.on('chatmessage', (msg) => {
            messages.innerHTML += `<li class="h-entry"><img src="${msg.author.photo}" class="author-avatar"><a href="${msg.author.url}" class="u-author">${msg.author.name}</a>: ${msg.message}</li>`
        });
        socket.on('chataction', (msg) => {
            messages.innerHTML += `<li class="h-entry"><i class="action"><img src="${msg.author.photo}" class="author-avatar"><a href="${msg.author.url}" class="u-author">${msg.author.name}</a> ${msg.action}</i></li>`
        });
        messageInput.disabled = false;
    });
} else {
    const dialog = document.getElementById("login");
    dialogPolyfill.registerDialog(dialog);
    dialog.showModal();
    const form = document.getElementById("loginform");
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        var url = document.getElementById("url").value;
        var client_id = document.getElementById("client_id").value;
        var redirect_uri = document.getElementById("redirect_uri").value;
        fetch(window.location + "_findAuth?url=" + encodeURIComponent(url)).then(r => { return r.text(); }).then(r => {
            window.location = r + "?" + Object.entries({
                'me': url, 'redirect_uri': redirect_uri, 'client_id': client_id,
                'response_type': 'id'
            }).map(([key, val]) => { return (key + '=' + encodeURIComponent(val)); }).join('&');
        }).catch(e => {
            alert(e);
        });
    });
}
