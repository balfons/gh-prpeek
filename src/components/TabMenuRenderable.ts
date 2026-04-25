import {
  FrameBufferRenderable,
  TabSelectRenderable,
  TabSelectRenderableEvents,
  TabSelectOption,
  RGBA,
  CliRenderer,
  BoxRenderable,
  BoxOptions,
} from "@opentui/core";
import { getHexColor } from "../utils/color.util";

export interface TabOption extends TabSelectOption {
  name: string;
  count?: number;
  description: string;
  value?: any;
  hidden?: boolean;
}

export interface TabMenuRenderableOptions extends BoxOptions {
  renderer: CliRenderer;
  menuBorderColor?: string;
  selectedOptionTextColor?: string;
  optionTextColor?: string;
  onSelectionChanged?: (index: number, option: TabSelectOption) => void;
  onItemSelected?: (index: number, option: TabSelectOption) => void;
}

export class TabMenuRenderable extends BoxRenderable {
  private canvas: FrameBufferRenderable;
  private tabs: TabSelectRenderable;
  private renderer: CliRenderer;
  private menuBorderColor: string;
  private selectedOptionTextColor: string;
  private optionTextColor: string;

  constructor(options: TabMenuRenderableOptions) {
    super(options.renderer, {
      id: "tab-menu-root",
      width: options.width || options.renderer.width,
      height: options.height,
      position: options.position || "relative",
      left: options.left || 0,
      top: options.top || 0,
      zIndex: options.zIndex,
    });

    this.renderer = options.renderer;
    this.menuBorderColor = options.menuBorderColor || "#808080";
    this.selectedOptionTextColor =
      options.selectedOptionTextColor || getHexColor("magenta");
    this.optionTextColor = options.optionTextColor || getHexColor("white");

    // Create the canvas
    this.canvas = new FrameBufferRenderable(this.renderer, {
      id: "tab-menu-canvas",
      respectAlpha: true,
      width: this.width,
      height: 3,
      position: this.position ?? undefined,
      left: this.left,
      top: this.top,
      zIndex: this.zIndex,
    });

    // Create the tabs
    this.tabs = new TabSelectRenderable(this.renderer, {
      id: "tab-menu-tabs",
      width: "100%",
      visible: false,
      marginTop: options.marginTop !== undefined ? options.marginTop : 1,
      options: [],
    });

    this.add(this.tabs);
    this.add(this.canvas);

    // Set up event listeners
    if (options.onSelectionChanged) {
      this.tabs.on(
        TabSelectRenderableEvents.SELECTION_CHANGED,
        (index: number, option: TabSelectOption) => {
          options.onSelectionChanged?.(index, option);
          this.updateTabs();
        },
      );
    }

    if (options.onItemSelected) {
      this.tabs.on(
        TabSelectRenderableEvents.ITEM_SELECTED,
        (index: number, option: TabSelectOption) => {
          options.onItemSelected?.(index, option);
          this.updateTabs();
        },
      );
    }
  }

  /**
   * Set the tab options
   */
  setTabOptions(options: TabOption[]): void {
    const tabSelectOptions: TabSelectOption[] = options
      .filter((option) => !option.hidden)
      .map((option) => ({
        name:
          option.count !== undefined
            ? `${option.name} (${option.count})`
            : option.name,
        description: option.description,
        value: option.value,
      }));

    this.tabs.setOptions(tabSelectOptions);
    this.updateTabs();
  }

  /**
   * Focus the tabs
   */
  focus(): void {
    this.tabs.focus();
  }

  /**
   * Update the tab rendering
   */
  private updateTabs(): void {
    const backgroundColor = RGBA.fromValues(0, 0, 0, 0);
    this.canvas.frameBuffer.clear(backgroundColor);
    this.canvas.frameBuffer.setRespectAlpha(true);
    const selectedIndex = this.tabs.getSelectedIndex();
    let currentX = 2;

    // Draw the tabs
    this.tabs.options.forEach((option, index) => {
      const isSelected = index === selectedIndex;
      const tabWidth = option.name.length + 4;
      const borderColor = RGBA.fromHex(this.menuBorderColor);
      const textColor = isSelected
        ? RGBA.fromHex(this.selectedOptionTextColor)
        : RGBA.fromHex(this.optionTextColor);

      // Draw top-left corner
      this.canvas.frameBuffer.drawText(
        "╭",
        currentX,
        0,
        borderColor,
        backgroundColor,
      );

      // Draw top border
      for (let i = 1; i < tabWidth - 1; i++) {
        this.canvas.frameBuffer.drawText(
          "─",
          currentX + i,
          0,
          borderColor,
          backgroundColor,
        );
      }

      // Draw top-right corner
      this.canvas.frameBuffer.drawText(
        "╮",
        currentX + tabWidth - 1,
        0,
        borderColor,
        backgroundColor,
      );

      // Draw left border
      this.canvas.frameBuffer.drawText(
        "│",
        currentX,
        1,
        borderColor,
        backgroundColor,
      );

      // Draw tab text
      this.canvas.frameBuffer.drawText(
        option.name,
        currentX + 2,
        1,
        textColor,
        backgroundColor,
      );

      // Draw right border
      this.canvas.frameBuffer.drawText(
        "│",
        currentX + tabWidth - 1,
        1,
        borderColor,
        backgroundColor,
      );

      currentX += tabWidth;
    });

    // Draw the continuous bottom line
    const grayColor = RGBA.fromHex(this.menuBorderColor);

    // Draw left corner that bends down
    this.canvas.frameBuffer.drawText("╭", 0, 2, grayColor, backgroundColor);

    // Draw the bottom line from position 1 to start of tabs
    this.canvas.frameBuffer.drawText("─", 1, 2, grayColor, backgroundColor);

    // Draw the middle section with tabs
    for (let i = 2; i < currentX; i++) {
      this.canvas.frameBuffer.drawText("─", i, 2, grayColor, backgroundColor);
    }

    // Draw the rest of the line to the right edge minus 1
    for (let i = currentX; i < this.renderer.width - 1; i++) {
      this.canvas.frameBuffer.drawText("─", i, 2, grayColor, backgroundColor);
    }

    // Draw right corner that bends down
    this.canvas.frameBuffer.drawText(
      "╮",
      this.renderer.width - 1,
      2,
      grayColor,
      backgroundColor,
    );

    // Now overlay the tab-specific connectors
    currentX = 2;

    this.tabs.options.forEach((option, index) => {
      const tabWidth = option.name.length + 4;
      const isSelected = index === selectedIndex;

      if (isSelected) {
        // Selected tab: draw corner connectors
        // Left corner connector
        this.canvas.frameBuffer.drawText(
          "╯",
          currentX,
          2,
          grayColor,
          backgroundColor,
        );

        // Clear the middle (open bottom)
        for (let i = 1; i < tabWidth - 1; i++) {
          this.canvas.frameBuffer.drawText(
            "─",
            currentX + i,
            2,
            backgroundColor,
            backgroundColor,
          );
        }

        // Right corner connector
        this.canvas.frameBuffer.drawText(
          "╰",
          currentX + tabWidth - 1,
          2,
          grayColor,
          backgroundColor,
        );
      } else {
        // Unselected tab: draw T-junctions
        // Left T-junction
        this.canvas.frameBuffer.drawText(
          "┴",
          currentX,
          2,
          grayColor,
          backgroundColor,
        );

        // Right T-junction
        this.canvas.frameBuffer.drawText(
          "┴",
          currentX + tabWidth - 1,
          2,
          grayColor,
          backgroundColor,
        );
      }

      currentX += tabWidth;
    });
  }

  /**
   * Get the selected option
   */
  getSelectedOption(): TabSelectOption | null {
    return this.tabs.getSelectedOption();
  }

  /**
   * Get the selected index
   */
  getSelectedIndex(): number {
    return this.tabs.getSelectedIndex();
  }
}
