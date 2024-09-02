let currentPlayer = 'X';

const squares = document.querySelectorAll('.square');
const newGameBtn = document.querySelector('#newgame');

newGameBtn.addEventListener('click', () => {
    squares.forEach(s => {
        s.textContent = '';
        s.className = 'square';
        currentPlayer = 'X';
    })
})

function switchPlayer() {
    if (currentPlayer === 'X') {
        currentPlayer = 'O';
    } else {
        currentPlayer = 'X'
    }
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

function clickFillSquare(event) {
    if (!event.target.textContent) {
        event.target.textContent = currentPlayer;
        event.target.classList.add(getSquareClass(currentPlayer));
        switchPlayer();
    }
}
squares.forEach(s => {
    s.addEventListener('click', clickFillSquare)
})