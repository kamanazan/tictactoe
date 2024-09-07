const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({server});

const player = []

app.use(express.static('client'));

wss.on('connection', (ws) => {
    console.log('New client connected');
    if (player.length === 2) {
        ws.send(JSON.stringify({error: 'Already has 2 players'}));
        ws.close();
    } else {
        player.push(ws);
        if (player.length === 1) {
            ws.send(JSON.stringify({setup: {player:'X', turn: 'X'}}))
        } else if(player.length === 2) {
            ws.send(JSON.stringify({setup: {player: 'O', turn: 'X'}}));
        }
    }
    

    ws.on('message', (msg) => {
        const msg2client = JSON.parse(msg.toString());
        console.log({newMsg: msg2client});
     
        if ('move' in msg2client) {
            console.log(`move command from ${ws}`)
            player.forEach((client) => {
                if (client.readyState !== WebSocket.OPEN) {
                    console.log(`client ${client} is disconnected`);
                } else {
                    if (client !== ws) {
                        console.log(`sending ${typeof msg2client} of ${msg2client} to ${ws}`);
                        client.send(msg.toString());
                    }
                }
               
            })
        }

    });

    ws.on('close', () => {
        console.log('Client disconnected');
    })
})

server.listen(3000, () => {
    console.log('server running on 3000');
})