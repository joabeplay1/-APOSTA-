import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue, push, remove, onDisconnect } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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

let myLobbyId = null;
let currentChatRoomId = null;
let currentChatListener = null;

// Captura de eventos da Interface
document.addEventListener('DOMContentLoaded', () => {
    const nameInput = document.getElementById('player-name');
    const sidebarNameInput = document.getElementById('sidebar-player-name');

    // REGISTRO AUTOMÁTICO (CAMPO CENTRAL): Sincroniza a barra lateral e envia pro Firebase
    if (nameInput) {
        nameInput.addEventListener('blur', () => {
            const name = nameInput.value.trim();
            if (name) {
                if (sidebarNameInput) sidebarNameInput.value = name;
                initLobbyPresence(name);
            }
        });

        nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const name = nameInput.value.trim();
                if (name) {
                    if (sidebarNameInput) sidebarNameInput.value = name;
                    initLobbyPresence(name);
                }
            }
        });
    }

    // REGISTRO VIA CAMPO DA BARRA LATERAL (DIREITA)
    if (sidebarNameInput) {
        sidebarNameInput.addEventListener('blur', () => {
            const name = sidebarNameInput.value.trim();
            if (name) {
                if (nameInput) nameInput.value = name; // Alimenta o central para a criação da sala futura
                initLobbyPresence(name);
            }
        });

        sidebarNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const name = sidebarNameInput.value.trim();
                if (name) {
                    if (nameInput) nameInput.value = name;
                    initLobbyPresence(name);
                }
            }
        });
    }

    // Vinculação de segurança nos botões de sala
    const bindSync = () => {
        const name = nameInput ? nameInput.value.trim() : "";
        if (name) initLobbyPresence(name);
    };
    document.getElementById('btn-create-room').addEventListener('click', bindSync);
    document.getElementById('btn-join-room').addEventListener('click', bindSync);
    
    // Controles do Chat Privado Flutuante
    document.getElementById('btn-close-chat').onclick = closePrivateChat;
    document.getElementById('btn-send-message').onclick = sendPrivateMessage;
    document.getElementById('select-my-status').onchange = (e) => updateMyStatus(e.target.value);
    
    // Inicialização do botão de minimizar/expandir o card do chat
    const chatCard = document.getElementById('draggable-chat-card');
    const minimizeBtn = document.getElementById('btn-minimize-chat');
    
    if (minimizeBtn && chatCard) {
        minimizeBtn.onclick = (e) => {
            e.stopPropagation();
            chatCard.classList.toggle('minimized');
            minimizeBtn.innerText = chatCard.classList.contains('minimized') ? '🗖' : '—';
        };
    }

    // Ativa o motor de arraste livre (Drag & Drop)
    makeElementDraggable(chatCard, document.getElementById('chat-drag-handle'));
    
    // Rotina de limpeza automática cíclica de mensagens antigas
    setInterval(performAutoGarbageCollection, 5000);
});

// Inicializa o sistema de Presença no Firebase
function initLobbyPresence(name) {
    if (myLobbyId) return; // Impede duplicação do mesmo jogador na barra
    
    const presenceListRef = ref(db, 'presence');
    const newPlayerRef = push(presenceListRef);
    myLobbyId = newPlayerRef.key;

    const playerData = {
        name: name,
        status: "Disponível",
        lastActive: Date.now()
    };

    set(newPlayerRef, playerData);

    // Remove do monitoramento instantaneamente se fechar a aba
    onDisconnect(newPlayerRef).remove();

    document.getElementById('lobby-presence-sidebar').classList.remove('hidden');

    // Escuta em tempo real as conexões de todos os usuários
    onValue(presenceListRef, (snapshot) => {
        renderOnlinePlayers(snapshot.val());
    });
}

function updateMyStatus(newStatus) {
    if (!myLobbyId) return;
    set(ref(db, `presence/${myLobbyId}/status`), newStatus);
    set(ref(db, `presence/${myLobbyId}/lastActive`), Date.now());
}

// Renderiza os cards dos oponentes na barra lateral de monitoramento
function renderOnlinePlayers(playersObj) {
    const container = document.getElementById('online-players-list');
    container.innerHTML = '';
    if (!playersObj) return;

    Object.keys(playersObj).forEach(key => {
        const player = playersObj[key];
        const li = document.createElement('li');
        li.className = 'player-item';
        
        // Adiciona uma tag indicativa sutil se o cartão renderizado for o seu próprio usuário conectado
        const isMe = (key === myLobbyId);
        const displayName = isMe ? `${player.name} (Você)` : player.name;

        li.innerHTML = `
            <div class="player-info-meta">
                <span class="p-name" style="${isMe ? 'color: #d4af37;' : 'color: #fff;'}">${displayName}</span>
                <span class="p-status">${player.status}</span>
            </div>
            <div class="status-dot ${player.status}"></div>
        `;

        // Se for você mesmo, o clique é bloqueado. Se for outro jogador, abre o chat flutuante de apostas
        if (!isMe) {
            li.onclick = () => openPrivateChat(key, player.name);
        } else {
            li.style.cursor = 'default';
            li.style.border = '1px dashed rgba(212, 175, 55, 0.3)';
        }
        
        container.appendChild(li);
    });
}

// Lógica de Conexão Dedicada ao Chat Privado
function openPrivateChat(targetId, targetName) {
    if (!myLobbyId) {
        return alert("Por favor, digite seu Nome/Apelido para ativar o chat!");
    }
    
    currentChatRoomId = myLobbyId < targetId ? `${myLobbyId}_${targetId}` : `${targetId}_${myLobbyId}`;
    
    document.getElementById('chat-target-name').innerText = `Conversa com ${targetName}`;
    document.getElementById('private-chat-modal').classList.remove('hidden');
    document.getElementById('chat-messages-box').innerHTML = '';

    if (currentChatListener) currentChatListener();

    const chatRef = ref(db, `chats/${currentChatRoomId}`);
    currentChatListener = onValue(chatRef, (snapshot) => {
        renderMessages(snapshot.val());
    });
}

function closePrivateChat() {
    document.getElementById('private-chat-modal').classList.add('hidden');
    currentChatRoomId = null;
    if (currentChatListener) currentChatListener();
}

function sendPrivateMessage() {
    const input = document.getElementById('chat-input-message');
    const msg = input.value.trim();
    if (!msg || !currentChatRoomId) return;

    const messagePayload = {
        senderId: myLobbyId,
        text: msg,
        timestamp: Date.now()
    };

    push(ref(db, `chats/${currentChatRoomId}`), messagePayload);
    input.value = '';
}

function renderMessages(messagesObj) {
    const box = document.getElementById('chat-messages-box');
    box.innerHTML = '';
    if (!messagesObj) return;

    Object.keys(messagesObj).forEach(key => {
        const m = messagesObj[key];
        const bubble = document.createElement('div');
        bubble.className = m.senderId === myLobbyId ? 'msg-bubble me' : 'msg-bubble them';
        bubble.innerText = m.text;
        box.appendChild(bubble);
    });
    box.scrollTop = box.scrollHeight;
}

// Motor de Autolimpeza do Firebase (10 minutos)
function performAutoGarbageCollection() {
    if (!myLobbyId) return;

    const chatsRef = ref(db, 'chats');
    const dezMinutosAtras = Date.now() - (10 * 60 * 1000);

    onValue(chatsRef, (snapshot) => {
        const allChats = snapshot.val();
        if (!allChats) return;

        Object.keys(allChats).forEach(roomId => {
            const messages = allChats[roomId];
            let messagesCount = 0;

            Object.keys(messages).forEach(msgId => {
                messagesCount++;
                const msg = messages[msgId];
                if (msg.timestamp < dezMinutosAtras) {
                    remove(ref(db, `chats/${roomId}/${msgId}`));
                    messagesCount--;
                }
            });

            if (messagesCount === 0) {
                remove(ref(db, `chats/${roomId}`));
            }
        });
    }, { onlyOnce: true });
}

// Mecanismo de Movimentação Omnidirecional (PC e Mobile)
function makeElementDraggable(elmnt, dragHandle) {
    if (!elmnt) return;
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    if (dragHandle) {
        dragHandle.onmousedown = dragMouseDown;
        dragHandle.ontouchstart = dragMouseDown;
    } else {
        elmnt.onmousedown = dragMouseDown;
        elmnt.ontouchstart = dragMouseDown;
    }

    function dragMouseDown(e) {
        e = e || window.event;
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') {
            e.preventDefault();
        }
        
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        
        pos3 = clientX;
        pos4 = clientY;
        
        if (e.type.includes('touch')) {
            document.ontouchend = closeDragElement;
            document.ontouchmove = elementDrag;
        } else {
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }
    }

    function elementDrag(e) {
        e = e || window.event;
        
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

        pos1 = pos3 - clientX;
        pos2 = pos4 - clientY;
        pos3 = clientX;
        pos4 = clientY;
        
        let newTop = elmnt.offsetTop - pos2;
        let newLeft = elmnt.offsetLeft - pos1;

        if (newTop < 0) newTop = 0;
        if (newLeft < 0) newLeft = 0;
        if (newTop > window.innerHeight - elmnt.clientHeight) newTop = window.innerHeight - elmnt.clientHeight;
        if (newLeft > window.innerWidth - elmnt.clientWidth) newLeft = window.innerWidth - elmnt.clientWidth;

        elmnt.style.top = newTop + "px";
        elmnt.style.left = newLeft + "px";
        elmnt.style.bottom = "auto";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
        document.ontouchend = null;
        document.ontouchmove = null;
    }
}
