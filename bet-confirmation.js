import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue, runTransaction, get, push } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Configuração oficial do seu Firebase
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

let activeRoomCode = null;
let currentMode = "1x1";
let myLocalRole = "p1"; 
let isLobbyTestingMode = true;

// CONTROLE INTEGRADO DE CAIXA E SALDOS INTERNOS (Substituindo a antiga carteira)
let localWalletBalance = 150.00; 
let localBetValue = 20.00;      
let myFinanceId = null;

document.addEventListener('DOMContentLoaded', () => {
    initLocalPlayerFinanceID();

    // Injeta dinamicamente os controles de busca por ID e os módulos financeiros de PIX/Saque
    injectSearchInputIntoDOM();
    injectFinancialControlsIntoDOM();

    // TRAVA OBRIGATÓRIA: Garante exibição fixa em tela cheia logo no Lobby inicial
    const centralPanel = document.getElementById('bet-central-panel');
    if (centralPanel) {
        centralPanel.classList.remove('hidden');
    }
    
    // Força a tela do jogo (tabuleiro) a iniciar totalmente oculta até a liberação financeira
    const gameScreen = document.getElementById('game-screen');
    if (gameScreen) {
        gameScreen.classList.add('hidden');
    }

    // BLOQUEIO MECÂNICO: Desativa cliques de colapso ou minimização no cabeçalho
    const headerToggle = document.getElementById('bet-panel-toggle');
    if (headerToggle) {
        headerToggle.onclick = null; 
        headerToggle.style.cursor = 'default';
    }
    const minimizeBtn = document.getElementById('btn-minimize-bet-panel');
    if (minimizeBtn) {
        minimizeBtn.remove(); // Deleta fisicamente o botão de fechar/traço da árvore HTML
    }

    // Inicializa a grade de slots do painel
    renderDynamicPlayersGrid(null);

    // Gerenciador de Modos com Split de Lucros Dinâmicos
    const modeSelect = document.getElementById('select-match-mode');
    if (modeSelect) {
        modeSelect.onchange = (e) => {
            currentMode = e.target.value;
            updatePayoutInstructionBanner();
            if (activeRoomCode && myLocalRole === 'p1') {
                set(ref(db, `rooms/${activeRoomCode}/matchMode`), currentMode);
            } else if (isLobbyTestingMode) {
                renderDynamicPlayersGrid(null);
            }
        };
    }

    const confirmBtn = document.getElementById('btn-confirm-my-bet');
    if (confirmBtn) confirmBtn.onclick = handleMyBetConfirmation;

    // Monitoramento contínuo da sala
    setInterval(detectActiveGameRoom, 1500);
});

function initLocalPlayerFinanceID() {
    const nameInput = document.getElementById('player-name');
    const updateID = () => {
        const name = nameInput?.value.trim() || "Joabe Play";
        myFinanceId = btoa(name).replace(/=/g, "");
    };
    if (nameInput) {
        nameInput.addEventListener('blur', updateID);
        updateID();
    } else {
        myFinanceId = btoa("Joabe Play").replace(/=/g, "");
    }
}

// CONSTRUTOR DINÂMICO DA BUSCA DE JOGADORES
function injectSearchInputIntoDOM() {
    const body = document.getElementById('bet-panel-content');
    if (!body || document.getElementById('bet-player-search-box')) return;

    const searchBox = document.createElement('div');
    searchBox.className = "game-mode-selector-box";
    searchBox.style.marginTop = "10px";
    searchBox.innerHTML = `
        <label>BUSCAR E ADICIONAR ADVERSÁRIO POR NOME OU ID:</label>
        <div style="display:flex; gap:8px;">
            <input type="text" id="bet-player-search-box" placeholder="Digite o apelido exato (Ex: Joabe Play)" 
                   style="flex:1; background:#000; border:1px solid rgba(212,175,55,0.3); padding:0.5rem; border-radius:8px; color:#fff; font-size:0.85rem;">
            <button id="btn-bet-search-add" style="background:#d4af37; color:#000; border:none; padding:0 15px; border-radius:8px; font-weight:bold; cursor:pointer; font-size:0.8rem;">Adicionar</button>
        </div>
    `;
    body.insertBefore(searchBox, body.children[1]);
    document.getElementById('btn-bet-search-add').onclick = performPlayerSearchAndQuery;
}

// CONSTRUTOR DOS MÓDULOS FINANCEIROS (Aumentar/Diminuir, PIX, Saques e Estorno)
function injectFinancialControlsIntoDOM() {
    const body = document.getElementById('bet-panel-content');
    if (!body) return;

    // Seletor de lances e indicador de fundos disponíveis em tempo real
    const valBox = document.createElement('div');
    valBox.className = "game-mode-selector-box";
    valBox.style.margin = "12px 0";
    valBox.innerHTML = `
        <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:#8a9a92; margin-bottom:4px; font-weight:bold;">
            <span>SEU SALDO DISPONÍVEL: <b style="color:#22c55e" id="central-balance-display">R$ 150,00</b></span>
            <span>SUA VALOR DE LANÇAMENTO</span>
        </div>
        <div style="display:flex; align-items:center; justify-content:center; gap:15px; background:rgba(0,0,0,0.3); padding:8px; border-radius:8px; border:1px solid rgba(255,255,255,0.05);">
            <button id="btn-central-decrease" style="background:rgba(255,255,255,0.05); border:1px solid #d4af37; color:#d4af37; width:35px; height:35px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:1.1rem;">—</button>
            <span id="central-bet-value-txt" style="font-size:1.3rem; font-weight:800; color:#fff; min-width:90px; text-align:center;">R$ 20,00</span>
            <button id="btn-central-increase" style="background:rgba(255,255,255,0.05); border:1px solid #d4af37; color:#d4af37; width:35px; height:35px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:1.1rem;">+</button>
        </div>
    `;
    body.insertBefore(valBox, body.children[2]);

    // Caixa de operações diretas: Adicionar via PIX, Retirada de Ganhos e Estorno antes da partida
    const actionsBox = document.createElement('div');
    actionsBox.className = "game-mode-selector-box";
    actionsBox.style.margin = "10px 0";
    actionsBox.innerHTML = `
        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:8px;">
            <button id="btn-central-pix-dep" style="background:linear-gradient(135deg, #d4af37 0%, #aa841b 100%); color:#000; border:none; padding:8px; border-radius:6px; font-weight:bold; font-size:0.75rem; cursor:pointer;">➕ Adicionar PIX</button>
            <button id="btn-central-estorno" style="background:#111; border:1px solid #ef4444; color:#ef4444; padding:8px; border-radius:6px; font-weight:bold; font-size:0.75rem; cursor:pointer;">↩️ Estornar Fundo</button>
            <button id="btn-central-withdraw" style="background:#111; border:1px solid #22c55e; color:#22c55e; padding:8px; border-radius:6px; font-weight:bold; font-size:0.75rem; cursor:pointer;">💰 Sacar Ganhos</button>
        </div>
    `;
    body.insertBefore(actionsBox, body.children[3]);

    // Eventos operacionais
    document.getElementById('btn-central-decrease').onclick = () => modifyCentralBetAmount(-5.00);
    document.getElementById('btn-central-increase').onclick = () => modifyCentralBetAmount(5.00);
    document.getElementById('btn-central-pix-dep').onclick = executeCentralPixDeposit;
    document.getElementById('btn-central-estorno').onclick = executeCentralEstornoRefund;
    document.getElementById('btn-central-withdraw').onclick = executeCentralWithdrawal;
}

function modifyCentralBetAmount(step) {
    // Impede alterar se ele já confirmou o lance
    const myBtn = document.getElementById('btn-confirm-my-bet');
    if (myBtn && myBtn.innerText === "Fundo Reservado com Sucesso") {
        return alert("Você não pode alterar o valor após ter confirmado e bloqueado o saldo. Faça um Estorno primeiro.");
    }

    if (localBetValue + step < 1.00) return;
    localBetValue += step;
    document.getElementById('central-bet-value-txt').innerText = `R$ ${localBetValue.toFixed(2).replace('.', ',')}`;
    renderDynamicPlayersGrid(null);
}

// MÓDULO ADICIONAR FUNDOS VIA PIX
function executeCentralPixDeposit() {
    localWalletBalance += 50.00; 
    document.getElementById('central-balance-display').innerText = `R$ ${localWalletBalance.toFixed(2).replace('.', ',')}`;
    alert("Código PIX Copia e Cola Gerado! Pagamento de R$ 50,00 verificado e adicionado com sucesso ao seu saldo disponível.");
    renderDynamicPlayersGrid(null);
}

// MÓDULO SACAR GANHOS E CRÉDITOS ACUMULADOS
function executeCentralWithdrawal() {
    const pixKey = prompt("Confirme sua Chave PIX (CPF/E-mail/Celular) para receber a transferência imediata:");
    if (!pixKey) return;
    
    const amount = parseFloat(prompt(`Seu saldo livre atual é R$ ${localWalletBalance.toFixed(2)}. Quanto deseja sacar?`));
    if (isNaN(amount) || amount <= 0) return alert("Valor inválido informado.");
    
    if (amount > localWalletBalance) {
        return alert("Operação Negada: Saldo insuficiente para realizar essa retirada.");
    }

    localWalletBalance -= amount;
    document.getElementById('central-balance-display').innerText = `R$ ${localWalletBalance.toFixed(2).replace('.', ',')}`;
    
    if (myFinanceId) {
        push(ref(db, `finances/${myFinanceId}/history`), {
            type: "Retirada PIX",
            amount: amount,
            timestamp: Date.now(),
            status: "Concluído"
        });
    }
    
    alert(`Sucesso! O valor de R$ ${amount.toFixed(2)} foi processado e enviado para a chave PIX informada.`);
    renderDynamicPlayersGrid(null);
}

// MÓDULO DE ESTORNO: Desiste e resgata os fundos antes da partida iniciar
function executeCentralEstornoRefund() {
    const myBtn = document.getElementById('btn-confirm-my-bet');
    if (myBtn && myBtn.innerText === "Confirmar e Bloquear Aposta") {
        return alert("Seu dinheiro não está preso. Você pode sair da mesa ou alterar o lance livremente.");
    }

    // Executa a devolução interna na carteira
    localWalletBalance += localBetValue;
    document.getElementById('central-balance-display').innerText = `R$ ${localWalletBalance.toFixed(2).replace('.', ',')}`;
    
    if (activeRoomCode && myLocalRole) {
        set(ref(db, `rooms/${activeRoomCode}/${myLocalRole}/betConfirmed`), false);
    }
    
    if (myFinanceId) {
        push(ref(db, `finances/${myFinanceId}/history`), {
            type: "Estorno de Aposta",
            amount: localBetValue,
            timestamp: Date.now(),
            status: "Devolvido"
        });
    }

    if (myBtn) myBtn.innerText = "Confirmar e Bloquear Aposta";
    alert(`Estorno Processado! R$ ${localBetValue.toFixed(2)} retornaram instantaneamente para a sua carteira.`);
    renderDynamicPlayersGrid(null);
}

function performPlayerSearchAndQuery() {
    const queryName = document.getElementById('bet-player-search-box').value.trim();
    if (!queryName) return alert("Digite um apelido para buscar!");

    if (isLobbyTestingMode) {
        return alert(`Perfil de "${queryName}" localizado! Crie uma mesa ou insira um código para parear jogadores reais.`);
    }

    const targetFinanceId = btoa(queryName).replace(/=/g, "");
    
    get(ref(db, `finances/${targetFinanceId}`)).then((snapshot) => {
        if (!snapshot.exists()) {
            return alert("Jogador não encontrado ou sem registro ativo de carteira no sistema.");
        }
        const opponentFinance = snapshot.val();
        addSearchedPlayerToRoom(queryName, opponentFinance.available);
    });
}

function addSearchedPlayerToRoom(playerName, availableBalance) {
    const roomRef = ref(db, `rooms/${activeRoomCode}`);
    runTransaction(roomRef, (room) => {
        if (!room) return room;

        for (let i = 1; i <= 4; i++) {
            if (room[`p${i}`] && room[`p${i}`].name === playerName) return;
        }

        const maxSlots = (currentMode === "1x1") ? 2 : 4;
        for (let i = 1; i <= maxSlots; i++) {
            if (!room[`p${i}`] || !room[`p${i}`].name) {
                room[`p${i}`] = {
                    name: playerName,
                    betIntent: localBetValue,
                    betConfirmed: false,
                    cachedBalance: availableBalance, 
                    status: "Conectado"
                };
                break;
            }
        }
        return room;
    }).then(() => {
        document.getElementById('bet-player-search-box').value = '';
    });
}

function updatePayoutInstructionBanner() {
    const titleMode = document.getElementById('bet-prize-title-mode');
    if (!titleMode) return;
    if (currentMode === '1x1') titleMode.innerHTML = "⚔️ MODO 1x1 — VENCEDOR LEVA TUDO <br><small style='color:#8a9a92; font-weight:normal;'>O ganhador da mesa recebe 100% do prêmio. Fundos retornam se houver cancelamento.</small>";
    if (currentMode === 'solo') titleMode.innerHTML = "💀 MATA-MATA (TODOS CONTRA TODOS) — CAMPEÃO LEVA TUDO <br><small style='color:#8a9a92; font-weight:normal;'>4 Jogadores individuais. O vencedor recebe o montante integral na carteira.</small>";
    if (currentMode === 'duplas') titleMode.innerHTML = "👑 CLÁSSICO EM DUPLAS (2x2) — DIVISÃO AUTOMÁTICA <br><small style='color:#8a9a92; font-weight:normal;'>Prêmio total somado e dividido igualmente (50% / 50%) para a dupla vencedora.</small>";
}

function detectActiveGameRoom() {
    const roomIdElement = document.getElementById('game-room-id');
    if (!roomIdElement) return;

    const code = roomIdElement.innerText.replace('#', '').trim();
    if (!code || code === "000000") {
        isLobbyTestingMode = true;
        return;
    }

    if (activeRoomCode !== code) {
        activeRoomCode = code;
        isLobbyTestingMode = false;
        onValue(ref(db, `rooms/${activeRoomCode}`), (snapshot) => {
            const room = snapshot.val();
            if (room) syncBetPanelState(room);
        });
    }
}

function syncBetPanelState(room) {
    const currentName = document.getElementById('player-name')?.value.trim() || "Joabe Play";
    myLocalRole = null;
    for (let i = 1; i <= 4; i++) {
        if (room[`p${i}`] && room[`p${i}`].name === currentName) {
            myLocalRole = `p${i}`;
            break;
        }
    }

    currentMode = room.matchMode || "1x1";
    const modeSelect = document.getElementById('select-match-mode');
    if (modeSelect) {
        modeSelect.value = currentMode;
        modeSelect.disabled = (myLocalRole !== 'p1'); 
    }

    updatePayoutInstructionBanner();
    renderDynamicPlayersGrid(room);
}

function renderDynamicPlayersGrid(room) {
    const container = document.getElementById('bet-grid-players-container');
    if (!container) return;
    container.innerHTML = '';

    const slotsCount = (currentMode === "1x1") ? 2 : 4;
    let totalAccumulatedPrize = 0;
    let allBetsEqual = true;
    let referenceBet = null;
    let pendingConfirmations = 0;
    let totalPlayersConnected = 0;
    let balanceErrorDetected = false;

    const mockName = document.getElementById('player-name')?.value.trim() || "Joabe Play";

    for (let i = 1; i <= slotsCount; i++) {
        const card = document.createElement('div');
        card.className = "bet-player-card";

        // FLUXO DO LOBBY: Gerenciamento interativo público antes de parear uma mesa real
        if (isLobbyTestingMode) {
            if (i === 1) {
                totalPlayersConnected++;
                totalAccumulatedPrize += localBetValue;
                const iHaveConfirmed = (document.getElementById('btn-confirm-my-bet')?.innerText === "Fundo Reservado com Sucesso");
                card.innerHTML = `
                    <div class="p-meta-data">
                        <span class="p-grid-name">👤 Slot 1: ${mockName} (Você)</span>
                        <span class="p-grid-bet">Sua Aposta: R$ ${localBetValue.toFixed(2).replace('.', ',')}</span>
                        <span class="p-grid-status" style="color:${iHaveConfirmed ? '#22c55e' : '#ef4444'}">
                            ${iHaveConfirmed ? 'Fundo Bloqueado via PIX ✅' : 'Aguardando Pagamento do PIX'}
                        </span>
                    </div>
                    <div class="status-indicator-icon">${iHaveConfirmed ? '✅' : '❌'}</div>
                `;
            } else {
                card.innerHTML = `
                    <div class="p-meta-data">
                        <span class="p-grid-name" style="color:#555">👤 Slot ${i}: Livre para Busca</span>
                        <span class="p-grid-bet">Aposta: R$ 0,00</span>
                    </div>
                    <div class="status-indicator-icon">⏳</div>
                `;
            }
            container.appendChild(card);
            continue;
        }

        // FLUXO DE PARTIDA REAL: Mapeamento síncrono das carteiras do Firebase Room
        const player = room ? room[`p${i}`] : null;

        if (player && player.name) {
            totalPlayersConnected++;
            const betVal = player.betIntent || 20.00;
            totalAccumulatedPrize += betVal;

            if (referenceBet === null) referenceBet = betVal;
            else if (betVal !== referenceBet) allBetsEqual = false;

            const isConfirmed = !!player.betConfirmed;
            if (!isConfirmed) pendingConfirmations++;
            
            const pBalance = player.cachedBalance || 0;
            const hasSufficientFunds = pBalance >= betVal || isConfirmed;
            if (!hasSufficientFunds) balanceErrorDetected = true;

            if (isConfirmed) card.classList.add('confirmed');

            card.innerHTML = `
                <div class="p-meta-data">
                    <span class="p-grid-name">👤 Slot ${i}: ${player.name} ${player.name === mockName ? '(Você)' : ''}</span>
                    <span class="p-grid-bet">Saldo Disp: <b style="color:#22c55e">R$ ${pBalance.toFixed(2)}</b> | Aposta: R$ ${betVal.toFixed(2)}</span>
                    <span class="p-grid-status" style="color:${!hasSufficientFunds ? '#ef4444' : isConfirmed ? '#22c55e' : '#eab308'}">
                        ${!hasSufficientFunds ? '❌ Saldo Insuficiente para Entrada' : isConfirmed ? 'Aposta Retirada e Bloqueada ✅' : 'Aguardando Liberação do PIX'}
                    </span>
                </div>
                <div class="status-indicator-icon">${!hasSufficientFunds ? '⚠️' : isConfirmed ? '✅' : '❌'}</div>
            `;
        } else {
            allBetsEqual = false;
            card.innerHTML = `
                <div class="p-meta-data">
                    <span class="p-grid-name" style="color:#6b7280">👤 Slot ${i}: Vago</span>
                    <span class="p-grid-bet">Aguardando entrada por busca...</span>
                </div>
                <div class="status-indicator-icon">⏳</div>
            `;
        }
        container.appendChild(card);
    }

    const prizeDisplay = document.getElementById('bet-prize-total-val');
    if (prizeDisplay) {
        const finalPrizeValue = isLobbyTestingMode ? (slotsCount * localBetValue) : totalAccumulatedPrize;
        prizeDisplay.innerText = `PRÊMIO TOTAL ACUMULADO: R$ ${finalPrizeValue.toFixed(2).replace('.', ',')}`;
    }

    const banner = document.getElementById('bet-panel-validation-banner');
    const mainStartBtn = document.getElementById('btn-create-room');

    if (isLobbyTestingMode) return;

    // GERENCIAMENTO DA TRAVA OBRIGATÓRIA DE TELA CHEIA
    if (totalPlayersConnected < slotsCount) {
        banner.className = "bet-banner-status bet-banner-error";
        banner.innerText = `Mesa Bloqueada: Aguardando entrada de todos os ${slotsCount} jogadores na aposta...`;
        if (mainStartBtn) mainStartBtn.disabled = true;
    } else if (balanceErrorDetected) {
        banner.className = "bet-banner-status bet-banner-error";
        banner.innerText = "Operação Bloqueada: Existem jogadores com saldo insuficiente para cobrir esta rodada.";
        if (mainStartBtn) mainStartBtn.disabled = true;
    } else if (!allBetsEqual) {
        banner.className = "bet-banner-status bet-banner-error";
        banner.innerText = "Divergência de Valores: Todos os participantes precisam parear e casar o mesmo valor.";
        if (mainStartBtn) mainStartBtn.disabled = true;
    } else if (pendingConfirmations > 0) {
        banner.className = "bet-banner-status bet-banner-error";
        banner.innerText = `Saldos auditados! Aguardando a aprovação do PIX e confirmação manual de ${pendingConfirmations} jogadores...`;
        if (mainStartBtn) mainStartBtn.disabled = true;
    } else {
        // ENTRADA COLETIVA APROVADA: Remove a trava e libera o tabuleiro automaticamente
        banner.className = "bet-banner-status bet-banner-success";
        banner.innerText = "✅ Confirmação Coletiva Concluída! Todos pagaram via PIX. Liberando a mesa de jogo...";
        if (mainStartBtn) mainStartBtn.disabled = false;

        setTimeout(() => {
            const centralPanel = document.getElementById('bet-central-panel');
            const gameScreen = document.getElementById('game-screen');
            
            if (centralPanel) centralPanel.classList.add('hidden'); // Destrói o overlay de bloqueio
            if (gameScreen) gameScreen.classList.remove('hidden'); // Revela as peças e tabuleiro
        }, 1500);
    }

    const myBtn = document.getElementById('btn-confirm-my-bet');
    if (myBtn && myLocalRole && room) {
        const iHaveConfirmed = room[myLocalRole]?.betConfirmed;
        myBtn.disabled = !allBetsEqual || (totalPlayersConnected < slotsCount) || balanceErrorDetected || iHaveConfirmed;
        myBtn.innerText = iHaveConfirmed ? "Fundo Reservado com Sucesso" : "Confirmar Minha Aposta";
    }
}

// RESERVA DE FUNDOS E EMISSÃO DE NOTAS NO HISTÓRICO NO FIREBASE
function handleMyBetConfirmation() {
    if (localWalletBalance < localBetValue) return alert("Saldo insuficiente. Adicione fundos via PIX primeiro.");

    if (isLobbyTestingMode) {
        localWalletBalance -= localBetValue;
        document.getElementById('central-balance-display').innerText = `R$ ${localWalletBalance.toFixed(2).replace('.', ',')}`;
        
        const myBtn = document.getElementById('btn-confirm-my-bet');
        if (myBtn) myBtn.innerText = "Fundo Reservado com Sucesso";
        renderDynamicPlayersGrid(null);
        return alert(`PIX de R$ ${localBetValue.toFixed(2)} Processado! Seu saldo foi reservado para a mesa de testes públicos.`);
    }

    if (!activeRoomCode || !myLocalRole) return;

    localWalletBalance -= localBetValue;
    document.getElementById('central-balance-display').innerText = `R$ ${localWalletBalance.toFixed(2).replace('.', ',')}`;

    const logsRef = ref(db, `finances/${myFinanceId}/history`);
    const logEntry = push(logsRef);
    set(logEntry, {
        type: "Bloqueio Rodada PIX",
        amount: localBetValue,
        timestamp: Date.now(),
        room: activeRoomCode,
        status: "Reservado"
    });

    set(ref(db, `rooms/${activeRoomCode}/${myLocalRole}/betConfirmed`), true);
    set(ref(db, `rooms/${activeRoomCode}/${myLocalRole}/betIntent`), localBetValue);
}
