import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";

export default function SettingsPanel({ settings, updateSetting }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="p-2.5 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors">
          <Settings className="w-5 h-5 text-white" />
        </button>
      </SheetTrigger>
      <SheetContent className="bg-card border-border">
        <SheetHeader>
          <SheetTitle className="font-heading text-xl">⚙️ Configurações</SheetTitle>
        </SheetHeader>
        <div className="space-y-8 mt-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">🔊 Sons</Label>
              <Switch
                checked={settings.soundEnabled}
                onCheckedChange={(v) => updateSetting("soundEnabled", v)}
              />
            </div>
            <p className="text-sm text-muted-foreground">Aplausos, risadas e efeitos de circo</p>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-semibold">🗣️ Velocidade da Voz</Label>
            <Slider
              value={[settings.voiceSpeed]}
              onValueChange={([v]) => updateSetting("voiceSpeed", v)}
              min={0.5}
              max={2}
              step={0.1}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">{settings.voiceSpeed.toFixed(1)}x</p>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-semibold">🔉 Volume</Label>
            <Slider
              value={[settings.volume]}
              onValueChange={([v]) => updateSetting("volume", v)}
              min={0}
              max={1}
              step={0.05}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">{Math.round(settings.volume * 100)}%</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">🌙 Tema Escuro</Label>
              <Switch
                checked={settings.darkMode}
                onCheckedChange={(v) => updateSetting("darkMode", v)}
              />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}