import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { ThemeName, DEFAULT_THEME, THEME_ORDER } from "./ui/theme";

export interface UserConfig {
  theme: ThemeName;
}

const DEFAULT_CONFIG: UserConfig = {
  theme: DEFAULT_THEME,
};

function getConfigPath(): string {
  const home = process.env.HOME || process.cwd();
  return join(home, ".config", "bibleterm", "config.json");
}

export function loadConfig(): UserConfig {
  const configPath = getConfigPath();
  if (!existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const content = readFileSync(configPath, "utf8");
    const parsed = JSON.parse(content);

    // Validate theme
    const config = { ...DEFAULT_CONFIG };
    if (parsed && typeof parsed === "object") {
      if (typeof parsed.theme === "string" && THEME_ORDER.includes(parsed.theme as ThemeName)) {
        config.theme = parsed.theme as ThemeName;
      }
    }
    return config;
  } catch (err) {
    console.error(`Failed to load config at ${configPath}:`, err);
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: UserConfig): void {
  const configPath = getConfigPath();
  const configDir = join(process.env.HOME || process.cwd(), ".config", "bibleterm");

  try {
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }
    writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
  } catch (err) {
    console.error(`Failed to save config at ${configPath}:`, err);
  }
}
