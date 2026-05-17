export class DominoEngine {
    // Valida se a pedra pode ser jogada nas pontas atuais da mesa
    static isValidMove(piece, boardEdges) {
        if (!boardEdges || boardEdges.left === null) return true; // Primeira jogada da partida
        return piece.left === boardEdges.left || 
               piece.right === boardEdges.left || 
               piece.left === boardEdges.right || 
               piece.right === boardEdges.right;
    }

    // Retorna qual lado da mesa a peça se conecta e faz o ajuste de rotação
    static getMoveOrientation(piece, boardEdges, chosenEdge) {
        if (boardEdges.left === null) return { side: 'first', flipped: false };

        if (chosenEdge === 'left') {
            if (piece.right === boardEdges.left) return { side: 'left', flipped: false };
            if (piece.left === boardEdges.left) return { side: 'left', flipped: true };
        } else if (chosenEdge === 'right') {
            if (piece.left === boardEdges.right) return { side: 'right', flipped: false };
            if (piece.right === boardEdges.right) return { side: 'right', flipped: true };
        }
        return null; // Jogada Inválida
    }
}
