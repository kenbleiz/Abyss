import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Settings {
  channel: string;
  transparent: boolean;
  hud: boolean;
  simulated: boolean;
  sfx: boolean;
  prefix: string;
}

interface SettingsStore extends Settings {
  setChannel: (channel: string) => void;
  setTransparent: (transparent: boolean) => void;
  setHud: (hud: boolean) => void;
  setSimulated: (simulated: boolean) => void;
  setSfx: (sfx: boolean) => void;
}

const defaults: Settings = {
  channel: "",
  transparent: false,
  hud: true,
  simulated: true,
  sfx: true,
  prefix: "!",
};

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      ...defaults,
      setChannel: (channel) => set({ channel }),
      setTransparent: (transparent) => set({ transparent }),
      setHud: (hud) => set({ hud }),
      setSimulated: (simulated) => set({ simulated }),
      setSfx: (sfx) => set({ sfx }),
    }),
    { name: "abyss-settings-v1" },
  ),
);

export function overlaySearch(settings: Settings): string {
  const p = new URLSearchParams();
  if (settings.channel.trim()) p.set("channel", settings.channel.trim());
  if (settings.transparent) p.set("bg", "transparent");
  if (!settings.hud) p.set("hud", "0");
  if (!settings.simulated) p.set("sim", "0");
  if (!settings.sfx) p.set("sfx", "0");
  const q = p.toString();
  return q ? `?${q}` : "";
}
