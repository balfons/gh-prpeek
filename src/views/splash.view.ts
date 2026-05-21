import { CliRenderer, cyan, dim, StyledText, t } from "@opentui/core";
import { fetchLatestRelease } from "../commands";
import { getHexColor, green } from "../utils/color.util";
import packageJson from "../../package.json";
import { SplashScreenRenderable } from "../components/SplashScreenRenderable";

class SplashView {
  private splashScreen: SplashScreenRenderable;

  private constructor(
    private renderer: CliRenderer,
    splashScreen: SplashScreenRenderable,
  ) {
    this.splashScreen = splashScreen;
  }

  static async create(
    renderer: CliRenderer,
    { repoNames }: { repoNames: string[] },
  ) {
    const latestRelease = await fetchLatestRelease();

    let bodyRows: StyledText[] = [
      t`${green(`Fetching prs for: ${repoNames.join(", ")}`)}`,
    ];
    if (latestRelease && latestRelease !== packageJson.version) {
      bodyRows = [
        ...bodyRows,
        t``,
        t`A new version of gh-prpeek is available: ${dim(
          packageJson.version,
        )} → ${green(latestRelease ?? "")}`,
        t`Run ${cyan(`gh extension upgrade balfons/gh-prpeek`)} to update`,
      ];
    }

    const splashScreen = new SplashScreenRenderable(renderer, {
      id: "splash-screen",
      zIndex: 20,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      asciiColor: getHexColor("fgText"),
      height: "100%",
      asciiText: "prpeek",
      bodyRows,
    });

    return new SplashView(renderer, splashScreen);
  }

  renderSplashScreen = () => {
    this.renderer.root.add(this.splashScreen);
  };

  destroySplashScreen = () => {
    this.splashScreen.destroy();
  };
}

export { SplashView };
