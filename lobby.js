import { db } from "./firebase.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const createRoomBtn = document.getElementById("createRoom");
const joinRoomBtn = document.getElementById("joinRoom");

function generateCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

createRoomBtn.addEventListener("click", async () => {
    const name = document.getElementById("playerName").value.trim();
    const avatar = document.getElementById("playerAvatar").value;
    const bet = parseInt(document.getElementById("betAmount").value) || 100;

    if (!name) return alert("Por favor, digite seu nome!");

    const roomCode = generateCode();

    const roomData = {
        roomCode: roomCode,
        player1: { name, avatar, id: "p1", points: 0 },
        player2: null,
        bet: bet,
        status: "waiting",
        board: [], 
        deck: [], 
        currentTurn: "p1",
        lastAction: Date.now(),
        chat: [{ sender: "Sistema", text: `Sala criada por ${name}. Aguardando oponente...` }]
    };

    try {
        await setDoc(doc(db, "rooms", roomCode), roomData);
        localStorage.setItem("roomCode", roomCode);
        localStorage.setItem("myPlayerId", "p1");
        localStorage.setItem("playerName", name);

        document.getElementById("generatedCode").innerText = "CÓDIGO DA SALA: " + roomCode;
        
        setTimeout(() => {
            window.location.href = "jogo.html";
        }, 1500);
    } catch (e) {
        console.error("Erro ao criar sala: ", e);
    }
});

joinRoomBtn.addEventListener("click", async () => {
    const roomCode = document.getElementById("roomCode").value.trim().toUpperCase();
    const name = document.getElementById("playerName").value.trim();
    const avatar = document.getElementById("playerAvatar").value;

    if (!name) return alert("Digite seu nome antes de entrar!");
    if (!roomCode) return alert("Insira o código da sala!");

    const roomRef = doc(db, "rooms", roomCode);
    const roomSnap = await getDoc(roomRef);

    if (roomSnap.exists()) {
        const data = roomSnap.data();
        if (data.player2) return alert("Esta sala já está cheia!");

        // Atualiza a sala adicionando o segundo jogador e iniciando o game
        await setDoc(roomRef, {
            ...data,
            player2: { name, avatar, id: "p2", points: 0 },
            status: "ready"
        });

        localStorage.setItem("roomCode", roomCode);
        localStorage.setItem("myPlayerId", "p2");
        localStorage.setItem("playerName", name);

        window.location.href = "jogo.html";
    } else {
        alert("Sala não encontrada! Verifique o código.");
    }
});
