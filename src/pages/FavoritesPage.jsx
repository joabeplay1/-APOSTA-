import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Heart, Copy, Share2, Trash2, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    base44.entities.FavoriteJoke.list("-created_date", 100)
      .then(setFavorites)
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    await base44.entities.FavoriteJoke.delete(id);
    setFavorites(prev => prev.filter(f => f.id !== id));
  };

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleShare = (text) => {
    if (navigator.share) {
      navigator.share({ title: "Piada do Palhaço IA 🤡", text });
    } else {
      navigator.clipboard.writeText(text);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-orange-700 dark:from-purple-950 dark:via-indigo-950 dark:to-slate-950">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 bg-black/20 backdrop-blur-md border-b border-white/10">
        <Link to="/" className="p-2 rounded-full hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5 text-white" />
        </Link>
        <h1 className="text-white font-heading font-bold text-xl">❤️ Favoritos</h1>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-white/20 border-t-yellow-400 rounded-full animate-spin" />
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-20 text-white/60">
            <Heart className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-heading">Nenhuma piada favorita!</p>
            <p className="text-sm mt-1">Passe o mouse sobre uma piada na conversa e clique no ❤️</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {favorites.map((fav) => (
                <motion.div
                  key={fav.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 p-4"
                >
                  <p className="text-white text-sm leading-relaxed whitespace-pre-wrap mb-3">
                    {fav.joke_text}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(fav.id, fav.joke_text)}
                      className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                    >
                      {copiedId === fav.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleShare(fav.joke_text)}
                      className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <div className="flex-1" />
                    <button
                      onClick={() => handleDelete(fav.id)}
                      className="p-2 rounded-full hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}