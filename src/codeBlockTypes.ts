export const CODE_BLOCK_THEMES = [
  "dark-plus",
  "light-plus",
  "github-light",
  "github-dark",
  "one-dark-pro",
  "dracula",
  "nord",
  "vitesse-light",
  "vitesse-dark",
  "catppuccin-latte",
  "catppuccin-mocha",
] as const;

export type CodeBlockTheme = (typeof CODE_BLOCK_THEMES)[number];

export type CodeBlockThemeData = {
  name: string;
  type: "light" | "dark";
  colors: Record<string, string>;
  settings: {
    scope?: string | string[];
    settings: { foreground?: string; background?: string; fontStyle?: string };
  }[];
};

export type CodeBlockSettings = {
  defaultTheme: CodeBlockTheme;
  vscodeTheme?: CodeBlockThemeData;
  defaultLanguage: string;
  fontSize: number;
  showLineNumbers: boolean;
  windowControls: boolean;
};

export type CodeBlockOptions = {
  code: string;
  language: string;
  theme: CodeBlockTheme;
  fontSize: number;
  lineNumbers: boolean;
  title: string;
  windowControls: boolean;
  highlightLines: string;
  scale: 1 | 2 | 3;
  vscodeTheme?: CodeBlockThemeData;
};

export type CodeBlockPreferences = Omit<
  CodeBlockOptions,
  "code" | "scale" | "vscodeTheme"
>;

export type CodeBlockMetadata = CodeBlockOptions & {
  kind: "code-block";
  v: 1;
};

export const DEFAULT_CODE_BLOCK_SETTINGS: CodeBlockSettings = {
  defaultTheme: "light-plus",
  defaultLanguage: "javascript",
  fontSize: 16,
  showLineNumbers: true,
  windowControls: false,
};
