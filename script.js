import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Configuração oficial do seu Firebase integrada de forma nativa
const firebaseConfig = {
    apiKey: "AIzaSyCZ4rOliexofYP8vyRLzUeX3mf5uXG6WRM",
    authDomain: "aposta-96213.firebaseapp.com",
    databaseURL: "https://aposta-96213-default-rtdb.firebaseio.com",
    projectId: "aposta-96213",
    storageBucket: "aposta-96213.firebasestorage.app",
    messagingSenderId: "989060185373",
    appId: "1:989060185373:web:69bb80b2f961fe8e9d35f4",
    measurementId: "G-1LTXVCXHX5"
};

// Inicialização das instâncias
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Estado Local da Sessão do Navegador
let gameState = {
    roomCode: null,
    playerRole: null, 
    playerName: '',
    hand: [],
    isMyTurn: false
};

// Sintetizador de Áudio Nativo (Web Audio API)
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
    } catch (e) { console.log("Aguardando interação inicial para liberar o áudio."); }
}

// Mapeamento de Telas da Interface
const screens = {
    loading: document.getElementById('loading-screen'),
    lobby: document.getElementById('lobby-screen'),
    waiting: document.getElementById('waiting-screen'),
    game: document.getElementById('game-screen')
};

// Fechamento automático da tela de carregamento
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => screens.loading.classList.add('hidden'), 1000);
});

// Ações dos Botões Principais do Lobby
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

// P1 - Inicializa a estrutura da sala no Firebase
function setupRoomOnFirebase() {
    const roomRef = ref(db, 'rooms/' + gameState.roomCode);
    const initialData = {
        status: 'waiting',
        p1: { name: gameState.playerName, score: 0 },
        p2: { name: '', score: 0 },
        chain: [],
        deck: [],
        turn: 'p1'
    };
    
    set(roomRef, initialData).then(() => {
        document.getElementById('generated-code').innerText = gameState.roomCode;
        switchScreen('waiting');
        listenToRoomChanges();
    });
}

// P2 - Vincula o nome do segundo jogador e aguarda a distribuição do P1
function joinRoomOnFirebase() {
    const roomRef = ref(db, 'rooms/' + gameState.roomCode);
    update(roomRef, {
        'p2/name': gameState.playerName,
        'status': 'playing' // Ativa o gatilho para o P1 rodar a distribuição das peças de ambos
    }).then(() => {
        listenToRoomChanges();
    }).catch(() => alert('Erro ao conectar. Código inválido.'));
}

// ==========================================================================
// MONITOR DE ESTADO DA MESA EM TEMPO REAL (SEM CONCORRÊNCIA DE TELA VAZIA)
// ==========================================================================
function listenToRoomChanges() {
    const roomRef = ref(db, 'rooms/' + gameState.roomCode);
    onValue(roomRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        if (data.status === 'playing') {
            if (screens.game.classList.contains('hidden')) {
                switchScreen('game');
                document.getElementById('game-room-id').innerText = `#${gameState.roomCode}`;
                
                // Controle Atômico: Apenas o criador (P1) monta as mãos de uma vez só no servidor
                if (gameState.playerRole === 'p1' && (!data.deck || data.deck.length === 0) && (!data.p1.hand)) {
                    generateAndDistributePieces();
                    return;
                }
            }
            // Sincroniza e redesenha a tela de ambos os lados simultaneamente
            updateGameTable(data);
        }
    });
}

// Embaralhador Profissional Brasileiro com Verificação de Bucha de Seis [6-6]
function generateAndDistributePieces() {
    let pool = [];
    for (let i = 0; i <= 6; i++) {
        for (let j = i; j <= 6; j++) {
            pool.push({ left: i, right: j, id: `d-${i}-${j}` });
        }
    }
    
    // Algoritmo Fisher-Yates
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const p1Hand = pool.slice(0, 7);
    const p2Hand = pool.slice(7, 14);
    const remainingDeck = pool.slice(14);

    // Regra Oficial de saída: Quem tem o duque de seis começa jogando
    let firstTurn = 'p1';
    const p2HasBucha6 = p2Hand.some(p => p.left === 6 && p.right === 6);
    if (p2HasBucha6) firstTurn = 'p2';

    // Atualiza a árvore do Firebase unificada. O evento onValue se encarrega de dar o refresh nas duas telas
    update(ref(db, 'rooms/' + gameState.roomCode), {
        'p1/hand': p1Hand,
        'p2/hand': p2Hand,
        'deck': remainingDeck,
        'turn': firstTurn
    });
}

// Atualização Visual Dinâmica de Componentes e Contadores
function updateGameTable(data) {
    // Altera nomes do painel e placares
    document.getElementById('score-p1-name').innerText = data.p1.name || "Aguardando...";
    document.getElementById('score-p2-name').innerText = data.p2.name || "Aguardando...";
    document.getElementById('score-p1-val').innerText = String(data.p1.score).padStart(2, '0');
    document.getElementById('score-p2-val').innerText = String(data.p2.score).padStart(2, '0');

    // Validação de Turno Local
    gameState.isMyTurn = (data.turn === gameState.playerRole);
    const activePlayerName = data[data.turn] ? data[data.turn].name : '...';
    document.getElementById('turn-indicator').innerText = gameState.isMyTurn ? "Sua Vez de Jogar!" : `Vez de: ${activePlayerName}`;
    document.getElementById('turn-indicator').style.color = gameState.isMyTurn ? "var(--gold-premium)" : "var(--text-muted)";

    // Renderização das peças que pertencem à sua mão
    gameState.hand = data[gameState.playerRole]?.hand || [];
    renderMyHand();

    // Sincroniza a quantidade real de peças ocultas do adversário
    const oppRole = gameState.playerRole === 'p1' ? 'p2' : 'p1';
    const oppHandCount = data[oppRole]?.hand ? data[oppRole].hand.length : 0;
    document.getElementById('opponent-count').innerText = oppHandCount;

    // Atualiza a linha central de dominós jogados
    renderChain(data.chain || []);
}

// ==========================================================================
// RENDERIZADOR DE PONTOS COLORIDOS EM EMULAÇÃO GRID 3X3 PROFISSIONAL
// ==========================================================================
function createDominoElement(piece, isClickable = false) {
    const el = document.createElement('div');
    el.className = 'domino-piece';
    el.dataset.id = piece.id;

    const renderHalf = (val) => {
        const half = document.createElement('div');
        half.className = 'domino-half';
        
        // Posições geométricas exatas para as bolinhas não ficarem espalhadas ou bagunçadas
        const dotPositions = {
            0: [],
            1: [4],
            2: [0, 8],
            3: [0, 4, 8],
            4: [0, 2, 6, 8],
            5: [0, 2, 4, 6, 8],
            6: [0, 2, 3, 5, 6, 8]
        };

        const activeDots = dotPositions[val] || [];
        
        for (let i = 0; i < 9; i++) {
            const cell = document.createElement('div');
            cell.style.width = '100%';
            cell.style.height = '100%';
            cell.style.display = 'flex';
            cell.style.justifyContent = 'center';
            cell.style.alignItems = 'center';
            
            if (activeDots.includes(i)) {
                const dot = document.createElement('div');
                dot.className = 'dot';
                
                // Injeta a classe correspondente à cor configurada no seu arquivo style.css
                dot.classList.add(`dot-val-${val}`); 
                
                cell.appendChild(dot);
            }
            half.appendChild(cell);
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
        dominoNode.classList.add('horizontal');
        container.appendChild(dominoNode);
    });
}

// Mecanismo de Validação de Pontas Abertas do Dominó do Brasil
function handlePieceSelection(piece) {
    const roomRef = ref(db, 'rooms/' + gameState.roomCode);
    
    onValue(roomRef, (snapshot) => {
        const data = snapshot.val();
        if (!data || data.turn !== gameState.playerRole) return;

        let chain = data.chain || [];
        let updatedChain = [...chain];
        let matched = false;

        if (chain.length === 0) {
            updatedChain.push(piece);
            matched = true;
        } else {
            const leftOuter = chain[0].left;
            const rightOuter = chain[chain.length - 1].right;

            // Validação das extremidades direita e esquerda da mesa
            if (piece.left === rightOuter) {
                updatedChain.push(piece);
                matched = true;
            } else if (piece.right === rightOuter) {
                updatedChain.push({ left: piece.right, right: piece.left, id: piece.id });
                matched = true;
            } else if (piece.right === leftOuter) {
                updatedChain.unshift(piece);
                matched = true;
            } else if (piece.left === leftOuter) {
                updatedChain.unshift({ left: piece.right, right: piece.left, id: piece.id });
                matched = true;
            }
        }

        if (matched) {
            playDominoSound(440, 'triangle', 0.1);
            const updatedHand = gameState.hand.filter(p => p.id !== piece.id);
            const nextTurn = gameState.playerRole === 'p1' ? 'p2' : 'p1';

            // Verificação de Fim de Partida/Rodada (Bateu)
            if (updatedHand.length === 0) {
                alert("Você bateu a rodada!");
                const currentScore = (data[gameState.playerRole].score || 0) + 10; 
                
                update(ref(db, 'rooms/' + gameState.roomCode), {
                    [`${gameState.playerRole}/hand`]: updatedHand,
                    'chain': updatedChain,
                    [`${gameState.playerRole}/score`]: currentScore
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
            playDominoSound(150, 'sawtooth', 0.2);
            alert("Esta peça não cabe nas pontas atuais da mesa!");
        }
    }, { onlyOnce: true });
}

// Manipulador de Fluxo de Telas
function switchScreen(screenKey) {
    Object.keys(screens).forEach(key => {
        if(screens[key]) screens[key].classList.add('hidden');
    });
    screens[screenKey].classList.remove('hidden');
}
