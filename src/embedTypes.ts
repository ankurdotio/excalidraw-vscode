export interface EmbedSettings {
  allowAllDomains: boolean;
  allowedDomains: string[];
  detectBlockedSites: boolean;
}

export interface EmbedCheckResult {
  url: string;
  blocked: boolean;
  title: string;
  favicon?: string;
  error?: string;
}

export interface EmbedHostServices {
  checkEmbed?: (url: string) => Promise<EmbedCheckResult>;
}

export type EmbedMode = "frame" | "card";
