export const commaSeparatedList = (value: string): string[] => {
  return value.split(",").map((item) => item.trim());
};
