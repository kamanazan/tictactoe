async function handleErrors(request, func) {
    try {
        return await func();
    } catch (err) {
        if (request.headers.get("Upgrade") == "websocket") {
            let [client, server] = Object.values(new WebSocketPair());
            server.accept();
            server.send(JSON.stringify({error: err.stack}));
            server.close(1011, "Uncaught exception during session setup");
            return new Response(null, { status: 101, webSocket: client });
        } else {
            return new Response(err.stack, {status: 500});
        }
    }
}
export default {
    async fetch(request, env) {
        return await handleErrors(request, async () => {
        // Get URL path 
        const url = new URL(request.url);
        const path = url.pathname.split('/').slice(1);
        // console.log({defaultFetch: path});
        if (!path[0]) {
            return new Response("Not found", {status: 404});
        }

        switch (path[0]) {
            case "api":
                // This is a request for `/api/...`, call the API handler.
                return handleApiRequest(path.slice(1), request, env);

            default:
                return new Response("Not found", {status: 404});
        }
        });
    }
}

async function handleApiRequest(path, request, env) {

    switch(path[0]) {
        case "room": {
            const name = path[1];

            // create new durable object from name
            const id = env.gameMatch.idFromName(name);
            // and then get the actual object
            const gameObject = env.gameMatch.get(id);
            // console.log({createdObject: {id, gameObject}});
            // since we created the game object from name, the /api/room/<roomname> no longer needed.
            // we just keep the rest (expected: /websocket)
            let newUrl = new URL(request.url);
            newUrl.pathname = "/" + path.slice(2).join("/");
            // console.log({urlChange: {old: request.url, new: newUrl.url}});
            
            return gameObject.fetch(newUrl, request);
        }
        default:
            return new Response("Not Found", {status: 404});
    }
}


export class GameMatch {
    constructor(state, env) {
        this.state = state;
        this.env = env;
        // this.storage = state.storage;
        // this.board = Array(9).fill(null);
        this.players = new Map();
        this.slot = ['X', 'O'];
        this.gameState = 'waiting'; // waiting | playing | done

        this.state.getWebSockets().forEach((ws) => {
            const meta = ws.deserializeAttachment();

            this.players.set(ws, { ...meta});
        })
    }

    async fetch(request) {
        return await handleErrors(request, async () => {
            const url = new URL(request.url);
            // console.log({fetch: url.pathname});
            switch (url.pathname) {
                case '/websocket':
                    // Best practice for initializing Cloudflare websocket
                    if (request.headers.get("Upgrade") != "websocket") {
                        return new Response("expected websocket", {status: 400});
                    }
                    const [client, server] = Object.values(new WebSocketPair());
                    this.handleSession(server);
                    return new Response(null, {status: 101, webSocket: client})
                default:
                    return new Response('Not Found', {status: 404});
            }
        });
    }

    async handleSession(webSocket) {
        try {
            console.log('handling connection');
            if (this.players.size >= 2) {
                console.log('rejecting because full');
                webSocket.send({error: 'Player is full'});
                webSocket.close(1009, 'Player is full');
            } else {
                this.state.acceptWebSocket(webSocket);
                this.players.set(webSocket, {});
            }
     
        } catch (err) {
            console.log({error: {msg: 'error handling session', err: err.stack}});
        }
        
    }

    async webSocketMessage(webSocket, msg) {
        try {
            const data = JSON.parse(msg);
            console.log({newMsg: {...data}});
            if('join' in data) {
                console.log('new connection joined');
                // check if we should reject or accept new connection as player
                // and if it is full we send ready command so players can start playing
                const player = this.players.get(webSocket);
                player.playerId = data.join;
                const slotIdx = (Math.floor(Math.random() * (this.slot.length)));
                player.slot = this.slot[slotIdx];
                this.slot.splice(slotIdx, 1);
                webSocket.serializeAttachment({ ...webSocket.deserializeAttachment(), playerId: player.playerId, slot: player.slot });
                webSocket.send(JSON.stringify({setup: {player: player.slot, turn: 'X'}}));
                if (this.players.size === 2) {
                   this.broadcast({ready: true});
                }
            }

            if ('move' in data) {
                this.players.forEach((_, client) => {
                    if (webSocket != client) {
                        client.send(msg);
                    }
                })
            }

            if ('newGame' in data) {
                this.slot = ['X', 'O'];
                this.players.forEach((player, webSocket) => {
                    webSocket.send(msg);
                    const slotIdx = (Math.floor(Math.random() * (this.slot.length)));
                    player.slot = this.slot[slotIdx];
                    this.slot.splice(slotIdx, 1);
                    webSocket.serializeAttachment({ ...webSocket.deserializeAttachment(), slot: player.slot });
                    webSocket.send(JSON.stringify({setup: {player: player.slot, turn: 'X'}}));
                    webSocket.send(JSON.stringify({ready: true}));
                })
            }
        } catch (err) {
            webSocket.send(JSON.stringify({error: err.stack}));
        }
        
    }

    async webSocketClose(ws) {
       this.players.delete(ws);
       this.broadcast('stop');
    }

    broadcast(message) {
        if (typeof message !== "string") {
            message = JSON.stringify(message);
        }
        this.players.forEach((_, webSocket) => {
            webSocket.send(message);
        });
    }
}
