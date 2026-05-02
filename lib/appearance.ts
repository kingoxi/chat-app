export const ACCENT_THEMES = [
  {
    id: "rose",
    name: "Blush",
    description: "Instagram DM gibi sıcak ve romantik bir akış",
  },
  {
    id: "sunset",
    name: "Sunset",
    description: "Mercan, şeftali ve altın tonlu daha enerjik görünüm",
  },
  {
    id: "violet",
    name: "Violet",
    description: "Gece modu için daha parlak ve modern mor ışıklar",
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Daha sakin, serin ve minimalist mavi-yeşil atmosfer",
  },
  {
    id: "obsidian",
    name: "Obsidian",
    description: "Daha siyah, net ve yüksek kontrastlı premium görünüm",
  },
] as const;

export type AccentTheme = (typeof ACCENT_THEMES)[number]["id"];
