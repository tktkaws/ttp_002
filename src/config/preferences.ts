export type Theme = "light" | "dark";
export type Animation = "on" | "off";

export interface DisplayPreferences {
  theme: Theme;
  animation: Animation;
}

export const defaultPreferences: DisplayPreferences = {
  theme: "light",
  animation: "off",
};

export const preferenceKeys = {
  theme: "theme",
  animation: "animation",
};
