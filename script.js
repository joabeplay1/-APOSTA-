// ==========================================================================
// IMPORTAÇÃO E CONFIGURAÇÃO DO FIREBASE
// ==========================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue, runTransaction } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ==========================================================================
// ESTADO LOCAL SEGURO DA SESSÃO
// ==========================================================================
let gameState = {
    roomCode: null,
    playerRole: null, // 'p1', 'p2', 'p3', 'p4'
    playerName: '',
    hand: [],
    isMyTurn: false,
    activePlayersCount: 2
};

// ==========================================================================
// SINTETIZADOR DE ÁUDIO NATIVO PROFISSIONAL
// ==========================================================================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playDominoSound(frequency = 300, type = 'sine', duration = 0.08) {
    try {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) { console.log("Áudio bloqueado pelo navegador."); }
}

// ==========================================================================
// MAPEAMENTO DE TELAS DA INTERFACE
// ==========================================================================
const screens = {
    loading: document.getElementById('loading-screen'),
    lobby: document.getElementById('lobby-screen'),
    waiting: document.getElementById('waiting-screen'),
    game: document.getElementById('game-screen')
};

window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => screens.loading.classList.add('hidden'), 800);
    setupButtonListeners();
});

function setupButtonListeners() {
    document.getElementById('btn-create-room').onclick = () => handleRoomCreation();
    document.getElementById('btn-join-room').onclick = () => handleRoomJoin();
    document.getElementById('btn-pass').onclick = () => handlePassTurn();
    document.getElementById('btn-draw').onclick = () => handleDrawPiece();
}

// ==========================================================================
// FUNÇÕES DE ELEMENTOS GEOMÉTRICOS E RENDERIZAÇÃO DOM
// ==========================================================================
function createDominoElement(piece, isClickable = false, isTablePiece = false) {
    const el = document.createElement('div');
    el.className = 'domino-piece';

    // SOMENTE AS PEÇAS DA MESA FICAM DEITADAS
    if (isTablePiece) {
        el.style.transform = 'rotate(90deg)';
        el.style.width = '80px';
        el.style.height = '40px';
        el.style.flexDirection = 'row';
    } 
    // PEÇAS DA MÃO CONTINUAM EM PÉ
    else {
        el.style.width = '40px';
        el.style.height = '80px';
        el.style.flexDirection = 'column';
    }

    if (!piece.playable && isClickable) {
        el.style.opacity = "0.4"; // Feedback visual sutil de peça travada
    }

    el.dataset.id = piece.id;

    const renderHalf = (val) => {
        const half = document.createElement('div');
        half.className = 'domino-half';

        // GRID DAS BOLINHAS
        half.style.display = 'grid';
        half.style.gridTemplateColumns = 'repeat(3, 1fr)';
        half.style.gridTemplateRows = 'repeat(3, 1fr)';
        half.style.width = '100%';
        half.style.height = '100%';

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
            cell.style.display = 'flex';
            cell.style.justifyContent = 'center';
            cell.style.alignItems = 'center';

            if (activeDots.includes(i)) {
                const dot = document.createElement('div');
                dot.className = 'dot';
                dot.classList.add(`dot-val-${val}`);

                // VISUAL PADRÃO DAS BOLINHAS (Caso não esteja totalmente no CSS)
                dot.style.width = '8px';
                dot.style.height = '8px';
                dot.style.borderRadius = '50%';
                dot.style.background = '#000';

                cell.appendChild(dot);
            }
            half.appendChild(cell);
        }
        return half;
    };

    el.appendChild(renderHalf(piece.left));
    el.appendChild(renderHalf(piece.right));

    // CLIQUE NAS PEÇAS DA MÃO
    if (isClickable && gameState.isMyTurn && piece.playable) {
        el.onclick = () => handlePiecePlay(piece);
        el.style.cursor = 'pointer';
    }
    return el;
}

function renderMyHand() {
    const container = document.getElementById('my-hand');
    container.innerHTML = '';
    gameState.hand.forEach(piece => {
        // FALSE = PEÇA DA MÃO (Fica em pé)
        container.appendChild(createDominoElement(piece, true, false));
    });
}

function renderChain(chain) {
    const container = document.getElementById('domino-chain');
    container.innerHTML = '';

    if (chain.length === 0) {
        container.innerHTML = `<p class="subtitle">A mesa está limpa. Inicie o jogo!</p>`;
        return;
    }

    chain.forEach(piece => {
        // TRUE = PEÇA DA MESA (Fica deitada)
        const dominoNode = createDominoElement(piece, false, true);
        dominoNode.classList.add('horizontal');
        dominoNode.style.margin = '6px';
        container.appendChild(dominoNode);
    });
}

// ==========================================================================
// GERENCIAMENTO DE SALAS (LOBBY & WAIT)
// ==========================================================================
function handleRoomCreation() {
    const name = document.getElementById('player-name').value.trim();
    if (!name) return alert('Por favor, digite seu nome primeiro!');
    
    gameState.playerName = name;
    gameState.playerRole = 'p1';
    gameState.roomCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    const roomRef = ref(db, 'rooms/' + gameState.roomCode);
    const initialData = {
        status: 'waiting',
        playersOrder: ['p1'],
        p1: { name: name, score: 0, hand: [] },
        chain: [],
        deck: [],
        turn: 'p1',
        blockCount: 0
    };
    
    set(roomRef, initialData).then(() => {
        document.getElementById('generated-code').innerText = gameState.roomCode;
        switchScreen('waiting');
        listenToRoomChanges();
    });
}

function handleRoomJoin() {
    const name = document.getElementById('player-name').value.trim();
    const code = document.getElementById('room-code-input').value.trim();
    if (!name || !code) return alert('Preencha seu nome e o código da mesa!');
    
    gameState.playerName = name;
    gameState.roomCode = code;
    
    const roomRef = ref(db, 'rooms/' + code);
    
    runTransaction(roomRef, (currentData) => {
        if (!currentData) return currentData;
        if (currentData.status === 'playing') return; 
        
        const order = currentData.playersOrder || [];
        const nextIndex = order.length + 1;
        
        if (nextIndex > 4) return; 
        
        const newRole = 'p' + nextIndex;
        gameState.playerRole = newRole;
        
        order.push(newRole);
        currentData.playersOrder = order;
        currentData[newRole] = { name: name, score: 0, hand: [] };
        
        currentData.status = 'playing'; 
        
        return currentData;
    }).then((result) => {
        if (result.committed) {
            listenToRoomChanges();
        } else {
            alert('Não foi possível entrar na sala. Mesa cheia ou inexistente.');
        }
    });
}

// ==========================================================================
// ESCUTADOR CENTRAL DE SINCRONIZAÇÃO EM TEMPO REAL (ANTI-TRAVAMENTO)
// ==========================================================================
function listenToRoomChanges() {
    const roomRef = ref(db, 'rooms/' + gameState.roomCode);
    onValue(roomRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        if (data.status === 'playing') {
            gameState.activePlayersCount = data.playersOrder.length;
            
            if (screens.game.classList.contains('hidden')) {
                switchScreen('game');
                document.getElementById('game-room-id').innerText = `#${gameState.roomCode}`;
                
                if (gameState.playerRole === 'p1' && (!data.chain && (!data.p1.hand || data.p1.hand.length === 0))) {
                    executeDistributionTransaction();
                    return;
                }
            }
            updateGameTable(data);
        }
    });
}

function executeDistributionTransaction() {
    const roomRef = ref(db, 'rooms/' + gameState.roomCode);
    runTransaction(roomRef, (room) => {
        if (!room) return room;
        
        let pool = [];
        for (let i = 0; i <= 6; i++) {
            for (let j = i; j <= 6; j++) {
                pool.push({ left: i, right: j, id: `d-${i}-${j}` });
            }
        }
        
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }

        const count = room.playersOrder.length;
        room.p1.hand = pool.slice(0, 7);
        room.p2.hand = pool.slice(7, 14);
        if (count >= 3) room.p3.hand = pool.slice(14, 21);
        if (count === 4) room.p4.hand = pool.slice(21, 28);
        
        room.deck = (count < 4) ? pool.slice(count * 7) : [];
        room.chain = [];
        room.blockCount = 0;

        let starter = 'p1';
        room.playersOrder.forEach(role => {
            if (room[role] && room[role].hand) {
                const hasBucha6 = room[role].hand.some(p => p.left === 6 && p.right === 6);
                if (hasBucha6) starter = role;
            }
        });
        
        room.turn = starter;
        return room;
    });
}

// ==========================================================================
// SISTEMA DE TURNOS E ATUALIZAÇÃO DA INTERFACE DA MESA
// ==========================================================================
function updateGameTable(data) {
    document.getElementById('score-p1-name').innerText = data.p1?.name || "...";
    document.getElementById('score-p2-name').innerText = data.p2?.name || "...";
    document.getElementById('score-p1-val').innerText = String(data.p1?.score || 0).padStart(2, '0');
    document.getElementById('score-p2-val').innerText = String(data.p2?.score || 0).padStart(2, '0');

    gameState.isMyTurn = (data.turn === gameState.playerRole);
    const activePlayerName = data[data.turn] ? data[data.turn].name : '...';
    document.getElementById('turn-indicator').innerText = gameState.isMyTurn ? "Sua Vez de Jogar!" : `Vez de: ${activePlayerName}`;
    document.getElementById('turn-indicator').style.color = gameState.isMyTurn ? "var(--gold-premium)" : "var(--text-muted)";

    gameState.hand = data[gameState.playerRole]?.hand || [];
    
    const chain = data.chain || [];
    let leftOuter = null;
    let rightOuter = null;
    if (chain.length > 0) {
        leftOuter = chain[0].left;
        rightOuter = chain[chain.length - 1].right;
    }

    let hasValidMove = false;
    gameState.hand.forEach(piece => {
        if (chain.length === 0 || piece.left === leftOuter || piece.right === leftOuter || piece.left === rightOuter || piece.right === rightOuter) {
            piece.playable = true;
            hasValidMove = true;
        } else {
            piece.playable = false;
        }
    });

    renderMyHand();

    const oppRole = gameState.playerRole === 'p1' ? 'p2' : 'p1';
    const oppHandCount = data[oppRole]?.hand ? data[oppRole].hand.length : 0;
    document.getElementById('opponent-count').innerText = oppHandCount;

    const btnDraw = document.getElementById('btn-draw');
    const btnPass = document.getElementById('btn-pass');
    
    if (gameState.isMyTurn) {
        if (hasValidMove) {
            btnDraw.classList.add('hidden');
            btnPass.classList.add('hidden');
        } else {
            if (data.deck && data.deck.length > 0) {
                btnDraw.classList.remove('hidden');
                btnPass.classList.add('hidden');
            } else {
                btnDraw.classList.add('hidden');
                btnPass.classList.remove('hidden');
            }
        }
    } else {
        btnDraw.classList.add('hidden');
        btnPass.classList.add('hidden');
    }

    renderChain(chain);
}

// ==========================================================================
// TRANSAÇÕES ATÔMICAS DE JOGADAS
// ==========================================================================
function handlePiecePlay(piece) {
    if (!gameState.isMyTurn) return;
    const roomRef = ref(db, 'rooms/' + gameState.roomCode);

    runTransaction(roomRef, (room) => {
        if (!room || room.turn !== gameState.playerRole) return room;

        let chain = room.chain || [];
        let matched = false;
        let newChain = [...chain];

        if (chain.length === 0) {
            newChain.push(piece);
            matched = true;
        } else {
            const leftOuter = chain[0].left;
            const rightOuter = chain[chain.length - 1].right;

            if (piece.left === rightOuter) {
                newChain.push(piece);
                matched = true;
            } else if (piece.right === rightOuter) {
                newChain.push({ left: piece.right, right: piece.left, id: piece.id });
                matched = true;
            } else if (piece.right === leftOuter) {
                newChain.unshift(piece);
                matched = true;
            } else if (piece.left === leftOuter) {
                newChain.unshift({ left: piece.right, right: piece.left, id: piece.id });
                matched = true;
            }
        }

        if (matched) {
            const serverHand = room[gameState.playerRole].hand || [];
            room[gameState.playerRole].hand = serverHand.filter(p => p.id !== piece.id);
            room.chain = newChain;
            room.blockCount = 0;

            if (room[gameState.playerRole].hand.length === 0) {
                room[gameState.playerRole].score = (room[gameState.playerRole].score || 0) + 10;
                alert("Você bateu a rodada! +10 Pontos.");
                return resetRoundData(room);
            }

            room.turn = getNextPlayerRole(room.playersOrder, room.turn);
        }
        return room;
    }).then((result) => {
        if (result.committed) playDominoSound(440, 'triangle', 0.1);
    });
}

function handleDrawPiece() {
    if (!gameState.isMyTurn) return;
    const roomRef = ref(db, 'rooms/' + gameState.roomCode);

    runTransaction(roomRef, (room) => {
        if (!room || room.turn !== gameState.playerRole || !room.deck || room.deck.length === 0) return room;
        
        const nextPiece = room.deck.shift();
        if (!room[gameState.playerRole].hand) room[gameState.playerRole].hand = [];
        room[gameState.playerRole].hand.push(nextPiece);
        
        return room;
    }).then((result) => {
        if (result.committed) playDominoSound(300, 'sine', 0.05);
    });
}

function handlePassTurn() {
    if (!gameState.isMyTurn) return;
    const roomRef = ref(db, 'rooms/' + gameState.roomCode);

    runTransaction(roomRef, (room) => {
        if (!room || room.turn !== gameState.playerRole) return room;

        room.blockCount = (room.blockCount || 0) + 1;
        
        if (room.blockCount >= room.playersOrder.length) {
            return handleGameBlockEnding(room);
        }

        room.turn = getNextPlayerRole(room.playersOrder, room.turn);
        return room;
    }).then((result) => {
        if (result.committed) playDominoSound(200, 'sawtooth', 0.15);
    });
}

// ==========================================================================
// REGRAS ACESSÓRIAS: FECHAMENTO DE MESA (MASTRO) E REINÍCIO DE RODADAS
// ==========================================================================
function handleGameBlockEnding(room) {
    alert("O jogo fechou (Mastro)! Contando pontos das mãos...");
    let winnerRole = room.playersOrder[0];
    let minPoints = 999;

    room.playersOrder.forEach(role => {
        let currentPoints = 0;
        const hand = room[role].hand || [];
        hand.forEach(p => currentPoints += (p.left + p.right));
        
        if (currentPoints < minPoints) {
            minPoints = currentPoints;
            winnerRole = role;
        }
    });

    room[winnerRole].score = (room[winnerRole].score || 0) + 10;
    alert(`O jogador ${room[winnerRole].name} tinha menos pontos na mão e venceu a rodada!`);
    return resetRoundData(room);
}

function resetRoundData(room) {
    let pool = [];
    for (let i = 0; i <= 6; i++) {
        for (let j = i; j <= 6; j++) {
            pool.push({ left: i, right: j, id: `d-${i}-${j}` });
        }
    }
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const count = room.playersOrder.length;
    room.p1.hand = pool.slice(0, 7);
    room.p2.hand = pool.slice(7, 14);
    if (count >= 3) room.p3.hand = pool.slice(14, 21);
    if (count === 4) room.p4.hand = pool.slice(21, 28);
    
    room.deck = (count < 4) ? pool.slice(count * 7) : [];
    room.chain = [];
    room.blockCount = 0;
    room.turn = 'p1';

    return room;
}

function getNextPlayerRole(order, currentTurn) {
    const currentIndex = order.indexOf(currentTurn);
    const nextIndex = (currentIndex + 1) % order.length;
    return order[nextIndex];
}

function switchScreen(screenKey) {
    Object.keys(screens).forEach(key => {
        if (screens[key]) screens[key].classList.add('hidden');
    });
    screens[screenKey].classList.remove('hidden');
}
