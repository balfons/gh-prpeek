export const clearScreen = () => {
  process.stdout.write("\u001b[3J\u001b[1J"); // Prevent scrollback
  console.clear();
};

export const enableAlternateBuffer = () => {
  process.stdout.write("\u001B[?1049h"); // Enable alternative buffer
};

export const disableAlternateBuffer = () => {
  process.stdout.write("\u001B[?1049l"); // Disable alternative buffer
};

export const commaSeparatedList = (value: string): string[] => {
  return value.split(",");
};
