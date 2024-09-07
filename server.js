const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({server});

app.use(express.static('client'));

wss.on('connection', (ws) => {
    console.log('New client connected');

    ws.on('message', (msg) => {
        console.log(`new msg ${typeof msg} of ${msg}`);
        const msg2client = JSON.stringify(msg.toString())
        wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                console.log(`sending ${typeof msg2client} of ${msg2client}`)
                client.send(msg.toString());
            }
        })
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    })
})

server.listen(3000, () => {
    console.log('server running on 3000');
})