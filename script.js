import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import firebaseConfig from "./firebase-config.js";

// Inicialização do Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Estado do Jogo Local
let gameState = {
    roomCode: null,
    playerRole: null, // 'p1' ou 'p2'
    playerName: '',
    hand: [],
    isMyTurn: false
};

// Sintetizador de Som Nativo (Web Audio API) para evitar arquivos ausentes no GitHub Pages
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playDominoSound(frequency = 300, type = 'sine', duration = 0.08) {
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) { console.log("Áudio aguardando interação do usuário."); }
}

// Elementos do DOM
const screens = {
    loading: document.getElementById('loading-screen'),
    lobby: document.getElementById('lobby-screen'),
    waiting: document.getElementById('waiting-screen'),
    game: document.getElementById('game-screen')
};

// Remover tela de carregamento inicial
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => screens.loading.classList.add('hidden'), 1000);
});

// Ações de Registro e Criação de Salas
document.getElementById('btn-create-room').addEventListener('click', () => {
    const name = document.getElementById('player-name').value.trim();
    if (!name) return alert('Por favor, digite seu nome primeiro!');
    
    gameState.playerName = name;
    gameState.playerRole = 'p1';
    gameState.roomCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    setupRoomOnFirebase();
});

document.getElementById('btn-join-room').addEventListener('click', () => {
    const name = document.getElementById('player-name').value.trim();
    const code = document.getElementById('room-code-input').value.trim();
    if (!name || !code) return alert('Preencha seu nome e o código da mesa!');
    
    gameState.playerName = name;
    gameState.playerRole = 'p2';
    gameState.roomCode = code;
    
    joinRoomOnFirebase();
});

// Criação da estrutura inicial da Sala no Firebase
function setupRoomOnFirebase() {
    const roomRef = ref(db, 'rooms/' + gameState.roomCode);
    const initialData = {
        status: 'waiting',
        p1: { name: gameState.playerName, score: 0 },
        p2: { name: '', score: 0 },
        chain: [],
        deck: [],
        turn: 'p1',
        history: 'Mesa criada.'
    };
    
    set(roomRef, initialData).then(() => {
        document.getElementById('generated-code').innerText = gameState.roomCode;
        switchScreen('waiting');
        listenToRoomChanges();
    });
}

// Conectar em uma sala existente
function joinRoomOnFirebase() {
    const roomRef = ref(db, 'rooms/' + gameState.roomCode);
    update(roomRef, {
        'p2/name': gameState.playerName,
        'status': 'playing'
    }).then(() => {
        listenToRoomChanges();
    }).catch(() => alert('Erro ao entrar na sala. Verifique o código.'));
}

function listenToRoomChanges() {
    const roomRef = ref(db, 'rooms/' + gameState.roomCode);
    onValue(roomRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        // Se o status mudar para tocando, inicia o tabuleiro
        if (data.status === 'playing') {
            if (screens.game.classList.contains('hidden')) {
                switchScreen('game');
                document.getElementById('game-room-id').innerText = `#${gameState.roomCode}`;
                if(gameState.playerRole === 'p1' && (!data.deck || data.deck.length === 0)) {
                    generateAndDistributePieces();
                }
            }
            updateGameTable(data);
        }
    });
}

// Motor de Geração e Distribuição de Peças (Regras do Brasil)
function generateAndDistributePieces() {
    let pool = [];
    for (let i = 0; i <= 6; i++) {
        for (let j = i; j <= 6; j++) {
            pool.push({ left: i, right: j, id: `d-${i}-${j}` });
        }
    }
    // Embaralhamento profissional (Fisher-Yates)
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const p1Hand = pool.slice(0, 7);
    const p2Hand = pool.slice(7, 14);
    const remainingDeck = pool.slice(14);

    // Identificar quem tem a maior bucha (preferencialmente a bucha de 6) para iniciar
    let firstTurn = 'p1';
    const p1HasBucha6 = p1Hand.some(p => p.left === 6 && p.right === 6);
    if (!p1HasBucha6) {
        const p2HasBucha6 = p2Hand.some(p => p.left === 6 && p.right === 6);
        if (p2HasBucha6) firstTurn = 'p2';
    }

    update(ref(db, 'rooms/' + gameState.roomCode), {
        'p1/hand': p1Hand,
        'p2/hand': p2Hand,
        'deck': remainingDeck,
        'turn': firstTurn
    });
}

// Atualização e Renderização da Mesa em Tempo Real
function updateGameTable(data) {
    // Atualizar Placar e Nomes
    document.getElementById('score-p1-name').innerText = data.p1.name || "Aguardando...";
    document.getElementById('score-p2-name').innerText = data.p2.name || "Aguardando...";
    document.getElementById('score-p1-val').innerText = String(data.p1.score).padStart(2, '0');
    document.getElementById('score-p2-val').innerText = String(data.p2.score).padStart(2, '0');

    // Determinar Turno
    gameState.isMyTurn = (data.turn === gameState.playerRole);
    const activePlayerName = data[data.turn].name;
    document.getElementById('turn-indicator').innerText = gameState.isMyTurn ? "Sua Vez de Jogar!" : `Vez de: ${activePlayerName}`;
    document.getElementById('turn-indicator').style.color = gameState.isMyTurn ? "var(--gold-premium)" : "var(--text-muted)";

    // Guardar Mão Local
    gameState.hand = data[gameState.playerRole]?.hand || [];
    renderMyHand();

    // Renderizar contagem do adversário
    const oppRole = gameState.playerRole === 'p1' ? 'p2' : 'p1';
    const oppHandCount = data[oppRole]?.hand ? data[oppRole].hand.length : 0;
    document.getElementById('opponent-count').innerText = oppHandCount;

    // Renderizar Corrente central
    renderChain(data.chain || []);
}

// Renderizador Visual de Peça de Dominó Funcional
function createDominoElement(piece, isClickable = false) {
    const el = document.createElement('div');
    el.className = 'domino-piece';
    el.dataset.id = piece.id;

    const renderHalf = (val) => {
        const half = document.createElement('div');
        half.className = 'domino-half';
        // Mapeamento simples de posições de pontos baseado no valor
        const dotCounts = {0:0, 1:1, 2:2, 3:3, 4:4, 5:5, 6:6};
        for(let i=0; i<dotCounts[val]; i++) {
            const dot = document.createElement('div');
            dot.className = 'dot';
            half.appendChild(dot);
        }
        return half;
    };

    el.appendChild(renderHalf(piece.left));
    el.appendChild(renderHalf(piece.right));

    if (isClickable && gameState.isMyTurn) {
        el.addEventListener('click', () => handlePieceSelection(piece));
    }
    return el;
}

function renderMyHand() {
    const container = document.getElementById('my-hand');
    container.innerHTML = '';
    gameState.hand.forEach(piece => {
        container.appendChild(createDominoElement(piece, true));
    });
}

function renderChain(chain) {
    const container = document.getElementById('domino-chain');
    container.innerHTML = '';
    if(chain.length === 0) {
        container.innerHTML = `<p class="subtitle">A mesa está limpa. Inicie o jogo!</p>`;
        return;
    }

    chain.forEach(piece => {
        const dominoNode = createDominoElement(piece, false);
        dominoNode.classList.add('horizontal'); // Layout horizontal padrão na mesa
        container.appendChild(dominoNode);
    });
}

// Processamento de Regras do Jogo ao Tentar Jogar Peça
function handlePieceSelection(piece) {
    const roomRef = ref(db, 'rooms/' + gameState.roomCode);
    
    // Obter dados atuais diretamente para validação atômica local rápida
    onValue(roomRef, (snapshot) => {
        const data = snapshot.val();
        if (!data || data.turn !== gameState.playerRole) return;

        let chain = data.chain || [];
        let updatedChain = [...chain];
        let matched = false;

        if (chain.length === 0) {
            // Primeira jogada da rodada livre
            updatedChain.push(piece);
            matched = true;
        } else {
            const leftOuter = chain[0].left;
            const rightOuter = chain[chain.length - 1].right;

            // Validação das extremidades da mesa brasileira
            if (piece.left === rightOuter) {
                updatedChain.push(piece);
                matched = true;
            } else if (piece.right === rightOuter) {
                // Inverter peça para casar valor
                updatedChain.push({ left: piece.right, right: piece.left, id: piece.id });
                matched = true;
            } else if (piece.right === leftOuter) {
                updatedChain.unshift(piece);
                matched = true;
            } else if (piece.left === leftOuter) {
                // Inverter peça para casar valor na ponta esquerda
                updatedChain.unshift({ left: piece.right, right: piece.left, id: piece.id });
                matched = true;
            }
        }

        if (matched) {
            playDominoSound(440, 'triangle', 0.1);
            // Remover peça da mão do jogador
            const updatedHand = gameState.hand.filter(p => p.id !== piece.id);
            const nextTurn = gameState.playerRole === 'p1' ? 'p2' : 'p1';

            // Verificação de Vitória de Rodada (Bateu)
            if (updatedHand.length === 0) {
                alert("Você bateu a rodada!");
                // Adiciona pontos ao vencedor (Soma de pontos simplificada)
                const currentScore = data[gameState.playerRole].score + 10; 
                
                update(ref(db, 'rooms/' + gameState.roomCode), {
                    [`${gameState.playerRole}/hand`]: updatedHand,
                    'chain': updatedChain,
                    [`${gameState.playerRole}/score`]: currentScore,
                    'status': 'playing' // Próxima rodada limpa o deck
                });
                generateAndDistributePieces();
            } else {
                update(ref(db, 'rooms/' + gameState.roomCode), {
                    [`${gameState.playerRole}/hand`]: updatedHand,
                    'chain': updatedChain,
                    'turn': nextTurn
                });
            }
        } else {
            playDominoSound(150, 'sawtooth', 0.2); // Som de erro/recusa
            alert("Esta peça não se encaixa nas pontas atuais da mesa!");
        }
    }, { onlyOnce: true });
}

// Navegação entre Telas do App
function switchScreen(screenKey) {
    Object.keys(screens).forEach(key => {
        if(screens[key]) screens[key].classList.add('hidden');
    });
    screens[screenKey].classList.remove('hidden');
}
