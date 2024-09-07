const mutationConfig = { 
    attributes: true,
    childList: true,
    subtree: true 
};

const socket = new WebSocket('ws://localhost:3000');
socket.onopen = () => {
    console.log('websocket connected');
}

socket.onmessage = (event) => {
    console.log({msg: event.data});
}

socket.onclose = () => {
    console.log('disconnected');
}
let currentPlayer = 'X';
let gameStatusMsg = 'Player X Turn';
let winner = undefined;

let boardScore = Array(9).fill(null)

if (!window.localStorage.getItem('boardScore')) {
    window.localStorage.setItem('boardScore', JSON.stringify(boardScore));
} else {
    boardScore = JSON.parse(window.localStorage.getItem('boardScore'));
}

const board = document.querySelector('.board');
const squares = document.querySelectorAll('.square');
const newGameBtn = document.querySelector('#newgame');
const gameStatus = document.querySelector('#game-status');

gameStatus.textContent = gameStatusMsg;

newGameBtn.addEventListener('click', () => {
    squares.forEach(s => {
        s.textContent = '';
        s.className = 'square';
        currentPlayer = 'X';
        gameStatusMsg = 'Player X Turn';
        boardScore = Array(9).fill(null);
        window.localStorage.setItem('boardScore', JSON.stringify(boardScore));
        winner = undefined;
    })
})

function switchPlayer() {
    if (currentPlayer === 'X') {
        currentPlayer = 'O';
        gameStatusMsg = 'Player O Turn';
    } else {
        currentPlayer = 'X'
        gameStatusMsg = 'Player X Turn';
    }
    gameStatus.textContent = gameStatusMsg;
}

function getSquareClass(cp) {
    switch (cp) {
        case 'X':
            return 'cross';
        case 'O':
            return 'circle';
        default:
            break;
    }
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
            gameStatus.textContent = `Winner is ${winner}`;
            break;
        }
    }
    const boardIsFull = boardScore.every(b => b !== null);
    if (!winner && boardIsFull) {
        winner = 'draw';
        gameStatus.textContent = 'Draw!';
    }
}

function clickFillSquare(event) {
    if (!event.target.textContent && !winner) {
        event.target.textContent = currentPlayer;
        event.target.classList.add(getSquareClass(currentPlayer));
        const idx = parseInt(event.target.dataset.location);
        boardScore[idx] = currentPlayer;
        socket.send(JSON.stringify({idx, currentPlayer}));
        window.localStorage.setItem('boardScore', JSON.stringify(boardScore));
        switchPlayer();
    }
}

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

observer.observe(board, mutationConfig)