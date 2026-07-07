import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MessageCircle, Trash2, Clock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import moment from "moment";

export default function HistoryPage() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    base44.entities.Conversation.list("-created_date", 50)
      .then(setConversations)
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    await base44.entities.Conversation.delete(id);
    setConversations(prev => prev.filter(c => c.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-orange-700 dark:from-purple-950 dark:via-indigo-950 dark:to-slate-950">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 bg-black/20 backdrop-blur-md border-b border-white/10">
        <Link to="/" className="p-2 rounded-full hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5 text-white" />
        </Link>
        <h1 className="text-white font-heading font-bold text-xl">📜 Histórico</h1>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-white/20 border-t-yellow-400 rounded-full animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-20 text-white/60">
            <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-heading">Nenhuma conversa ainda!</p>
            <p className="text-sm mt-1">Comece a conversar com o Palhaço IA</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {conversations.map((conv) => (
                <motion.div
                  key={conv.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden"
                >
                  <button
                    onClick={() => setSelected(selected?.id === conv.id ? null : conv)}
                    className="w-full text-left p-4 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold truncate">{conv.title || "Conversa"}</p>
                        <div className="flex items-center gap-2 text-white/50 text-xs mt-1">
                          <Clock className="w-3 h-3" />
                          <span>{moment(conv.created_date).format("DD/MM/YYYY HH:mm")}</span>
                          <span>• {conv.messages?.length || 0} mensagens</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(conv.id); }}
                        className="p-2 rounded-full hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </button>

                  <AnimatePresence>
                    {selected?.id === conv.id && conv.messages && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        className="overflow-hidden border-t border-white/10"
                      >
                        <div className="p-4 space-y-2 max-h-60 overflow-y-auto">
                          {conv.messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                              <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
                                msg.role === "user"
                                  ? "bg-primary/80 text-white rounded-br-none"
                                  : "bg-white/10 text-white/90 rounded-bl-none"
                              }`}>
                                {msg.content}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}