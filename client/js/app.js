import { getSquareClass } from "./utils.js";

const board = document.querySelector('.board');
const squares = document.querySelectorAll('.square');
const newGameBtn = document.querySelector('#newgame');
const gameStatus = document.querySelector('#game-status');
const gameResult = document.querySelector('#game-result');
const gameName = document.querySelector('#game-name')
const joinGameBtn = document.querySelector('#join-game');
const popup = document.querySelector('#popup');
const roomForm = document.querySelector('#room-form');
const wss = document.location.protocol === "http:" ? "ws://" : "wss://";

let currentPlayer = '';
let currentTurn = ''
let winner = undefined;
let boardScore = Array(9).fill(null)
let history = {
    win: 0,
    lose: 0,
    draw: 0
}
let playerId = null;
let currentWebSocket = null;
let canMove = false;

gameStatus.textContent = 'Join a room';

if (!window.localStorage.getItem('history')) {
    window.localStorage.setItem('history', JSON.stringify(history));
} else {
    history = JSON.parse(window.localStorage.getItem('history'));
}

if (!window.localStorage.getItem('playerId')) {
    playerId =  window.crypto.randomUUID();
    window.localStorage.setItem('playerId', playerId);
} else {
    playerId = window.localStorage.getItem('playerId');
}

newGameBtn.addEventListener('click', () => {
    if (!currentWebSocket) {
        console.error('disconnected from websocket')
        return false
    }

    currentWebSocket.send(JSON.stringify({newGame: true}));
});

joinGameBtn.addEventListener('click', () => {
    if (!gameName.value) {
        gameStatus.textContent = 'Game name is empty!'
    } else {
        const name = gameName.value;
        gameStatus.textContent = `Joining ${name}`
        joinGame(name);
        gameName.value = '';
    }
});

squares.forEach(s => {
    s.addEventListener('click', clickFillSquare);
    const idx = parseInt(s.dataset.location);
    if (boardScore[idx]) {
        const locValue = boardScore[idx];
        s.textContent = locValue;
        s.classList.add(getSquareClass(locValue));
    }
});

let observer = new MutationObserver(records => {
    checkWinner();
})

observer.observe(
    board, 
    { 
        attributes: true,
        childList: true,
        subtree: true 
    }
);

function switchPlayer() {
    if (currentTurn === 'X') {
        currentTurn = 'O'
    } else if (currentTurn === 'O') {
        currentTurn = 'X'
    } else {
        console.error(`unknown turn ${currentTurn}`)
    }
    canMove = currentPlayer === currentTurn;
    gameStatus.textContent = currentTurn ===  currentPlayer ? 'Your Turn' : 'Opponent Turn';
}

function newGame() {
    squares.forEach(s => {
        s.textContent = '';
        s.className = 'square';
    })
    currentPlayer = undefined;
    gameStatus.textContent = 'New Game';
    boardScore = Array(9).fill(null);
    winner = undefined;
    popup.classList.add('hide');
}



function checkWinner() {
    const winningLocs = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6],
      ];

    for (const loc of winningLocs) {
        const [a, b, c] = loc;
        if (boardScore[a] && boardScore[a] === boardScore[b] &&  boardScore[a] === boardScore[c]) {
            winner = boardScore[a]
            if ( winner === currentPlayer){
                gameResult.textContent = 'You Win!';
                history.win += 1;
            } else {
                gameResult.textContent = 'You Lose!';
                history.lose += 1;
            }
            popup.classList.remove('hide');
            window.localStorage.setItem('history', JSON.stringify(history));
            break;
        }
    }
    const boardIsFull = boardScore.every(b => b !== null);
    if (!winner && boardIsFull) {
        winner = 'draw';
        gameResult.textContent = 'Draw!';
        history.draw += 1;
        window.localStorage.setItem('history', JSON.stringify(history));
        popup.classList.remove('hide');
    }
}

function clickFillSquare(event) {
    if (!currentWebSocket) {
        console.error('disconnected from websocket')
        return false
    }
    if (!event.target.textContent && !winner && canMove) {
        event.target.textContent = currentPlayer;
        event.target.classList.add(getSquareClass(currentPlayer));
        const idx = parseInt(event.target.dataset.location);
        boardScore[idx] = currentPlayer;
        currentWebSocket.send(JSON.stringify({move: {idx, player: currentPlayer}}));
        switchPlayer();
    }
}

function joinGame() {
    let socket= new WebSocket(wss + '127.0.0.1:8787' + "/api/room/" + gameName.value + "/websocket");
    socket.onopen = () => {
        currentWebSocket = socket;
        socket.send(JSON.stringify({join: playerId}))
        console.log(`${playerId} joining ${socket.url}`);
    }
    
    socket.onmessage = (event) => {
        let data
        try {
            data = JSON.parse(event.data);
        } catch(error) {
            console.error({error});
        }
        console.log({newMessage: {...data}});
        if ('setup' in data) {
            // console.log({'RECV:SETUP':{...data}});
            const { setup: {player, turn}} = data;
            currentPlayer = player;
            currentTurn = turn;
            gameStatus.textContent = 'Waiting for player';
            canMove = currentPlayer === currentTurn;
            board.classList.remove('hide');
            roomForm.classList.add('hide');
        }
    
        if ('move' in data) {
            // console.log({'RECV:MOVE':{...data}});
            const { move: {idx: sentIdx, player: sentPlayer}} = data;
            const squareNode = document.querySelector(`div.board span.square[data-location="${sentIdx}"]`);
            squareNode.textContent = sentPlayer;
            squareNode.classList.add(getSquareClass(sentPlayer));
            boardScore[sentIdx] = sentPlayer;
            switchPlayer();
        }
    
        if ('newGame' in data) {
            // console.log({'RECV:NEWGAME':{...data}});
            newGame();
        }

        if ('ready' in data) {
            gameStatus.textContent = currentTurn ===  currentPlayer ? 'Your Turn' : 'Opponent Turn';
            canMove = currentPlayer === currentTurn;
        }
    }
    
    socket.onclose = ({ data }) => {
        currentWebSocket = null;
        board.classList.add('hide');
        roomForm.classList.remove('hide');
        gameStatus.textContent = 'Join a room';
        console.log('disconnected');
    }
}

