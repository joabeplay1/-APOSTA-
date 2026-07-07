import React, { useState } from "react";
import { motion } from "framer-motion";
import { Heart, Copy, Share2, Check } from "lucide-react";

export default function ChatBubble({ message, onFavorite, isFavorited }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: "Palhaço IA", text: message.content });
    } else {
      handleCopy();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}
    >
      <div className={`max-w-[85%] md:max-w-[70%] relative group ${
        isUser
          ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
          : "bg-card text-card-foreground rounded-2xl rounded-bl-md border border-border shadow-sm"
      } px-4 py-3`}>
        {!isUser && <span className="text-xs font-semibold text-primary block mb-1">🤡 Palhaço IA</span>}
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>

        {!isUser && (
          <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onFavorite?.(message.content)} className={`p-1.5 rounded-full hover:bg-muted transition-colors ${isFavorited ? 'text-red-500' : 'text-muted-foreground'}`}>
              <Heart className="w-3.5 h-3.5" fill={isFavorited ? "currentColor" : "none"} />
            </button>
            <button onClick={handleCopy} className="p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground">
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button onClick={handleShare} className="p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground">
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}