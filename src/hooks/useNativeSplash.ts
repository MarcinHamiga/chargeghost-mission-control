import { onMount } from "solid-js";
import { invoke } from "@tauri-apps/api/core";

let dismissed = false;

export function useNativeSplash() {
  onMount(() => {
    if (dismissed) return;

    invoke("splash_frontend_ready")
      .then(() => {
        dismissed = true;
      })
      .catch(() => {
        // Not running inside Tauri — web-only dev
      });
  });
}
