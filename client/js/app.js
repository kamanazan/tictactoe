const mutationConfig = { 
    attributes: true,
    childList: true,
    subtree: true 
};

const board = document.querySelector('.board');
const squares = document.querySelectorAll('.square');
const newGameBtn = document.querySelector('#newgame');
const gameStatus = document.querySelector('#game-status');
const socket = new WebSocket(`ws://${window.location.host}`);

let currentPlayer = '';
let currentTurn = ''
let gameStatusMsg = 'Waiting Player';
let winner = undefined;
let boardScore = Array(9).fill(null)

function switchPlayer() {
    if (currentTurn === 'X') {
        currentTurn = 'O'
    } else if (currentTurn === 'O') {
        currentTurn = 'X'
    } else {
        console.error(`unknown turn ${currentTurn}`)
    }
    gameStatus.textContent = currentTurn ===  currentPlayer ? 'Your Turn' : 'Opponent Turn';
}

function newGame() {
    squares.forEach(s => {
        s.textContent = '';
        s.className = 'square';
    })
    currentPlayer = undefined;
    gameStatusMsg = 'New Game';
    boardScore = Array(9).fill(null);
    // window.localStorage.setItem('boardScore', JSON.stringify(boardScore));
    winner = undefined;
}

socket.onopen = () => {
    console.log('websocket connected');
}

socket.onmessage = (event) => {
    let data
    try {
        data = JSON.parse(event.data);
    } catch(error) {
        console.log({error});
    }

    if ('setup' in data) {
        console.log({'RECV:SETUP':{...data}});
        const { setup: {player, turn}} = data;
        currentPlayer = player;
        currentTurn = turn;
        gameStatus.textContent = currentTurn ===  currentPlayer ? 'Your Turn' : 'Opponent Turn';
    }

    if ('move' in data) {
        console.log({'RECV:MOVE':{...data}});
        const { move: {idx: sentIdx, currentPlayer: sentPlayer}} = data;
        const squareNode = document.querySelector(`div.board span.square[data-location="${sentIdx}"]`);
        if (!squareNode){
            debugger;
        }
        squareNode.textContent = sentPlayer;
        squareNode.classList.add(getSquareClass(sentPlayer));
        boardScore[sentIdx] = sentPlayer;
        // window.localStorage.setItem('boardScore', JSON.stringify(boardScore));
        switchPlayer();
    }

    if ('newGame' in data) {
        console.log({'RECV:NEWGAME':{...data}});
        newGame();
    }
}

socket.onclose = () => {
    console.log('disconnected');
}


// if (!window.localStorage.getItem('boardScore')) {
//     window.localStorage.setItem('boardScore', JSON.stringify(boardScore));
// } else {
//     boardScore = JSON.parse(window.localStorage.getItem('boardScore'));
// }


gameStatus.textContent = gameStatusMsg;

newGameBtn.addEventListener('click', () => {
    newGame();
    socket.send(JSON.stringify({newGame: true}));
})



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
    if (!event.target.textContent && !winner && (currentPlayer === currentTurn)) {
        event.target.textContent = currentPlayer;
        event.target.classList.add(getSquareClass(currentPlayer));
        const idx = parseInt(event.target.dataset.location);
        boardScore[idx] = currentPlayer;
        socket.send(JSON.stringify({move: {idx, currentPlayer}}));
        // window.localStorage.setItem('boardScore', JSON.stringify(boardScore));
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