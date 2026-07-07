import React from "react";

export default function Spotlights() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <div
        className="absolute top-0 left-1/4 w-60 h-[500px] animate-spotlight"
        style={{
          background: "linear-gradient(180deg, rgba(255,215,0,0.15) 0%, transparent 100%)",
          transform: "rotate(-15deg)",
          transformOrigin: "top center",
        }}
      />
      <div
        className="absolute top-0 right-1/4 w-60 h-[500px] animate-spotlight"
        style={{
          background: "linear-gradient(180deg, rgba(255,105,180,0.12) 0%, transparent 100%)",
          transform: "rotate(15deg)",
          transformOrigin: "top center",
          animationDelay: "1.5s",
        }}
      />
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[600px] animate-spotlight"
        style={{
          background: "linear-gradient(180deg, rgba(123,47,190,0.1) 0%, transparent 100%)",
          animationDelay: "0.8s",
        }}
      />
    </div>
  );
}