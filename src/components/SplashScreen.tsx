import "../splash.css";
import { APP_TITLE, getStartupStatus, LOGO_SRC } from "../lib/brand";
import { state } from "../store/simulator";

interface SplashScreenProps {
  status?: string;
}

export function SplashScreen(props: SplashScreenProps) {
  const status = () =>
    props.status ?? getStartupStatus(state.connectionStatus, state.snapshot !== null);

  return (
    <div class="splash-root h-full w-full">
      <img src={LOGO_SRC} alt="ChargeGhost" class="splash-logo" />
      <h1 class="splash-title">{APP_TITLE}</h1>
      <p class="splash-status">{status()}</p>
      <div class="splash-dots" aria-hidden="true">
        <span class="splash-dot" />
        <span class="splash-dot" />
        <span class="splash-dot" />
      </div>
    </div>
  );
}
