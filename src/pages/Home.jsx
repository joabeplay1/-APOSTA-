import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { MessageCircle, History, Heart, Volume2 } from "lucide-react";
import JokerAvatar from "@/components/clown/JokerAvatar";
import Confetti from "@/components/clown/Confetti";
import Spotlights from "@/components/clown/Spotlights";
import SettingsPanel from "@/components/clown/SettingsPanel";
import useSettings from "@/hooks/useSettings";

export default function Home() {
  const { settings, updateSetting } = useSettings();

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-yellow-400 via-green-700 to-yellow-500 dark:from-yellow-600 dark:via-green-900 dark:to-yellow-700">
      <Confetti count={25} />
      <Spotlights />

      {/* Top bar */}
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        <SettingsPanel settings={settings} updateSetting={updateSetting} />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12">
        {/* Curtain top decoration */}
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-green-900/40 to-transparent" />
        <div className="absolute top-0 left-0 w-20 h-32 bg-gradient-to-r from-green-900/30 to-transparent rounded-br-3xl" />
        <div className="absolute top-0 right-0 w-20 h-32 bg-gradient-to-l from-green-900/30 to-transparent rounded-bl-3xl" />

        {/* Logo & Avatar */}
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="mb-6"
        >
          <JokerAvatar state="idle" />
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-center mb-8"
        >
          <h1 className="text-5xl md:text-7xl font-heading font-bold text-white drop-shadow-lg mb-3">
            🎪 Palhaço <span className="text-yellow-300">IA</span>
          </h1>
          <p className="text-lg md:text-xl text-white/80 font-body italic">
            "O amigo que nunca fica sem piadas."
          </p>
        </motion.div>

        {/* Main CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="flex flex-col items-center gap-4"
        >
          <Link to="/conversar">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-10 py-5 bg-yellow-400 hover:bg-yellow-300 text-green-900 font-heading font-bold text-xl rounded-full shadow-2xl animate-pulse-glow flex items-center gap-3 transition-colors"
            >
              <MessageCircle className="w-7 h-7" />
              Conversar com o Palhaço Joker
            </motion.button>
          </Link>

          <div className="flex gap-3 mt-4">
            <Link to="/historico">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 bg-white/15 backdrop-blur-sm hover:bg-white/25 text-white font-heading font-semibold rounded-full flex items-center gap-2 transition-colors"
              >
                <History className="w-5 h-5" />
                Histórico
              </motion.button>
            </Link>
            <Link to="/favoritos">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 bg-white/15 backdrop-blur-sm hover:bg-white/25 text-white font-heading font-semibold rounded-full flex items-center gap-2 transition-colors"
              >
                <Heart className="w-5 h-5" />
                Favoritos
              </motion.button>
            </Link>
          </div>
        </motion.div>

        {/* Sound toggle hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 text-white/50 text-sm"
        >
          <Volume2 className="w-4 h-4" />
          <span>Sons de circo {settings.soundEnabled ? "ativados" : "desativados"}</span>
        </motion.div>
      </div>
    </div>
  );
}