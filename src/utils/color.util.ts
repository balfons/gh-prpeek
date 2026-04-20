import {
  fg,
  TextChunk,
  black as openTuiBlack,
  red as openTuiRed,
  green as openTuiGreen,
  yellow as openTuiYellow,
  blue as openTuiBlue,
  magenta as openTuiMagenta,
  cyan as openTuiCyan,
  white as openTuiWhite,
  brightBlack as openTuiBrightBlack,
  brightRed as openTuiBrightRed,
  brightGreen as openTuiBrightGreen,
  brightYellow as openTuiBrightYellow,
  brightBlue as openTuiBrightBlue,
  brightMagenta as openTuiBrightMagenta,
  brightCyan as openTuiBrightCyan,
  brightWhite as openTuiBrightWhite,
  CliRenderer,
} from "@opentui/core";

type TerminalThemeColors = {
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
  defaultBackground: string;
};

class ColorUtility {
  private static instance: ColorUtility;
  private colors: TerminalThemeColors = {
    black: "",
    red: "",
    green: "",
    yellow: "",
    blue: "",
    magenta: "",
    cyan: "",
    white: "",
    brightBlack: "",
    brightRed: "",
    brightGreen: "",
    brightYellow: "",
    brightBlue: "",
    brightMagenta: "",
    brightCyan: "",
    brightWhite: "",
    defaultBackground: "",
  };

  private constructor() {}

  static getInstance(): ColorUtility {
    if (!ColorUtility.instance) {
      ColorUtility.instance = new ColorUtility();
    }
    return ColorUtility.instance;
  }

  setColors(colors: Partial<TerminalThemeColors>) {
    this.colors = { ...this.colors, ...colors };
  }

  black(text: string): TextChunk {
    return this.colors.black ? fg(this.colors.black)(text) : openTuiBlack(text);
  }

  red(text: string): TextChunk {
    return this.colors.red ? fg(this.colors.red)(text) : openTuiRed(text);
  }

  green(text: string): TextChunk {
    return this.colors.green ? fg(this.colors.green)(text) : openTuiGreen(text);
  }

  yellow(text: string): TextChunk {
    return this.colors.yellow
      ? fg(this.colors.yellow)(text)
      : openTuiYellow(text);
  }

  blue(text: string): TextChunk {
    return this.colors.blue ? fg(this.colors.blue)(text) : openTuiBlue(text);
  }

  magenta(text: string): TextChunk {
    return this.colors.magenta
      ? fg(this.colors.magenta)(text)
      : openTuiMagenta(text);
  }

  cyan(text: string): TextChunk {
    return this.colors.cyan ? fg(this.colors.cyan)(text) : openTuiCyan(text);
  }

  white(text: string): TextChunk {
    return this.colors.white ? fg(this.colors.white)(text) : openTuiWhite(text);
  }

  brightBlack(text: string): TextChunk {
    return this.colors.brightBlack
      ? fg(this.colors.brightBlack)(text)
      : openTuiBrightBlack(text);
  }

  brightRed(text: string): TextChunk {
    return this.colors.brightRed
      ? fg(this.colors.brightRed)(text)
      : openTuiBrightRed(text);
  }

  brightGreen(text: string): TextChunk {
    return this.colors.brightGreen
      ? fg(this.colors.brightGreen)(text)
      : openTuiBrightGreen(text);
  }

  brightYellow(text: string): TextChunk {
    return this.colors.brightYellow
      ? fg(this.colors.brightYellow)(text)
      : openTuiBrightYellow(text);
  }

  brightBlue(text: string): TextChunk {
    return this.colors.brightBlue
      ? fg(this.colors.brightBlue)(text)
      : openTuiBrightBlue(text);
  }

  brightMagenta(text: string): TextChunk {
    return this.colors.brightMagenta
      ? fg(this.colors.brightMagenta)(text)
      : openTuiBrightMagenta(text);
  }

  brightCyan(text: string): TextChunk {
    return this.colors.brightCyan
      ? fg(this.colors.brightCyan)(text)
      : openTuiBrightCyan(text);
  }

  brightWhite(text: string): TextChunk {
    return this.colors.brightWhite
      ? fg(this.colors.brightWhite)(text)
      : openTuiBrightWhite(text);
  }

  getHexColor(colorName: keyof TerminalThemeColors): string {
    return this.colors[colorName];
  }
}

const colorUtil = ColorUtility.getInstance();

// Export functions
export const setTerminalColors = (colors: Partial<TerminalThemeColors>) => {
  colorUtil.setColors(colors);
};

export const setTerminalColorsFromTheme = async (renderer: CliRenderer) => {
  const palette = await renderer.getPalette();

  const terminalThemeHexColors: TerminalThemeColors = {
    black: "",
    red: "",
    green: "",
    yellow: "",
    blue: "",
    magenta: "",
    cyan: "",
    white: "",
    brightBlack: "",
    brightRed: "",
    brightGreen: "",
    brightYellow: "",
    brightBlue: "",
    brightMagenta: "",
    brightCyan: "",
    brightWhite: "",
    defaultBackground: "",
  };

  const colorKeys = Object.keys(terminalThemeHexColors);

  palette.palette.forEach((color, index) => {
    const colorName = colorKeys[index];
    (terminalThemeHexColors as any)[colorName] = color || "";
  });
  terminalThemeHexColors.defaultBackground = palette.defaultBackground || "";

  setTerminalColors(terminalThemeHexColors);
};

export const black = (text: string) => colorUtil.black(text);
export const red = (text: string) => colorUtil.red(text);
export const green = (text: string) => colorUtil.green(text);
export const yellow = (text: string) => colorUtil.yellow(text);
export const blue = (text: string) => colorUtil.blue(text);
export const magenta = (text: string) => colorUtil.magenta(text);
export const cyan = (text: string) => colorUtil.cyan(text);
export const white = (text: string) => colorUtil.white(text);
export const brightBlack = (text: string) => colorUtil.brightBlack(text);
export const brightRed = (text: string) => colorUtil.brightRed(text);
export const brightGreen = (text: string) => colorUtil.brightGreen(text);
export const brightYellow = (text: string) => colorUtil.brightYellow(text);
export const brightBlue = (text: string) => colorUtil.brightBlue(text);
export const brightMagenta = (text: string) => colorUtil.brightMagenta(text);
export const brightCyan = (text: string) => colorUtil.brightCyan(text);
export const brightWhite = (text: string) => colorUtil.brightWhite(text);
export const getHexColor = (colorName: keyof TerminalThemeColors): string => {
  return colorUtil.getHexColor(colorName);
};

export const colorIsDarkSimple = (bgColor: string): boolean => {
  let color = bgColor.charAt(0) === "#" ? bgColor.substring(1, 7) : bgColor;
  let r = parseInt(color.substring(0, 2), 16); // hexToR
  let g = parseInt(color.substring(2, 4), 16); // hexToG
  let b = parseInt(color.substring(4, 6), 16); // hexToB
  return r * 0.299 + g * 0.587 + b * 0.114 <= 186;
};
