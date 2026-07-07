import React from "react";

const COLORS = ["#FF4444", "#FFD700", "#7B2FBE", "#00CED1", "#FF69B4", "#32CD32", "#FF8C00"];

export default function Confetti({ count = 30 }) {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {Array.from({ length: count }).map((_, i) => {
        const color = COLORS[i % COLORS.length];
        const left = Math.random() * 100;
        const delay = Math.random() * 5;
        const duration = 4 + Math.random() * 4;
        const size = 6 + Math.random() * 8;
        const shape = i % 3;
        return (
          <div
            key={i}
            className="absolute animate-confetti"
            style={{
              left: `${left}%`,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
              top: '-20px',
            }}
          >
            {shape === 0 && (
              <div style={{ width: size, height: size, background: color, borderRadius: '50%' }} />
            )}
            {shape === 1 && (
              <div style={{ width: size, height: size * 1.5, background: color, borderRadius: 2 }} />
            )}
            {shape === 2 && (
              <div style={{
                width: 0, height: 0,
                borderLeft: `${size / 2}px solid transparent`,
                borderRight: `${size / 2}px solid transparent`,
                borderBottom: `${size}px solid ${color}`,
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}