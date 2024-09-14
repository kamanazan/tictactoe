export function getSquareClass(cp) {
    switch (cp) {
        case 'X':
            return 'cross';
        case 'O':
            return 'circle';
        default:
            break;
    }
}