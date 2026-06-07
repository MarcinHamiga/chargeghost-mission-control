import { cn } from "../lib/cn";
import { LOGO_SRC } from "../lib/brand";

interface ChargeGhostLogoProps {
  size?: number;
  class?: string;
}

export function ChargeGhostLogo(props: ChargeGhostLogoProps) {
  const size = () => props.size ?? 24;

  return (
    <img
      src={LOGO_SRC}
      alt="ChargeGhost"
      width={size()}
      height={size()}
      class={cn("shrink-0", props.class)}
    />
  );
}
