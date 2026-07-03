import { createSignal, createResource, createEffect, Show, onCleanup } from "solid-js";
import { api } from "../../lib/api";
import { state } from "../../store/simulator";
import { addToast } from "../../store/toast";
import { Upload, Download, XCircle } from "lucide-solid";
import { cn } from "../../lib/cn";
import { Panel, PanelHeader } from "../ui/Panel";
import { Button } from "../ui/Button";
import { Field, inputClass } from "../ui/Field";

export function FirmwarePanel() {
  const [firmware, { refetch: refetchFirmware }] = createResource(() => api.getFirmwareStatus());
  const [diagnostics, { refetch: refetchDiagnostics }] = createResource(() => api.getDiagnosticsStatus());

  const [fwLocation, setFwLocation] = createSignal("");
  const [fwRetrieveDate, setFwRetrieveDate] = createSignal("");
  const [showFwForm, setShowFwForm] = createSignal(false);

  const [diagLocation, setDiagLocation] = createSignal("");
  const [diagRetries, setDiagRetries] = createSignal(3);
  const [diagRetryInterval, setDiagRetryInterval] = createSignal(10);
  const [showDiagForm, setShowDiagForm] = createSignal(false);

  // Auto-refresh while an operation is in flight (fallback if WS events missed).
  const fwDiagInterval = setInterval(() => {
    if (firmware()?.status && firmware()!.status !== "Idle") refetchFirmware();
    if (diagnostics()?.status && diagnostics()!.status !== "Idle") refetchDiagnostics();
  }, 3000);
  onCleanup(() => clearInterval(fwDiagInterval));

  createEffect(() => { state.wsInvalidation.firmware; refetchFirmware(); });
  createEffect(() => { state.wsInvalidation.diagnostics; refetchDiagnostics(); });

  const handleTriggerFirmware = async () => {
    try {
      await api.triggerFirmwareUpdate({
        location: fwLocation(),
        retrieve_date: fwRetrieveDate() ? new Date(fwRetrieveDate()).toISOString() : new Date().toISOString(),
      });
      setShowFwForm(false);
      refetchFirmware();
      addToast("success", "Firmware update triggered");
    } catch (e: any) {
      addToast("error", `Failed to trigger firmware update: ${e.message || e}`);
    }
  };

  const handleCancelFirmware = async () => {
    try {
      await api.cancelFirmwareUpdate();
      refetchFirmware();
      addToast("info", "Firmware update cancelled");
    } catch (e: any) {
      addToast("error", `Failed to cancel firmware update: ${e.message || e}`);
    }
  };

  const handleTriggerDiagnostics = async () => {
    try {
      await api.triggerDiagnosticsUpload({ location: diagLocation(), retries: diagRetries(), retry_interval: diagRetryInterval() });
      setShowDiagForm(false);
      refetchDiagnostics();
      addToast("success", "Diagnostics upload triggered");
    } catch (e: any) {
      addToast("error", `Failed to trigger diagnostics upload: ${e.message || e}`);
    }
  };

  const handleCancelDiagnostics = async () => {
    try {
      await api.cancelDiagnosticsUpload();
      refetchDiagnostics();
      addToast("info", "Diagnostics upload cancelled");
    } catch (e: any) {
      addToast("error", `Failed to cancel diagnostics upload: ${e.message || e}`);
    }
  };

  return (
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Firmware */}
      <Panel>
        <PanelHeader
          icon={<Upload size={15} class="text-accent-teal" />}
          title="Firmware"
          aside={
            <div class="flex gap-2">
              <Show when={firmware()?.status !== "Idle"}>
                <button onClick={handleCancelFirmware} class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] border border-critical/25 text-critical hover:bg-critical/10 transition-colors">
                  <XCircle size={11} /> Cancel
                </button>
              </Show>
              <Button variant="primary" size="sm" icon={<Upload size={12} />} onClick={() => setShowFwForm(!showFwForm())}>Update</Button>
            </div>
          }
        />
        <div class="p-5 space-y-3">
          <Show when={showFwForm()}>
            <div class="p-3 rounded-lg border border-accent-teal/20 bg-accent-teal/5 space-y-2.5">
              <Field label="Firmware location URL">
                <input type="text" value={fwLocation()} onInput={(e) => setFwLocation(e.currentTarget.value)} placeholder="https://example.com/firmware.bin" class={cn(inputClass, "w-full")} />
              </Field>
              <Field label="Retrieve date">
                <input type="datetime-local" value={fwRetrieveDate()} onInput={(e) => setFwRetrieveDate(e.currentTarget.value)} class={cn(inputClass, "w-full")} />
              </Field>
              <div class="flex gap-2">
                <Button variant="primary" size="sm" onClick={handleTriggerFirmware} disabled={!fwLocation()}>Trigger update</Button>
                <Button variant="ghost" size="sm" onClick={() => setShowFwForm(false)}>Cancel</Button>
              </div>
            </div>
          </Show>

          <Show when={firmware()} fallback={<p class="text-xs text-text-muted">Loading…</p>}>
            {(fw) => (
              <div class="space-y-2 text-xs">
                <div class="flex justify-between">
                  <span class="text-text-muted">Status</span>
                  <span class="font-mono font-semibold text-text-primary">{fw().status}</span>
                </div>
                <Show when={fw().file_name}>
                  <div class="flex justify-between">
                    <span class="text-text-muted">File</span>
                    <span class="font-mono text-text-secondary">{fw().file_name}</span>
                  </div>
                </Show>
                <Show when={fw().status !== "Idle"}>
                  <div class="w-full h-1.5 bg-bg-main rounded-full overflow-hidden mt-2">
                    <div class={cn("h-full bg-accent-teal rounded-full transition-all", fw().status === "Downloading" || fw().status === "Installing" ? "w-1/2 animate-pulse" : "w-full")} />
                  </div>
                </Show>
                <Show when={fw().status === "InstallationFailed"}>
                  <p class="text-critical text-xs">Firmware installation failed.</p>
                </Show>
              </div>
            )}
          </Show>
        </div>
      </Panel>

      {/* Diagnostics */}
      <Panel>
        <PanelHeader
          icon={<Download size={15} class="text-accent-teal" />}
          title="Diagnostics"
          aside={
            <div class="flex gap-2">
              <Show when={diagnostics()?.status !== "Idle"}>
                <button onClick={handleCancelDiagnostics} class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] border border-critical/25 text-critical hover:bg-critical/10 transition-colors">
                  <XCircle size={11} /> Cancel
                </button>
              </Show>
              <Button variant="primary" size="sm" icon={<Upload size={12} />} onClick={() => setShowDiagForm(!showDiagForm())}>Upload</Button>
            </div>
          }
        />
        <div class="p-5 space-y-3">
          <Show when={showDiagForm()}>
            <div class="p-3 rounded-lg border border-accent-teal/20 bg-accent-teal/5 space-y-2.5">
              <Field label="Upload location URL">
                <input type="text" value={diagLocation()} onInput={(e) => setDiagLocation(e.currentTarget.value)} placeholder="https://example.com/diagnostics" class={cn(inputClass, "w-full")} />
              </Field>
              <div class="grid grid-cols-2 gap-2">
                <Field label="Retries">
                  <input type="number" value={diagRetries()} onInput={(e) => setDiagRetries(Number(e.currentTarget.value))} class={cn(inputClass, "w-full")} />
                </Field>
                <Field label="Retry interval (s)">
                  <input type="number" value={diagRetryInterval()} onInput={(e) => setDiagRetryInterval(Number(e.currentTarget.value))} class={cn(inputClass, "w-full")} />
                </Field>
              </div>
              <div class="flex gap-2">
                <Button variant="primary" size="sm" onClick={handleTriggerDiagnostics} disabled={!diagLocation()}>Trigger upload</Button>
                <Button variant="ghost" size="sm" onClick={() => setShowDiagForm(false)}>Cancel</Button>
              </div>
            </div>
          </Show>

          <Show when={diagnostics()} fallback={<p class="text-xs text-text-muted">Loading…</p>}>
            {(diag) => (
              <div class="space-y-2 text-xs">
                <div class="flex justify-between">
                  <span class="text-text-muted">Status</span>
                  <span class="font-mono font-semibold text-text-primary">{diag().status}</span>
                </div>
                <Show when={diag().status === "Uploading"}>
                  <div class="w-full h-1.5 bg-bg-main rounded-full overflow-hidden mt-2">
                    <div class="h-full bg-accent-teal rounded-full transition-all w-1/2 animate-pulse" />
                  </div>
                </Show>
                <Show when={diag().status === "UploadFailed"}>
                  <p class="text-critical text-xs">Diagnostics upload failed.</p>
                </Show>
              </div>
            )}
          </Show>
        </div>
      </Panel>
    </div>
  );
}
