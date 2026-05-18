import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue, runTransaction } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Configuração oficial do Firebase (Mantida intacta)
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

// Estado Local Seguro da Sessão
let gameState = {
    roomCode: null,
    playerRole: null, // 'p1', 'p2', 'p3', 'p4'
    playerName: '',
    hand: [],
    isMyTurn: false,
    activePlayersCount: 2
};

// Sintetizador de Áudio Nativo Profissional
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

// Mapeamento de Telas da Interface (Preservado)
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

// Inicialização segura dos eventos de clique para evitar chamadas duplas
function setupButtonListeners() {
    document.getElementById('btn-create-room').onclick = () => handleRoomCreation();
    document.getElementById('btn-join-room').onclick = () => handleRoomJoin();
    document.getElementById('btn-pass').onclick = () => handlePassTurn();
    document.getElementById('btn-draw').onclick = () => handleDrawPiece();
}

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
        if (currentData.status === 'playing') return; // Sala cheia ou em andamento
        
        const order = currentData.playersOrder || [];
        const nextIndex = order.length + 1;
        
        if (nextIndex > 4) return; // Limite máximo de 4 jogadores atingido
        
        const newRole = 'p' + nextIndex;
        gameState.playerRole = newRole;
        
        order.push(newRole);
        currentData.playersOrder = order;
        currentData[newRole] = { name: name, score: 0, hand: [] };
        
        // O jogo pode iniciar com 2, 3 ou 4 jogadores. O P1 gerencia o início de dentro do painel de espera
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
                
                // Distribuição primária controlada atómicamente pelo Criador da Mesa (P1)
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
        
        // Geração completa das 28 peças oficiais [Duplo-6]
        let pool = [];
        for (let i = 0; i <= 6; i++) {
            for (let j = i; j <= 6; j++) {
                pool.push({ left: i, right: j, id: `d-${i}-${j}` });
            }
        }
        
        // Embaralhar (Fisher-Yates profissional)
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }

        const count = room.playersOrder.length;
        // Regra de distribuição: 4 jogadores = 7 peças cada (deck zera). 2 jogadores = 7 peças cada (14 no deck).
        room.p1.hand = pool.slice(0, 7);
        room.p2.hand = pool.slice(7, 14);
        if (count >= 3) room.p3.hand = pool.slice(14, 21);
        if (count === 4) room.p4.hand = pool.slice(21, 28);
        
        room.deck = (count < 4) ? pool.slice(count * 7) : [];
        room.chain = [];
        room.blockCount = 0;

        // Regra Oficial de Saída Brasileira: Quem tem a bucha de 6 [6-6] inicia a partida
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
// SISTEMA DE TURNOS, VALIDAÇÃO DE JOGADAS E FLUXO DA MESA
// ==========================================================================
function updateGameTable(data) {
    // Sincronização dinâmica de nomes e placares dinâmicos baseado na quantidade de players conectados
    document.getElementById('score-p1-name').innerText = data.p1?.name || "...";
    document.getElementById('score-p2-name').innerText = data.p2?.name || "...";
    document.getElementById('score-p1-val').innerText = String(data.p1?.score || 0).padStart(2, '0');
    document.getElementById('score-p2-val').innerText = String(data.p2?.score || 0).padStart(2, '0');

    // Validação de Turno Local estrita
    gameState.isMyTurn = (data.turn === gameState.playerRole);
    const activePlayerName = data[data.turn] ? data[data.turn].name : '...';
    document.getElementById('turn-indicator').innerText = gameState.isMyTurn ? "Sua Vez de Jogar!" : `Vez de: ${activePlayerName}`;
    document.getElementById('turn-indicator').style.color = gameState.isMyTurn ? "var(--gold-premium)" : "var(--text-muted)";

    // Atualiza Mão do Cliente Local
    gameState.hand = data[gameState.playerRole]?.hand || [];
    
    // Cálculo de Peças Disponíveis nas Extremidades da Mesa
    const chain = data.chain || [];
    let leftOuter = null;
    let rightOuter = null;
    if (chain.length > 0) {
        leftOuter = chain[0].left;
        rightOuter = chain[chain.length - 1].right;
    }

    // Varre a mão do jogador para analisar se ele possui movimentos válidos reais
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

    // Sincronização de Painéis de Interface (Oponentes)
    const oppRole = gameState.playerRole === 'p1' ? 'p2' : 'p1';
    const oppHandCount = data[oppRole]?.hand ? data[oppRole].hand.length : 0;
    document.getElementById('opponent-count').innerText = oppHandCount;

    // Gerenciador de Exibição dos Botões de Ação para evitar travamento de jogo preso
    const btnDraw = document.getElementById('btn-draw');
    const btnPass = document.getElementById('btn-pass');
    
    if (gameState.isMyTurn) {
        if (hasValidMove) {
            btnDraw.classList.add('hidden');
            btnPass.classList.add('hidden');
        } else {
            // Se não tem peça e o deck possui elementos, obriga a "Comprar"
            if (data.deck && data.deck.length > 0) {
                btnDraw.classList.remove('hidden');
                btnPass.classList.add('hidden');
            } else {
                // Se o deck esgotou, libera o botão de "Passar Vez" instantaneamente
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

// Renderizador Geométrico de Células Inalterado
function createDominoElement(piece, isClickable = false) {
    const el = document.createElement('div');
    el.className = 'domino-piece';
    if (!piece.playable && isClickable) el.style.opacity = "0.4"; // Feedback visual sutil de peça travada
    el.dataset.id = piece.id;

    const renderHalf = (val) => {
        const half = document.createElement('div');
        half.className = 'domino-half';
        const dotPositions = {
            0: [], 1: [4], 2: [0, 8], 3: [0, 4, 8],
            4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8]
        };
        const activeDots = dotPositions[val] || [];
        for (let i = 0; i < 9; i++) {
            const cell = document.createElement('div');
            cell.style.width = '100%'; cell.style.height = '100%';
            cell.style.display = 'flex'; cell.style.justifyContent = 'center'; cell.style.alignItems = 'center';
            if (activeDots.includes(i)) {
                const dot = document.createElement('div');
                dot.className = 'dot';
                dot.classList.add(`dot-val-${val}`);
                cell.appendChild(dot);
            }
            half.appendChild(cell);
        }
        return half;
    };

    el.appendChild(renderHalf(piece.left));
    el.appendChild(renderHalf(piece.right));

    if (isClickable && gameState.isMyTurn && piece.playable) {
        el.onclick = () => handlePiecePlay(piece);
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
    if (chain.length === 0) {
        container.innerHTML = `<p class="subtitle">A mesa está limpa. Inicie o jogo!</p>`;
        return;
    }
    chain.forEach(piece => {
        const dominoNode = createDominoElement(piece, false);
        dominoNode.classList.add('horizontal');
        container.appendChild(dominoNode);
    });
}

// ==========================================================================
// TRANSAÇÕES ATÔMICAS DE JOGADAS (ANTI-DUPLICAÇÃO E ERRO DE CONCORRÊNCIA)
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
            // Remove peça da mão de forma atômica no servidor
            const serverHand = room[gameState.playerRole].hand || [];
            room[gameState.playerRole].hand = serverHand.filter(p => p.id !== piece.id);
            room.chain = newChain;
            room.blockCount = 0; // Zera contagem de passes consecutivos

            // Regra de Vitória da Rodada (Bateu)
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
        
        // Se a contagem de passes consecutivos atingir o número de jogadores, o jogo fechou (Mastro)
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
    // Nova distribuição limpa mantendo os placares acumulados estáveis
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
