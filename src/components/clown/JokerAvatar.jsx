import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { JOKER_IMAGE_URL } from "@/lib/clownConfig";

/**
 * JokerAvatar — uses the user's uploaded image as the base character
 * and overlays animated mouth + eyes for lip-sync and expressions.
 * state: "idle" | "listening" | "speaking" | "laughing"
 */
export default function JokerAvatar({ state = "idle", userName = "" }) {
  const [blinkOpen, setBlinkOpen] = useState(true);
  const [mouthOpen, setMouthOpen] = useState(0);
  const [breathScale, setBreathScale] = useState(1);
  const laughRef = useRef(false);

  const isSpeaking = state === "speaking";
  const isLaughing = state === "laughing";
  const isListening = state === "listening";

  // Blinking
  useEffect(() => {
    let timer;
    const blink = () => {
      setBlinkOpen(false);
      setTimeout(() => setBlinkOpen(true), 140);
      timer = setTimeout(blink, 2500 + Math.random() * 2800);
    };
    timer = setTimeout(blink, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Breathing
  useEffect(() => {
    const interval = setInterval(() => {
      setBreathScale(1.015);
      setTimeout(() => setBreathScale(1), 900);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  // Lip-sync mouth animation while speaking/laughing
  useEffect(() => {
    if (!isSpeaking && !isLaughing) {
      setMouthOpen(0);
      return;
    }
    const interval = setInterval(() => {
      // Random mouth openness to simulate natural speech
      const base = isLaughing ? 0.7 : 0.4;
      const variance = isLaughing ? 0.3 : 0.5;
      setMouthOpen(base + Math.random() * variance);
    }, isLaughing ? 90 : 120);
    return () => clearInterval(interval);
  }, [isSpeaking, isLaughing]);

  // Head movement
  const headRotate = isSpeaking
    ? [0, -1.5, 1.5, -1, 1, 0]
    : isListening
    ? [0, -0.8, 0.8, 0]
    : isLaughing
    ? [0, -3, 3, -2, 2, 0]
    : 0;
  const headDuration = isSpeaking ? 0.5 : isLaughing ? 0.3 : 2.5;

  return (
    <div className="relative select-none" style={{ width: "min(320px, 80vw)", aspectRatio: "1/1.1" }}>
      <motion.div
        className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl border-4 border-yellow-400"
        animate={{ scale: breathScale, rotate: headRotate }}
        transition={{ duration: headDuration, repeat: isSpeaking || isLaughing || isListening ? Infinity : 0, ease: "easeInOut" }}
        style={{ originY: 0.9 }}
      >
        {/* Base image */}
        <img
          src={JOKER_IMAGE_URL}
          alt="Palhaço Joker"
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />

        {/* Subtle vignette to blend overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10 pointer-events-none" />

        {/* Blink overlay — eyelids over the eye region */}
        <motion.div
          className="absolute pointer-events-none"
          style={{
            left: "26%", top: "40%", width: "20%", height: "7%",
            background: "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(220,230,240,0.85))",
            borderRadius: "50%",
            transformOrigin: "center top",
          }}
          animate={{ scaleY: blinkOpen ? 0 : 1 }}
          transition={{ duration: 0.08 }}
        />
        <motion.div
          className="absolute pointer-events-none"
          style={{
            left: "54%", top: "40%", width: "20%", height: "7%",
            background: "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(220,230,240,0.85))",
            borderRadius: "50%",
            transformOrigin: "center top",
          }}
          animate={{ scaleY: blinkOpen ? 0 : 1 }}
          transition={{ duration: 0.08 }}
        />

        {/* Eyebrow raise while speaking/laughing */}
        <motion.div
          className="absolute pointer-events-none"
          style={{ left: "25%", top: "34%", width: "22%", height: "3%", background: "rgba(60,180,90,0.85)", borderRadius: 4 }}
          animate={{ y: isSpeaking || isLaughing ? -4 : 0 }}
          transition={{ duration: 0.3 }}
        />
        <motion.div
          className="absolute pointer-events-none"
          style={{ left: "53%", top: "34%", width: "22%", height: "3%", background: "rgba(60,180,90,0.85)", borderRadius: 4 }}
          animate={{ y: isSpeaking || isLaughing ? -4 : 0 }}
          transition={{ duration: 0.3 }}
        />

        {/* Mouth overlay — lip-sync */}
        <div className="absolute pointer-events-none" style={{ left: "33%", top: "63%", width: "34%", height: "14%" }}>
          {/* Red lips outline matching Joker smile */}
          <svg viewBox="0 0 100 40" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            {/* Upper lip */}
            <path d="M2 18 Q25 4 50 10 Q75 4 98 18 L98 22 Q50 30 2 22 Z" fill="#CC1133" />
            {/* Mouth interior (opens during speech) */}
            <motion.ellipse
              cx="50" cy="24"
              animate={{
                ry: mouthOpen * 14,
                rx: 30 - mouthOpen * 6,
              }}
              transition={{ duration: 0.08 }}
              fill="#3a0010"
            />
            {/* Teeth (visible when mouth open) */}
            <motion.rect
              x="38" y="18" width="24" height="6" rx="2"
              animate={{ opacity: mouthOpen > 0.3 ? 1 : 0, y: 18 + mouthOpen * 2 }}
              fill="white"
            />
            {/* Lower lip */}
            <motion.path
              d="M2 22 Q50 30 98 22 L98 26 Q50 38 2 26 Z"
              fill="#BB1029"
              animate={{ d: mouthOpen > 0.2 ? "M2 22 Q50 30 98 22 L98 28 Q50 40 2 28 Z" : "M2 22 Q50 30 98 22 L98 26 Q50 38 2 26 Z" }}
              transition={{ duration: 0.1 }}
            />
          </svg>
        </div>

        {/* Cheek blush pulse when laughing */}
        <AnimatePresence>
          {isLaughing && (
            <>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 0.5, scale: 1.1 }}
                exit={{ opacity: 0 }}
                className="absolute rounded-full bg-pink-500/40 pointer-events-none"
                style={{ left: "22%", top: "52%", width: "12%", height: "10%" }}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 0.5, scale: 1.1 }}
                exit={{ opacity: 0 }}
                className="absolute rounded-full bg-pink-500/40 pointer-events-none"
                style={{ left: "66%", top: "52%", width: "12%", height: "10%" }}
              />
            </>
          )}
        </AnimatePresence>

        {/* Closed-eye squint when laughing */}
        <AnimatePresence>
          {isLaughing && (
            <>
              <motion.div
                initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} exit={{ scaleY: 0 }}
                className="absolute pointer-events-none"
                style={{ left: "26%", top: "42%", width: "20%", height: "3%", background: "rgba(30,30,30,0.6)", borderRadius: 2, transformOrigin: "center" }}
              />
              <motion.div
                initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} exit={{ scaleY: 0 }}
                className="absolute pointer-events-none"
                style={{ left: "54%", top: "42%", width: "20%", height: "3%", background: "rgba(30,30,30,0.6)", borderRadius: 2, transformOrigin: "center" }}
              />
            </>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Floating effects around avatar */}
      <AnimatePresence>
        {(isSpeaking || isLaughing) && (
          <>
            <motion.div
              initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0], x: -50, y: -40, rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute top-1/3 right-0 text-2xl pointer-events-none"
            >⭐</motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0], x: -40, y: 30, rotate: -360 }}
              transition={{ duration: 1.8, repeat: Infinity, delay: 0.4 }}
              className="absolute bottom-1/3 right-2 text-xl pointer-events-none"
            >✨</motion.div>
            {isLaughing && (
              <motion.div
                initial={{ opacity: 0, scale: 0, y: 0 }}
                animate={{ opacity: [0, 1, 0], scale: [0, 1.3, 0], y: -60 }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="absolute top-0 left-1/2 -translate-x-1/2 text-2xl font-heading font-bold text-yellow-300 pointer-events-none drop-shadow-lg"
              >HA HA!</motion.div>
            )}
          </>
        )}
      </AnimatePresence>

      {/* Listening indicator */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg"
          >
            <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }}>●</motion.span>
            Escutando{userName ? `, ${userName}` : ""}...
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}