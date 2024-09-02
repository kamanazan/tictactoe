let currentPlayer = 'X';

const squares = document.querySelectorAll('.square');

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
squares.forEach(s => {
    s.addEventListener('click', (e) => {
        console.log(e.target.dataset.location)
        if (!e.target.textContent) {
            e.target.textContent = currentPlayer;
            e.target.classList.add(getSquareClass(currentPlayer));
            switchPlayer();
        }
    })
})