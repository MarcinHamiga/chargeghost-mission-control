import { createSignal, Show } from "solid-js";
import { Key, Shield } from "lucide-solid";
import { api, getActiveStation } from "../lib/api";
import { addToast } from "../store/toast";
import { requestConfirm } from "../store/confirm";
import { Panel, PanelHeader } from "./ui/Panel";
import { Button } from "./ui/Button";
import { Field, inputClass } from "./ui/Field";

export function CredentialsPanel() {
  const [password, setPassword] = createSignal("");
  const [saving, setSaving] = createSignal(false);
  const [clearing, setClearing] = createSignal(false);
  const [verifying, setVerifying] = createSignal(false);
  const [verifyResult, setVerifyResult] = createSignal<{ success: boolean; message: string } | null>(null);

  const stationId = () => getActiveStation();

  const handleSave = async () => {
    const id = stationId();
    if (!id) return;
    const pw = password();
    if (!pw) {
      addToast("error", "Enter a password first");
      return;
    }
    setSaving(true);
    try {
      const res = await api.fleet.setOcppPassword(id, pw);
      setPassword("");
      addToast(res.success ? "success" : "error", res.message || "Password saved");
    } catch (e: any) {
      addToast("error", `Failed to set password: ${e.message || e}`);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    const id = stationId();
    if (!id) return;
    if (!(await requestConfirm("Clear the stored OCPP password for this station?"))) return;
    setClearing(true);
    try {
      const res = await api.fleet.clearOcppPassword(id);
      addToast(res.success ? "success" : "error", res.message || "Password cleared");
    } catch (e: any) {
      addToast("error", `Failed to clear password: ${e.message || e}`);
    } finally {
      setClearing(false);
    }
  };

  const handleVerify = async () => {
    const id = stationId();
    if (!id) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await api.fleet.verifyCredentials(id);
      setVerifyResult({ success: res.success, message: res.message });
    } catch (e: any) {
      setVerifyResult({ success: false, message: e.message || String(e) });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Panel>
      <PanelHeader title="Credentials" icon={<Shield size={15} />} />
      <div class="p-4 flex flex-col gap-4">
        <Show
          when={stationId()}
          fallback={<p class="text-xs text-text-secondary">No active station selected.</p>}
        >
          <Field label="OCPP Password" hint="stored in keyring/env">
            <input
              type="password"
              class={inputClass}
              placeholder="New password"
              value={password()}
              onInput={(e) => setPassword(e.currentTarget.value)}
              autocomplete="new-password"
            />
          </Field>
          <div class="flex flex-wrap gap-2">
            <Button
              variant="primary"
              size="sm"
              icon={<Key size={13} />}
              disabled={saving() || !password()}
              onClick={handleSave}
            >
              {saving() ? "Saving..." : "Save password"}
            </Button>
            <Button variant="danger" size="sm" disabled={clearing()} onClick={handleClear}>
              {clearing() ? "Clearing..." : "Clear password"}
            </Button>
            <Button variant="subtle" size="sm" disabled={verifying()} onClick={handleVerify}>
              {verifying() ? "Verifying..." : "Verify password set"}
            </Button>
          </div>
          <p class="text-[11px] text-text-muted">
            "Verify password set" only checks that a password exists in the keyring/env — it does not test
            CSMS connectivity or latency.
          </p>
          <Show when={verifyResult()}>
            {(result) => (
              <p class={result().success ? "text-xs text-accent-teal" : "text-xs text-critical"}>
                {result().message}
              </p>
            )}
          </Show>
        </Show>
      </div>
    </Panel>
  );
}
