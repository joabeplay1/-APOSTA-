// ==========================================================================
// GERADOR AUTOMÁTICO DE PARTÍCULAS DE DOMINÓ FLUTUANTES
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('domino-particles-container');
    if (!container) return;

    const maxParticles = 15; // Quantidade de peças subindo ao mesmo tempo

    function createSingleDominoParticle() {
        const particle = document.createElement('div');
        particle.className = 'domino-particle';

        // Configura uma posição horizontal aleatória na tela (de 0% a 95%)
        const randomLeft = Math.random() * 95;
        particle.style.left = `${randomLeft}vw`;

        // Configura tamanho aleatório para dar efeito de profundidade (3D)
        const scale = 0.5 + Math.random() * 0.6; // Varia entre metade do tamanho e tamanho normal
        particle.style.transform = `scale(${scale})`;

        // Configura velocidade e tempo de subida aleatórios (entre 12 e 25 segundos)
        const duration = 12 + Math.random() * 13;
        particle.style.animationDuration = `${duration}s`;

        // Adiciona ao container de fundo
        container.appendChild(particle);

        // Deleta a peça assim que ela terminar de subir para não pesar o navegador
        setTimeout(() => {
            particle.remove();
        }, duration * 1000);
    }

    // Cria as primeiras pecinhas imediatamente
    for (let i = 0; i < maxParticles; i++) {
        setTimeout(createSingleDominoParticle, Math.random() * 8000);
    }

    // Fica gerando novas pecinhas continuamente de baixo para cima
    setInterval(() => {
        if (container.children.length < maxParticles) {
            createSingleDominoParticle();
        }
    }, 2500);
});
