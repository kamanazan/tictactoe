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
    console.log(`STAT: ${player.length} player`);
    if (player.length === 2) {
        ws.send(JSON.stringify({error: 'Already has 2 players'}));
        ws.close();
    } else {
        if (player.length === 0) {
            ws.id = 'X';
            player.push(ws);
            ws.send(JSON.stringify({setup: {player:'X', turn: 'X'}}));
            console.log('sending setup player X');
        } else if(player.length === 1) {
            ws.id = 'O';
            player.push(ws);
            ws.send(JSON.stringify({setup: {player: 'O', turn: 'X'}}));
            console.log('sending setup player O');
        }
    }
    

    ws.on('message', (msg) => {
        const msg2client = JSON.parse(msg.toString());
        console.log({newMsg: msg2client});
     
        if ('move' in msg2client) {
            wss.clients.forEach((client) => {
                if (client !== ws) {
                    client.send(msg.toString());
                }
            })
        }

        if ('newGame' in msg2client) {
            wss.clients.forEach((client) => {
                if (client !== ws) {
                    client.send(msg.toString());
                }
            })
            if (player.length === 2) {
                player[0].send(JSON.stringify({setup: {player:'X', turn: 'X'}}));
                player[1].send(JSON.stringify({setup: {player:'O', turn: 'X'}}));
            }
        }

    });

    ws.on('close', () => {
        if (player[0].id === ws.id) {
            const d = player.shift();
            console.log(`Client ${d} disconnected`);
        } else if (player[1].id === ws.id) {
            const d = player.pop();
            console.log(`Client ${d} disconnected`);
        } else {
            console.error('unknown client disconnected');
        }
        
    })
})

server.listen(3000, () => {
    console.log('server running on 3000');
})