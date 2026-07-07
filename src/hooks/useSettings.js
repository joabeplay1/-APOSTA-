import { useState, useEffect } from "react";

const DEFAULTS = {
  soundEnabled: true,
  voiceSpeed: 1,
  volume: 0.8,
  darkMode: false,
};

export default function useSettings() {
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("palhaco_settings");
    return saved ? { ...DEFAULTS, ...JSON.parse(saved) } : DEFAULTS;
  });

  useEffect(() => {
    localStorage.setItem("palhaco_settings", JSON.stringify(settings));
    if (settings.darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [settings]);

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return { settings, updateSetting };
}