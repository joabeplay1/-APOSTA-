import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, PhoneOff, Mic, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import JokerAvatar from "@/components/clown/JokerAvatar";
import ChatBubble from "@/components/clown/ChatBubble";
import SettingsPanel from "@/components/clown/SettingsPanel";
import Spotlights from "@/components/clown/Spotlights";
import useSettings from "@/hooks/useSettings";
import { SYSTEM_PROMPT, isEndPhrase, normalizeText } from "@/lib/clownConfig";
import { playApplause, playDrumRoll, playLaugh, playCircusJingle } from "@/lib/soundEffects";

export default function Chat() {
  const navigate = useNavigate();
  const { settings, updateSetting } = useSettings();
  const [messages, setMessages] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isLaughing, setIsLaughing] = useState(false);
  const [userName, setUserName] = useState("");
  const [conversationId, setConversationId] = useState(null);
  const [favoritedTexts, setFavoritedTexts] = useState(new Set());
  const [expectingName, setExpectingName] = useState(true);
  const [ended, setEnded] = useState(false);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const conversationActiveRef = useRef(true);
  const isSpeakingRef = useRef(false);
  const isThinkingRef = useRef(false);
  const messagesRef = useRef([]);
  const userNameRef = useRef("");
  const settingsRef = useRef(settings);

  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { userNameRef.current = userName; }, [userName]);
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);
  useEffect(() => { isThinkingRef.current = isThinking; }, [isThinking]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scrollToBottom(); }, [messages]);

  // Load favorites
  useEffect(() => {
    base44.entities.FavoriteJoke.list().then(favs => {
      setFavoritedTexts(new Set(favs.map(f => f.joke_text)));
    }).catch(() => {});
  }, []);

  // Save conversation
  const saveConversation = useCallback((msgs) => {
    if (msgs.length === 0) return;
    const data = {
      title: msgs[0]?.content?.slice(0, 50) || "Conversa",
      messages: msgs.map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp })),
    };
    if (conversationId) {
      base44.entities.Conversation.update(conversationId, data).catch(() => {});
    } else {
      base44.entities.Conversation.create(data).then(c => setConversationId(c.id)).catch(() => {});
    }
  }, [conversationId]);

  const speak = useCallback((text, onEnd) => {
    if (!text) { onEnd?.(); return; }
    synthRef.current.cancel();
    // Strip emojis/visual markers for cleaner speech
    const cleanText = text.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/gu, "").replace(/\s+/g, " ").trim();
    const utterance = new SpeechSynthesisUtterance(cleanText || text);
    utterance.lang = "pt-BR";
    utterance.rate = settingsRef.current.voiceSpeed;
    utterance.volume = settingsRef.current.volume;
    utterance.pitch = 1.15;

    const voices = synthRef.current.getVoices();
    const ptVoice = voices.find(v => v.lang.startsWith("pt"))
      || voices[0];
    if (ptVoice) utterance.voice = ptVoice;

    const isJoke = /haha|kkk|charada|piada|o que é|rindo/i.test(text);

    utterance.onstart = () => {
      setIsSpeaking(true);
      isSpeakingRef.current = true;
      if (isJoke && settingsRef.current.soundEnabled) {
        setTimeout(() => setIsLaughing(true), 800);
      }
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      setIsLaughing(false);
      isSpeakingRef.current = false;
      onEnd?.();
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsLaughing(false);
      isSpeakingRef.current = false;
      onEnd?.();
    };
    synthRef.current.speak(utterance);
  }, []);

  const startListening = useCallback(() => {
    if (!conversationActiveRef.current || isSpeakingRef.current || isThinkingRef.current) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    synthRef.current.cancel();
    setIsSpeaking(false);
    isSpeakingRef.current = false;

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim();
      if (transcript) handleUserInput(transcript);
    };

    recognition.onerror = (e) => {
      setIsListening(false);
      // Auto-restart on no-speech or aborted to keep conversation alive
      if (conversationActiveRef.current && (e.error === "no-speech" || e.error === "aborted")) {
        setTimeout(() => startListening(), 400);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      // Continuous mode: restart listening if still active and not speaking/thinking
      if (conversationActiveRef.current && !isSpeakingRef.current && !isThinkingRef.current) {
        setTimeout(() => startListening(), 300);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
    } catch {
      // already started
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    setIsListening(false);
  }, []);

  const handleUserInput = useCallback(async (text) => {
    if (!text.trim()) return;
    conversationActiveRef.current = true;

    // Check for end phrase
    if (isEndPhrase(text)) {
      endConversation();
      return;
    }

    // Capture user name from first response
    let currentName = userNameRef.current;
    if (expectingName && !currentName) {
      const cleaned = text.replace(/^(meu nome é|eu me chamo|me chamo|sou o|sou a|o meu nome é)\s*/i, "").trim();
      const name = cleaned.split(/\s+/).slice(0, 2).join(" ");
      if (name && name.length < 30) {
        setUserName(name);
        currentName = name;
      }
      setExpectingName(false);
    }

    const userMsg = { role: "user", content: text.trim(), timestamp: new Date().toISOString() };
    const updatedMessages = [...messagesRef.current, userMsg];
    setMessages(updatedMessages);
    setIsThinking(true);
    isThinkingRef.current = true;
    stopListening();

    if (settingsRef.current.soundEnabled) playDrumRoll();

    const conversationHistory = updatedMessages
      .slice(-10)
      .map(m => `${m.role === "user" ? "Usuário" : "Palhaço Joker"}: ${m.content}`)
      .join("\n");

    const nameContext = currentName ? `\n\nO nome do usuário é: ${currentName}. Use o nome naturalmente na conversa.` : "\n\nVocê ainda não sabe o nome do usuário. Pergunte o nome educadamente.";

    const prompt = `${SYSTEM_PROMPT}${nameContext}\n\nHistórico da conversa:\n${conversationHistory}\n\nResponda como o Palhaço Joker à última mensagem do usuário. Seja engraçado, natural e curto (máx 3 frases):`;

    try {
      const response = await base44.integrations.Core.InvokeLLM({ prompt });
      const assistantMsg = { role: "assistant", content: response, timestamp: new Date().toISOString() };
      const finalMessages = [...updatedMessages, assistantMsg];
      setMessages(finalMessages);
      setIsThinking(false);
      isThinkingRef.current = false;

      saveConversation(finalMessages);

      if (settingsRef.current.soundEnabled) {
        if (/haha|kkk|risada/i.test(response)) playLaugh();
        else playApplause();
      }

      // Speak, then resume listening
      speak(response, () => {
        if (conversationActiveRef.current) {
          setTimeout(() => startListening(), 300);
        }
      });
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Opa! O palhaço tropeçou no próprio sapato! 🤡 Tenta falar de novo?", timestamp: new Date().toISOString() }]);
      setIsThinking(false);
      isThinkingRef.current = false;
      setTimeout(() => startListening(), 500);
    }
  }, [expectingName, speak, startListening, stopListening, saveConversation]);

  const endConversation = useCallback(() => {
    conversationActiveRef.current = false;
    stopListening();
    setEnded(true);
    const name = userNameRef.current || "amigo";
    const goodbye = `Hahaha! Valeu, ${name}! Foi muito divertido conversar com você! Até a próxima! Kkkkk! 👋`;
    setMessages(prev => [...prev, { role: "assistant", content: goodbye, timestamp: new Date().toISOString() }]);
    if (settingsRef.current.soundEnabled) { playApplause(); setTimeout(() => playLaugh(), 600); }
    speak(goodbye, () => {
      setTimeout(() => navigate("/"), 1200);
    });
  }, [navigate, speak, stopListening]);

  // Greeting on mount — start the conversation
  useEffect(() => {
    const greeting = "E aí, beleza?! 🤡 Eu sou o Palhaço Joker, e tô pronto pra fazer você rir até cair da cadeira! Hahaha! Mas antes, me conta: qual é o seu nome?";
    setMessages([{ role: "assistant", content: greeting, timestamp: new Date().toISOString() }]);
    if (settings.soundEnabled) playCircusJingle();
    // Wait a tick for voices to load
    const timer = setTimeout(() => {
      speak(greeting, () => {
        if (conversationActiveRef.current) {
          setTimeout(() => startListening(), 400);
        }
      });
    }, 600);
    return () => {
      clearTimeout(timer);
      conversationActiveRef.current = false;
      stopListening();
      synthRef.current?.cancel();
    };
  }, []);

  const handleFavorite = async (text) => {
    if (favoritedTexts.has(text)) return;
    await base44.entities.FavoriteJoke.create({ joke_text: text });
    setFavoritedTexts(prev => new Set([...prev, text]));
  };

  const handleManualEnd = () => {
    endConversation();
  };

  const clownState = isLaughing ? "laughing" : isSpeaking ? "speaking" : isListening ? "listening" : "idle";

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-yellow-400 via-green-700 to-yellow-500 dark:from-yellow-600 dark:via-green-900 dark:to-yellow-700">
      <Spotlights />

      {/* Header */}
      <div className="relative z-20 flex items-center justify-between px-4 py-3 bg-black/30 backdrop-blur-md border-b border-yellow-300/20">
        <button onClick={() => { conversationActiveRef.current = false; stopListening(); synthRef.current?.cancel(); navigate("/"); }} className="p-2 rounded-full hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="text-center">
          <h2 className="text-white font-heading font-bold text-lg">🤡 Palhaço Joker</h2>
          <p className="text-white/70 text-xs flex items-center justify-center gap-1.5">
            {ended ? "Encerrando..." : isThinking ? "Pensando numa piada..." : isSpeaking ? "Falando..." : isListening ? "🎤 Escutando..." : "Conversa ativa"}
            {!ended && !isThinking && !isSpeaking && !isListening && (
              <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-2 h-2 bg-green-400 rounded-full inline-block" />
            )}
          </p>
        </div>
        <SettingsPanel settings={settings} updateSetting={updateSetting} />
      </div>

      {/* Avatar */}
      <div className="relative z-10 flex flex-col items-center py-6">
        <JokerAvatar state={clownState} userName={userName} />

        {/* Riddle / question display — shows current question text */}
        <AnimatePresence>
          {messages.length > 0 && messages[messages.length - 1].role === "assistant" && /o que é|charada|adivinha/i.test(messages[messages.length - 1].content) && !ended && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="mt-4 mx-4 max-w-md bg-yellow-300 text-purple-900 font-heading font-semibold text-center px-5 py-3 rounded-2xl shadow-lg border-2 border-yellow-500"
            >
              <p className="text-sm">🤔 {messages[messages.length - 1].content}</p>
              <p className="text-xs mt-1 text-purple-700/70 italic">Responda falando — não digite!</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Messages scroll area */}
      <div className="flex-1 relative z-10 overflow-y-auto px-4 pb-4 max-h-[30vh]">
        <AnimatePresence>
          {messages.map((msg, i) => (
            <ChatBubble
              key={i}
              message={msg}
              onFavorite={handleFavorite}
              isFavorited={favoritedTexts.has(msg.content)}
            />
          ))}
        </AnimatePresence>

        {isThinking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start mb-3">
            <div className="bg-card text-card-foreground rounded-2xl rounded-bl-md border border-border px-4 py-3 flex items-center gap-2">
              <span className="text-xs font-semibold text-primary">🤡 Palhaço Joker</span>
              <div className="flex gap-1">
                <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.8, repeat: Infinity }} className="w-2 h-2 bg-primary rounded-full" />
                <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }} className="w-2 h-2 bg-primary rounded-full" />
                <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }} className="w-2 h-2 bg-primary rounded-full" />
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom bar — voice only, NO text input */}
      <div className="relative z-20 bg-black/40 backdrop-blur-md border-t border-yellow-300/20 p-4">
        <div className="flex flex-col items-center gap-3">
          {/* Mic status — always on indicator */}
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ scale: isListening ? [1, 1.15, 1] : 1 }}
              transition={{ duration: 1, repeat: isListening ? Infinity : 0 }}
              className={`w-4 h-4 rounded-full ${isListening ? "bg-red-500" : isSpeaking ? "bg-yellow-400" : "bg-green-400"}`}
            />
            <p className="text-white text-sm font-body">
              {ended
                ? "Conversa encerrada"
                : isThinking
                ? "Palhaço pensando..."
                : isSpeaking
                ? "Palhaço falando..."
                : isListening
                ? "Microfone ativo — pode falar!"
                : "Preparando microfone..."}
            </p>
          </div>

          {/* End call button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleManualEnd}
            disabled={ended}
            className="px-8 py-3 bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white font-heading font-bold rounded-full shadow-lg flex items-center gap-2 transition-colors"
          >
            <PhoneOff className="w-5 h-5" />
            Encerrar Conversa
          </motion.button>

          <p className="text-white/50 text-xs text-center max-w-xs">
            Diga <span className="text-yellow-300 font-semibold">"Palhaço Joker, por hoje chega"</span> para encerrar
          </p>
        </div>
      </div>
    </div>
  );
}