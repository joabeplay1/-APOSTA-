# 🤡 Palhaço IA — Palhaço Joker

> "O amigo que nunca fica sem piadas."

Assistente de humor com inteligência artificial que conversa por **voz em tempo real** com o usuário. O Palhaço Joker escuta, gera respostas engraçadas via IA e responde por voz — conversa 100% por voz, sem digitação.

## ✨ Funcionalidades

- 🎙️ **Conversa 100% por voz** — microfone sempre ligado, conversa contínua como uma ligação
- 🤡 **Avatar animado** com lip-sync (boca mexe com a fala), pisca, ri, faz caretas
- 🎪 **Interface circo moderno** com confetes, luzes e cores vibrantes
- 🧠 **Memória de conversa** — lembra dos assuntos e do seu nome
- 😊 **Detecção de emoções** — alegra se você estiver triste
- 🎯 **Charadas** — "O que é, o que é..." respondidas por voz
- 🔊 **Efeitos sonoros** — aplausos, tambores, risadas
- ⚙️ **Configurações** — sons, velocidade da voz, volume, tema claro/escuro
- 📜 **Histórico** de conversas
- ❤️ **Favoritos** — favoritar, copiar e compartilhar piadas
- 🛑 **Encerramento por voz** — diga "Palhaço Joker, por hoje chega"

## 🛠️ Stack

- React 18 + Vite
- Tailwind CSS + shadcn/ui
- Framer Motion (animações)
- Web Speech API (voz)
- Base44 SDK (backend + IA)

## 📋 Pré-requisitos

- Node.js 18+
- Conta no Base44 (https://base44.com)

## 🚀 Como executar

```bash
npm install
npm run dev
```

Abra http://localhost:5173

> ⚠️ Este app usa o backend do Base44 (entidades, auth, e InvokeLLM para a IA). Para funcionar, conecte a uma conta Base44 em base44.com.

## 🧠 IA

As respostas usam a integração InvokeLLM do Base44 (modelos Gemini). O prompt está em src/lib/clownConfig.js.

## 📦 Build

```bash
npm run build
```

## 📁 Estrutura

```
src/pages/         # Home, Chat, History, Favorites
src/components/clown/  # JokerAvatar (lip-sync), ChatBubble, etc
src/lib/           # clownConfig, soundEffects
src/hooks/         # useSettings
base44/entities/   # Conversation, FavoriteJoke
```

## 🌐 Compatibilidade

Use Google Chrome (Web Speech API).

## 📄 Licença

MIT
