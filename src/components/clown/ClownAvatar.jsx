import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ClownAvatar({ state = "idle" }) {
  const [blinkOpen, setBlinkOpen] = useState(true);
  const [breathScale, setBreathScale] = useState(1);

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlinkOpen(false);
      setTimeout(() => setBlinkOpen(true), 150);
    }, 3000 + Math.random() * 2000);
    return () => clearInterval(blinkInterval);
  }, []);

  useEffect(() => {
    const breathInterval = setInterval(() => {
      setBreathScale(1.02);
      setTimeout(() => setBreathScale(1), 800);
    }, 2500);
    return () => clearInterval(breathInterval);
  }, []);

  const isSpeaking = state === "speaking";
  const isListening = state === "listening";

  return (
    <motion.div
      className="relative select-none"
      animate={{
        scale: breathScale,
        rotate: isSpeaking ? [0, -2, 2, -1, 1, 0] : isListening ? [0, -1, 1, 0] : 0,
      }}
      transition={{ duration: isSpeaking ? 0.6 : 1.5, repeat: isSpeaking ? Infinity : 0 }}
    >
      <svg viewBox="0 0 200 220" className="w-48 h-52 md:w-64 md:h-72 drop-shadow-2xl">
        {/* Hair */}
        <ellipse cx="55" cy="55" rx="30" ry="25" fill="#FF4444" />
        <ellipse cx="145" cy="55" rx="30" ry="25" fill="#FF4444" />
        <ellipse cx="100" cy="35" rx="25" ry="20" fill="#FF4444" />
        <circle cx="40" cy="65" r="12" fill="#FF6B6B" />
        <circle cx="160" cy="65" r="12" fill="#FF6B6B" />

        {/* Hat */}
        <ellipse cx="100" cy="30" rx="40" ry="8" fill="#7B2FBE" />
        <rect x="75" y="2" width="50" height="28" rx="6" fill="#7B2FBE" />
        <circle cx="100" cy="2" r="8" fill="#FFD700" />
        <rect x="85" y="15" width="30" height="6" rx="3" fill="#FFD700" />

        {/* Face */}
        <ellipse cx="100" cy="110" rx="65" ry="70" fill="#FFE4C4" />

        {/* Ears */}
        <ellipse cx="38" cy="105" rx="12" ry="16" fill="#FFD5A8" />
        <ellipse cx="162" cy="105" rx="12" ry="16" fill="#FFD5A8" />

        {/* Cheeks */}
        <motion.circle
          cx="65" cy="125" r="14"
          fill="#FF9EAA"
          opacity={0.7}
          animate={{ scale: isSpeaking ? [1, 1.1, 1] : 1 }}
          transition={{ duration: 0.5, repeat: isSpeaking ? Infinity : 0 }}
        />
        <motion.circle
          cx="135" cy="125" r="14"
          fill="#FF9EAA"
          opacity={0.7}
          animate={{ scale: isSpeaking ? [1, 1.1, 1] : 1 }}
          transition={{ duration: 0.5, repeat: isSpeaking ? Infinity : 0 }}
        />

        {/* Eyes */}
        <g>
          {/* Left eye */}
          <ellipse cx="75" cy="95" rx="14" ry={blinkOpen ? 14 : 2} fill="white" />
          {blinkOpen && (
            <>
              <motion.circle
                cx="75" cy="95" r="7"
                fill="#2D1B69"
                animate={isListening ? { cx: [75, 73, 77, 75] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <circle cx="72" cy="92" r="2.5" fill="white" />
            </>
          )}
          {/* Right eye */}
          <ellipse cx="125" cy="95" rx="14" ry={blinkOpen ? 14 : 2} fill="white" />
          {blinkOpen && (
            <>
              <motion.circle
                cx="125" cy="95" r="7"
                fill="#2D1B69"
                animate={isListening ? { cx: [125, 123, 127, 125] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <circle cx="122" cy="92" r="2.5" fill="white" />
            </>
          )}
        </g>

        {/* Eyebrows */}
        <motion.path
          d="M58 78 Q75 68 90 78"
          stroke="#8B4513" strokeWidth="3" fill="none" strokeLinecap="round"
          animate={isSpeaking ? { d: ["M58 78 Q75 68 90 78", "M58 73 Q75 60 90 73", "M58 78 Q75 68 90 78"] } : {}}
          transition={{ duration: 0.8, repeat: isSpeaking ? Infinity : 0 }}
        />
        <motion.path
          d="M110 78 Q125 68 142 78"
          stroke="#8B4513" strokeWidth="3" fill="none" strokeLinecap="round"
          animate={isSpeaking ? { d: ["M110 78 Q125 68 142 78", "M110 73 Q125 60 142 73", "M110 78 Q125 68 142 78"] } : {}}
          transition={{ duration: 0.8, repeat: isSpeaking ? Infinity : 0 }}
        />

        {/* Nose */}
        <motion.circle
          cx="100" cy="115" r="12"
          fill="#FF3333"
          animate={{ scale: isSpeaking ? [1, 1.15, 1] : [1, 1.05, 1] }}
          transition={{ duration: isSpeaking ? 0.4 : 2, repeat: Infinity }}
        />
        <circle cx="96" cy="111" r="3" fill="#FF6666" opacity={0.6} />

        {/* Mouth */}
        <motion.path
          d={isSpeaking
            ? "M70 140 Q100 175 130 140"
            : "M70 140 Q100 165 130 140"
          }
          stroke="#CC2244"
          strokeWidth="3"
          fill="#FF4466"
          strokeLinecap="round"
          animate={isSpeaking ? {
            d: [
              "M70 140 Q100 175 130 140",
              "M70 140 Q100 160 130 140",
              "M70 140 Q100 175 130 140",
            ]
          } : {}}
          transition={{ duration: 0.3, repeat: isSpeaking ? Infinity : 0 }}
        />
        {/* Teeth */}
        {isSpeaking && (
          <motion.rect x="90" y="140" width="20" height="8" rx="2" fill="white"
            animate={{ height: [8, 5, 8] }}
            transition={{ duration: 0.3, repeat: Infinity }}
          />
        )}

        {/* Bow tie */}
        <polygon points="75,175 100,185 100,175" fill="#FFD700" />
        <polygon points="125,175 100,185 100,175" fill="#FFD700" />
        <circle cx="100" cy="178" r="5" fill="#FF3333" />

        {/* Stars around (speaking) */}
        <AnimatePresence>
          {isSpeaking && (
            <>
              <motion.text x="15" y="60" fontSize="16" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1, rotate: 360 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>⭐</motion.text>
              <motion.text x="170" y="80" fontSize="14" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1, rotate: -360 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>✨</motion.text>
              <motion.text x="25" y="160" fontSize="12" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1, repeat: Infinity }}>🎪</motion.text>
            </>
          )}
        </AnimatePresence>

        {/* Listening indicator */}
        {isListening && (
          <motion.text x="165" y="60" fontSize="16"
            animate={{ opacity: [0.5, 1, 0.5], y: [60, 55, 60] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >👂</motion.text>
        )}
      </svg>
    </motion.div>
  );
}