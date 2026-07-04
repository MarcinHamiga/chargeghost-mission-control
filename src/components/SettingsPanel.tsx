import { createSignal, createResource, createEffect, For, Show } from "solid-js";
import { api, APIError } from "../lib/api";
import type { Config } from "../lib/types";
import { state } from "../store/simulator";
import { bridgeUnavailableMessage } from "../lib/http";
import { addToast } from "../store/toast";
import { Settings, Save, RefreshCw, Key, Server, ChevronDown, ChevronRight, Check, X, Users, Plus, Trash2 } from "lucide-solid";
import { cn } from "../lib/cn";
import { requestConfirm } from "../store/confirm";
import { Select } from "./Select";
import { Button } from "./ui/Button";
import { AUTH_STATUS_OPTIONS, toSelectOptions } from "../lib/select-options";
import { DeviceInfoPanel } from "./DeviceInfoPanel";
import { CredentialsPanel } from "./CredentialsPanel";
import { QueuePanel } from "./QueuePanel";

export function SettingsPanel() {
  const [config, { refetch: refetchConfig }] = createResource(() => api.getConfig());
  const [ocppKeys, { refetch: refetchKeys }] = createResource(() => api.getOCPPConfigKeys());
  const [saving, setSaving] = createSignal(false);
  const [saveMsg, setSaveMsg] = createSignal<{ type: "success" | "error"; text: string } | null>(null);
  const [dirty, setDirty] = createSignal<Partial<Config>>({});
  const [ocppExpanded, setOcppExpanded] = createSignal(false);
  const [editingKey, setEditingKey] = createSignal<string | null>(null);
  const [editValue, setEditValue] = createSignal("");

  // Local Auth List
  const [localAuth, { refetch: refetchLocalAuth }] = createResource(() => api.getLocalAuthList());
  const [ocppStatus, { refetch: refetchOcppStatus }] = createResource(() =>
    api.getOcppStatus().catch((e) => {
      if (e instanceof APIError && e.status === 503) return null;
      throw e;
    }),
  );

  createEffect(() => {
    state.wsInvalidation.ocppKeys;
    refetchKeys();
  });
  const [localAuthExpanded, setLocalAuthExpanded] = createSignal(false);
  const [addingAuthEntry, setAddingAuthEntry] = createSignal(false);
  const [newAuthIdTag, setNewAuthIdTag] = createSignal("");
  const [newAuthStatus, setNewAuthStatus] = createSignal<string>("Accepted");
  const [newAuthExpiry, setNewAuthExpiry] = createSignal("");

  const handleAddAuthEntry = async () => {
    const current = localAuth();
    if (!current) return;
    try {
      await api.updateLocalAuthList({
        list_version: current.version + 1,
        update_type: "Differential",
        entries: [{
          id_tag: newAuthIdTag(),
          status: newAuthStatus(),
          ...(newAuthExpiry() ? { expiry: new Date(newAuthExpiry()).toISOString() } : {}),
        }],
      });
      setAddingAuthEntry(false);
      setNewAuthIdTag("");
      setNewAuthExpiry("");
      refetchLocalAuth();
      addToast("success", "Auth entry added");
    } catch (e: any) {
      addToast("error", `Failed to add auth entry: ${e.message || e}`);
    }
  };

  const handleDeleteAuthEntry = async (idTag: string) => {
    try {
      await api.deleteLocalAuthEntry(idTag);
      refetchLocalAuth();
      addToast("success", `Auth entry "${idTag}" deleted`);
    } catch (e: any) {
      addToast("error", `Failed to delete auth entry: ${e.message || e}`);
    }
  };

  const handleClearAuthList = async () => {
    if (!(await requestConfirm("Clear all local authorization entries?"))) return;
    try {
      await api.clearLocalAuthList();
      refetchLocalAuth();
      addToast("success", "Local auth list cleared");
    } catch (e: any) {
      addToast("error", `Failed to clear auth list: ${e.message || e}`);
    }
  };

  const currentValue = (field: keyof Config) => {
    if (field in dirty()) return dirty()[field];
    return (config() as any)?.[field];
  };

  const updateField = (field: keyof Config, value: Config[keyof Config]) => {
    setDirty((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const changes = dirty();
      if (Object.keys(changes).length > 0) {
        const result = await api.updateConfig(changes);
        const immediateFields = ["ev_battery_capacity", "rfid_tag"];
        const changedImmediate = result.changed_fields.some((f) => immediateFields.includes(f));
        if (result.action === "restart_required") {
          setSaveMsg({
            type: "success",
            text: changedImmediate
              ? "Saved. Immediate fields applied; restart required for connection/TLS/OCPP version changes."
              : "Saved. Restart the process to apply startup-only configuration changes.",
          });
        } else if (result.action === "applied") {
          setSaveMsg({ type: "success", text: result.message || "Configuration applied immediately." });
        } else {
          setSaveMsg({ type: "success", text: result.message || "No configuration changes." });
        }
      }
      await api.saveConfig();
      setDirty({});
      refetchConfig();
    } catch (e: any) {
      setSaveMsg({ type: "error", text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleOcppKeyUpdate = async (key: string) => {
    try {
      await api.updateOCPPConfigKey(key, editValue());
      setEditingKey(null);
      refetchKeys();
      addToast("success", `OCPP key "${key}" updated`);
    } catch (e: any) {
      addToast("error", `Failed to update OCPP key: ${e.message || e}`);
    }
  };

  type ConfigField = {
    key: keyof Config;
    label: string;
    type: "text" | "password" | "number" | "select" | "toggle";
    icon?: any;
    options?: string[];
  };

  const configFields: ConfigField[] = [
    { key: "connection_url", label: "OCPP Connection URL", type: "text", icon: Server },
    { key: "ocpp_id", label: "Charge Point ID", type: "text", icon: Key },
    { key: "security_profile", label: "Security Profile (0–2)", type: "number" },
    { key: "charge_point_model", label: "Charge Point Model", type: "text" },
    { key: "charge_point_vendor", label: "Charge Point Vendor", type: "text" },
    { key: "rfid_tag", label: "Default RFID Tag (session / start-charging)", type: "text" },
    { key: "ev_battery_capacity", label: "EV Battery Capacity (kWh)", type: "number" },
    { key: "ocpp_version", label: "OCPP Version", type: "select", options: ["1.6", "2.0.1"] },
    { key: "tls_ca_path", label: "TLS CA Path", type: "text" },
    { key: "tls_client_cert_path", label: "TLS Client Cert Path", type: "text" },
    { key: "tls_client_key_path", label: "TLS Client Key Path", type: "text" },
    { key: "log_mode", label: "Log Level", type: "select", options: ["debug", "info", "warn", "error"] },
    { key: "skip_tls_verify", label: "Skip TLS Verification", type: "toggle" },
    { key: "multi_evse_mode", label: "Multi-EVSE Mode", type: "toggle" },
    { key: "persist_message_queue", label: "Persist Message Queue", type: "toggle" },
  ];

  return (
    <div class="flex flex-col h-full min-h-0 gap-4">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-[15px] font-semibold flex items-center gap-2 tracking-[-0.01em]">
          <Settings size={18} class="text-accent-teal" />
          Settings
          <Show when={Object.keys(dirty()).length > 0}>
            <span class="text-[11px] font-normal text-warn tnum">· {Object.keys(dirty()).length} unsaved</span>
          </Show>
        </h2>
        <div class="flex items-center gap-3">
          <Show when={saveMsg()}>
            <span class={cn(
              "text-xs px-3 py-1 rounded-full max-w-md truncate",
              saveMsg()!.type === "success" ? "bg-accent-teal/10 text-accent-teal" : "bg-critical/10 text-critical"
            )}>
              {saveMsg()!.text}
            </span>
          </Show>
          <Button variant="primary" size="sm" icon={<Save size={13} />} onClick={handleSave} disabled={saving() || Object.keys(dirty()).length === 0}>
            {saving() ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

      <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-4 pr-0.5">

      <DeviceInfoPanel />

      <Show when={config()} fallback={
        <div class="flex items-center justify-center py-12 text-text-muted">
          <RefreshCw size={20} class="animate-spin mr-2" /> Loading configuration...
        </div>
      }>
        {/* Core Config */}
        <div class="panel p-6">
          <h3 class="text-sm font-bold mb-4 uppercase tracking-widest text-text-secondary">Charge Point Settings</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <For each={configFields}>
              {(field) => (
                <div class={cn(
                  "space-y-1",
                  field.type === "text" || field.type === "password" ? "md:col-span-1" : "",
                  field.key === "connection_url" && "md:col-span-2"
                )}>
                  <label class="text-xs font-bold uppercase tracking-widest text-text-muted flex items-center gap-1.5">
                    {field.icon && <field.icon size={10} />}
                    {field.label}
                  </label>

                  {field.type === "toggle" ? (
                    <button
                      onClick={() => updateField(field.key, !currentValue(field.key))}
                      class={cn(
                        "w-10 h-5 rounded-full relative transition-colors",
                        currentValue(field.key) ? "bg-accent-teal" : "bg-surface-4"
                      )}
                    >
                      <div class={cn(
                        "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
                        currentValue(field.key) ? "left-5" : "left-0.5"
                      )} />
                    </button>
                  ) : field.type === "select" ? (
                    <Select
                      value={currentValue(field.key) || ""}
                      options={toSelectOptions(field.options ?? [])}
                      onChange={(value) => updateField(field.key, value)}
                      aria-label={field.label}
                    />
                  ) : (
                    <input
                      type={field.type === "number" ? "number" : "text"}
                      value={currentValue(field.key) ?? ""}
                      onInput={(e) => {
                        const val = field.type === "number" ? Number(e.currentTarget.value) : e.currentTarget.value;
                        updateField(field.key, val);
                      }}
                      class="w-full bg-bg-main border border-border-default rounded-lg px-3 py-2 text-xs font-mono focus:border-accent-teal/50 focus:outline-none transition-colors"
                    />
                  )}
                </div>
              )}
            </For>
          </div>
        </div>

        <CredentialsPanel />

        <Show when={config()?.connectors && config()!.connectors!.length > 0}>
          <div class="panel p-6">
            <h3 class="text-sm font-bold mb-4 uppercase tracking-widest text-text-secondary">
              Startup Connectors (read-only)
            </h3>
            <div class="space-y-2">
              <For each={config()!.connectors}>
                {(c, i) => (
                  <div class="text-xs font-mono text-text-muted">
                    #{i() + 1}: {c.voltage} V · {c.current} A · {c.phase}-phase
                  </div>
                )}
              </For>
            </div>
          </div>
        </Show>

        <div class="panel p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-bold uppercase tracking-widest text-text-secondary flex items-center gap-2">
              <Server size={14} />
              OCPP Link Health
            </h3>
            <button
              onClick={() => refetchOcppStatus()}
              class="text-xs text-accent-teal hover:underline"
            >
              Refresh
            </button>
          </div>
          <Show
            when={ocppStatus()}
            fallback={
              <p class="text-xs text-text-muted">
                {bridgeUnavailableMessage()} Use snapshot <span class="font-mono">ocpp_connected</span> for coarse state.
              </p>
            }
          >
            {(status) => (
              <div class="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div><span class="text-text-muted">Version</span><div class="font-mono">{status().version}</div></div>
                <div><span class="text-text-muted">Connected</span><div>{status().connected ? "Yes" : "No"}</div></div>
                <div><span class="text-text-muted">RTT</span><div class="font-mono">{status().lastHeartbeatRttMs ?? "—"} ms</div></div>
                <div><span class="text-text-muted">Reconnects</span><div>{status().reconnectCount}</div></div>
                <div><span class="text-text-muted">Heartbeats</span><div>{status().heartbeatSuccesses} ok / {status().heartbeatFailures} fail</div></div>
                <Show when={status().queueDepth !== undefined}>
                  <div><span class="text-text-muted">Queue depth</span><div>{status().queueDepth}</div></div>
                </Show>
              </div>
            )}
          </Show>
        </div>

        {/* OCPP Message Queue */}
        <QueuePanel />

        {/* OCPP Configuration Keys */}
        <div class="panel">
          <button
            onClick={() => setOcppExpanded(!ocppExpanded())}
            class="w-full flex items-center justify-between p-6 text-left"
          >
            <h3 class="text-sm font-bold uppercase tracking-widest text-text-secondary flex items-center gap-2">
              <Key size={14} />
              OCPP Configuration Keys
              <Show when={ocppKeys()}>
                <span class="text-xs font-normal text-text-muted">({ocppKeys()!.length} keys)</span>
              </Show>
            </h3>
            {ocppExpanded() ? <ChevronDown size={16} class="text-text-muted" /> : <ChevronRight size={16} class="text-text-muted" />}
          </button>

          <Show when={ocppExpanded()}>
            <div class="px-6 pb-6">
              <div class="border border-border-default rounded-lg overflow-hidden">
                <div class="grid grid-cols-[1fr_1fr_80px] gap-0 text-xs font-bold uppercase tracking-widest text-text-muted bg-surface-2/60 px-4 py-2 border-b border-border-default">
                  <span>Key</span>
                  <span>Value</span>
                  <span class="text-center">Status</span>
                </div>
                <div class="max-h-96 overflow-y-auto custom-scrollbar divide-y divide-border-default">
                  <For each={ocppKeys()} fallback={
                    <div class="px-4 py-8 text-center text-text-muted text-xs">
                      <RefreshCw size={16} class="animate-spin mx-auto mb-2" /> Loading...
                    </div>
                  }>
                    {(entry) => (
                      <div class="grid grid-cols-[1fr_1fr_80px] gap-0 px-4 py-2 text-xs items-center hover:bg-white/[0.02]">
                        <span class="font-mono text-text-secondary truncate pr-2" title={entry.key}>{entry.key}</span>
                        <div>
                          <Show when={editingKey() === entry.key} fallback={
                            <button
                              onClick={() => {
                                if (!entry.readonly) {
                                  setEditingKey(entry.key);
                                  setEditValue(entry.value);
                                }
                              }}
                              class={cn(
                                "font-mono truncate text-left max-w-full block",
                                entry.readonly ? "text-text-muted cursor-default" : "hover:text-accent-teal cursor-pointer"
                              )}
                              title={entry.value}
                              disabled={entry.readonly}
                            >
                              {entry.value || <span class="italic text-text-muted">empty</span>}
                            </button>
                          }>
                            <div class="flex items-center gap-1">
                              <input
                                value={editValue()}
                                onInput={(e) => setEditValue(e.currentTarget.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleOcppKeyUpdate(entry.key);
                                  if (e.key === "Escape") setEditingKey(null);
                                }}
                                class="flex-1 bg-bg-main border border-accent-teal/50 rounded px-2 py-0.5 text-xs font-mono focus:outline-none"
                                autofocus
                              />
                              <button onClick={() => handleOcppKeyUpdate(entry.key)} class="text-accent-teal hover:text-accent-teal/80">
                                <Check size={12} />
                              </button>
                              <button onClick={() => setEditingKey(null)} class="text-text-muted hover:text-critical">
                                <X size={12} />
                              </button>
                            </div>
                          </Show>
                        </div>
                        <div class="flex justify-center gap-2">
                          <span class={cn(
                            "px-1.5 py-0.5 rounded text-xs font-bold uppercase",
                            entry.readonly ? "bg-warn/10 text-warn" : "bg-accent-teal/10 text-accent-teal"
                          )}>
                            {entry.readonly ? "RO" : "RW"}
                          </span>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </div>
          </Show>
        </div>

        {/* Local Authorization List */}
        <div class="panel">
          <button
            onClick={() => setLocalAuthExpanded(!localAuthExpanded())}
            class="w-full flex items-center justify-between p-6 text-left"
          >
            <h3 class="text-sm font-bold uppercase tracking-widest text-text-secondary flex items-center gap-2">
              <Users size={14} />
              Local Authorization List
              <Show when={localAuth()}>
                <span class="text-xs font-normal text-text-muted">
                  ({localAuth()!.entry_count}/{localAuth()!.max_entries} entries, v{localAuth()!.version})
                </span>
              </Show>
            </h3>
            {localAuthExpanded() ? <ChevronDown size={16} class="text-text-muted" /> : <ChevronRight size={16} class="text-text-muted" />}
          </button>

          <Show when={localAuthExpanded()}>
            <div class="px-6 pb-6">
              {/* Actions bar */}
              <div class="flex items-center justify-between mb-4">
                <Show when={localAuth()}>
                  <span class={cn(
                    "text-xs px-2 py-0.5 rounded font-bold uppercase",
                    localAuth()!.enabled ? "bg-accent-teal/10 text-accent-teal" : "bg-critical/10 text-critical"
                  )}>
                    {localAuth()!.enabled ? "Enabled" : "Disabled"}
                  </span>
                </Show>
                <div class="flex gap-2">
                  <button
                    onClick={() => setAddingAuthEntry(!addingAuthEntry())}
                    class="flex items-center gap-1 px-2 py-1 rounded text-xs bg-accent-teal/10 border border-accent-teal/30 text-accent-teal font-bold hover:bg-accent-teal/20 transition-all"
                  >
                    <Plus size={10} />
                    Add Entry
                  </button>
                  <button
                    onClick={handleClearAuthList}
                    disabled={!localAuth() || localAuth()!.entry_count === 0}
                    class="flex items-center gap-1 px-2 py-1 rounded text-xs border border-critical/25 text-critical hover:bg-critical/10 transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={10} />
                    Clear All
                  </button>
                </div>
              </div>

              {/* Add entry form */}
              <Show when={addingAuthEntry()}>
                <div class="p-3 rounded-lg border border-accent-teal/20 bg-accent-teal/5 mb-4">
                  <div class="grid grid-cols-4 gap-3 items-end">
                    <div class="space-y-1">
                      <label class="text-xs font-bold uppercase tracking-widest text-text-muted">ID Tag</label>
                      <input type="text" value={newAuthIdTag()} onInput={(e) => setNewAuthIdTag(e.currentTarget.value)} placeholder="Tag001"
                        class="w-full bg-bg-main border border-border-default rounded px-2 py-1.5 text-xs font-mono focus:border-accent-teal/50 focus:outline-none" />
                    </div>
                    <div class="space-y-1">
                      <label class="text-xs font-bold uppercase tracking-widest text-text-muted">Status</label>
                      <Select
                        value={newAuthStatus()}
                        options={AUTH_STATUS_OPTIONS}
                        onChange={setNewAuthStatus}
                        aria-label="Authorization status"
                      />
                    </div>
                    <div class="space-y-1">
                      <label class="text-xs font-bold uppercase tracking-widest text-text-muted">Expiry (optional)</label>
                      <input type="datetime-local" value={newAuthExpiry()} onInput={(e) => setNewAuthExpiry(e.currentTarget.value)}
                        class="w-full bg-bg-main border border-border-default rounded px-2 py-1.5 text-xs font-mono focus:border-accent-teal/50 focus:outline-none" />
                    </div>
                    <div class="flex gap-2">
                      <button onClick={handleAddAuthEntry} disabled={!newAuthIdTag()}
                        class="px-3 py-1.5 rounded bg-accent-teal text-bg-main text-xs font-bold hover:bg-accent-teal/90 transition-colors disabled:opacity-50">
                        Add
                      </button>
                      <button onClick={() => setAddingAuthEntry(false)}
                        class="px-3 py-1.5 rounded border border-border-default text-xs hover:bg-white/5 transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </Show>

              {/* Entries table */}
              <div class="border border-border-default rounded-lg overflow-x-auto custom-scrollbar">
                <div class="grid grid-cols-[minmax(6rem,1fr)_6rem_4rem_minmax(8rem,1fr)_3.5rem] gap-0 min-w-[32rem] text-xs font-bold uppercase tracking-widest text-text-muted bg-surface-2/60 px-4 py-2 border-b border-border-default">
                  <span>ID Tag</span>
                  <span>Status</span>
                  <span>Expired</span>
                  <span>Expiry</span>
                  <span class="text-center">Actions</span>
                </div>
                <div class="max-h-64 overflow-y-auto custom-scrollbar divide-y divide-border-default min-w-[32rem]">
                  <Show when={localAuth()?.entries && localAuth()!.entries.length > 0} fallback={
                    <div class="px-4 py-6 text-center text-text-muted text-xs italic">
                      No authorization entries
                    </div>
                  }>
                    <For each={localAuth()?.entries}>
                      {(entry) => (
                        <div class="grid grid-cols-[minmax(6rem,1fr)_6rem_4rem_minmax(8rem,1fr)_3.5rem] gap-0 px-4 py-2 text-xs items-center hover:bg-white/[0.02]">
                          <span class="font-mono text-text-secondary">{entry.id_tag}</span>
                          <span class={cn(
                            "px-1.5 py-0.5 rounded text-xs font-bold uppercase w-fit",
                            entry.authorization_status === "Accepted" ? "bg-available/10 text-available" :
                            entry.authorization_status === "Blocked" ? "bg-critical/10 text-critical" :
                            entry.authorization_status === "Expired" ? "bg-warn/10 text-warn" :
                            "bg-warn/10 text-warn"
                          )}>
                            {entry.authorization_status}
                          </span>
                          <span class={cn(
                            "text-xs font-bold uppercase",
                            entry.is_expired ? "text-warn" : "text-text-muted"
                          )}>
                            {entry.is_expired ? "Yes" : "No"}
                          </span>
                          <span class="text-text-muted font-mono text-xs">
                            {entry.expiry_date ? new Date(entry.expiry_date).toLocaleString() : "—"}
                          </span>
                          <div class="flex justify-center">
                            <button
                              onClick={() => handleDeleteAuthEntry(entry.id_tag)}
                              class="text-critical hover:text-critical/80 p-1"
                              title="Delete entry"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        </div>
                      )}
                    </For>
                  </Show>
                </div>
              </div>
            </div>
          </Show>
        </div>
      </Show>
      </div>
    </div>
  );
}
