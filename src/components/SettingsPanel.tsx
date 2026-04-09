import { createSignal, createResource, For, Show } from "solid-js";
import { api } from "../lib/api";
import { addToast } from "../store/toast";
import { Settings, Save, RefreshCw, Key, Server, Shield, ChevronDown, ChevronRight, Check, X, Users, Plus, Trash2 } from "lucide-solid";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export function SettingsPanel() {
  const [config, { refetch: refetchConfig }] = createResource(() => api.getConfig());
  const [ocppKeys, { refetch: refetchKeys }] = createResource(() => api.getOCPPConfigKeys());
  const [saving, setSaving] = createSignal(false);
  const [saveMsg, setSaveMsg] = createSignal<{ type: "success" | "error"; text: string } | null>(null);
  const [dirty, setDirty] = createSignal<Record<string, any>>({});
  const [ocppExpanded, setOcppExpanded] = createSignal(false);
  const [editingKey, setEditingKey] = createSignal<string | null>(null);
  const [editValue, setEditValue] = createSignal("");

  // Local Auth List
  const [localAuth, { refetch: refetchLocalAuth }] = createResource(() => api.getLocalAuthList());
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
          expiry_date: newAuthExpiry() ? new Date(newAuthExpiry()).toISOString() : undefined,
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
    if (!confirm("Clear all local authorization entries?")) return;
    try {
      await api.clearLocalAuthList();
      refetchLocalAuth();
      addToast("success", "Local auth list cleared");
    } catch (e: any) {
      addToast("error", `Failed to clear auth list: ${e.message || e}`);
    }
  };

  const currentValue = (field: string) => {
    if (field in dirty()) return dirty()[field];
    return (config() as any)?.[field];
  };

  const updateField = (field: string, value: any) => {
    setDirty((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const changes = dirty();
      if (Object.keys(changes).length > 0) {
        const result = await api.updateConfig(changes);
        if (result.action === "rejected") {
          setSaveMsg({ type: "error", text: `Rejected: ${result.message}` });
          return;
        }
        if (result.action === "bridge_restart_required") {
          setSaveMsg({ type: "success", text: "Saved. Bridge restart required for changes to take effect." });
        } else {
          setSaveMsg({ type: "success", text: result.message || "Configuration updated." });
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

  const configFields = [
    { key: "connection_url", label: "OCPP Connection URL", type: "text", icon: Server },
    { key: "ocpp_id", label: "Charge Point ID", type: "text", icon: Key },
    { key: "ocpp_password", label: "OCPP Password", type: "password", icon: Shield },
    { key: "charge_point_model", label: "Charge Point Model", type: "text" },
    { key: "charge_point_vendor", label: "Charge Point Vendor", type: "text" },
    { key: "rfid_tag", label: "Default RFID Tag", type: "text" },
    { key: "ev_battery_capacity", label: "EV Battery Capacity (Wh)", type: "number" },
    { key: "log_mode", label: "Log Level", type: "select", options: ["debug", "info", "warn", "error"] },
    { key: "skip_tls_verify", label: "Skip TLS Verification", type: "toggle" },
    { key: "multi_evse_mode", label: "Multi-EVSE Mode", type: "toggle" },
    { key: "persist_message_queue", label: "Persist Message Queue", type: "toggle" },
  ];

  return (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold flex items-center gap-2">
          <Settings size={22} class="text-accent-teal" />
          Configuration
        </h2>
        <div class="flex items-center gap-3">
          <Show when={saveMsg()}>
            <span class={cn(
              "text-xs px-3 py-1 rounded-full",
              saveMsg()!.type === "success" ? "bg-accent-teal/10 text-accent-teal" : "bg-red-500/10 text-red-400"
            )}>
              {saveMsg()!.text}
            </span>
          </Show>
          <button
            onClick={handleSave}
            disabled={saving() || Object.keys(dirty()).length === 0}
            class="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-teal/10 border border-accent-teal/30 text-accent-teal text-xs font-bold hover:bg-accent-teal/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={14} />
            {saving() ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <Show when={config()} fallback={
        <div class="flex items-center justify-center py-12 text-text-muted">
          <RefreshCw size={20} class="animate-spin mr-2" /> Loading configuration...
        </div>
      }>
        {/* Core Config */}
        <div class="glass-card p-6">
          <h3 class="text-sm font-bold mb-4 uppercase tracking-widest text-text-secondary">Charge Point Settings</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <For each={configFields}>
              {(field) => (
                <div class={cn(
                  "space-y-1",
                  field.type === "text" || field.type === "password" ? "md:col-span-1" : "",
                  field.key === "connection_url" && "md:col-span-2"
                )}>
                  <label class="text-[10px] font-bold uppercase tracking-widest text-text-muted flex items-center gap-1.5">
                    {field.icon && <field.icon size={10} />}
                    {field.label}
                  </label>

                  {field.type === "toggle" ? (
                    <button
                      onClick={() => updateField(field.key, !currentValue(field.key))}
                      class={cn(
                        "w-10 h-5 rounded-full relative transition-colors",
                        currentValue(field.key) ? "bg-accent-teal" : "bg-zinc-700"
                      )}
                    >
                      <div class={cn(
                        "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
                        currentValue(field.key) ? "left-5" : "left-0.5"
                      )} />
                    </button>
                  ) : field.type === "select" ? (
                    <select
                      value={currentValue(field.key) || ""}
                      onChange={(e) => updateField(field.key, e.currentTarget.value)}
                      class="w-full bg-bg-main border border-border-default rounded-lg px-3 py-2 text-xs focus:border-accent-teal/50 focus:outline-none transition-colors"
                    >
                      <For each={field.options}>
                        {(opt) => <option value={opt}>{opt}</option>}
                      </For>
                    </select>
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

        {/* OCPP Configuration Keys */}
        <div class="glass-card">
          <button
            onClick={() => setOcppExpanded(!ocppExpanded())}
            class="w-full flex items-center justify-between p-6 text-left"
          >
            <h3 class="text-sm font-bold uppercase tracking-widest text-text-secondary flex items-center gap-2">
              <Key size={14} />
              OCPP Configuration Keys
              <Show when={ocppKeys()}>
                <span class="text-[10px] font-normal text-text-muted">({ocppKeys()!.length} keys)</span>
              </Show>
            </h3>
            {ocppExpanded() ? <ChevronDown size={16} class="text-text-muted" /> : <ChevronRight size={16} class="text-text-muted" />}
          </button>

          <Show when={ocppExpanded()}>
            <div class="px-6 pb-6">
              <div class="border border-border-default rounded-lg overflow-hidden">
                <div class="grid grid-cols-[1fr_1fr_80px] gap-0 text-[10px] font-bold uppercase tracking-widest text-text-muted bg-bg-secondary/50 px-4 py-2 border-b border-border-default">
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
                              <button onClick={() => setEditingKey(null)} class="text-text-muted hover:text-red-400">
                                <X size={12} />
                              </button>
                            </div>
                          </Show>
                        </div>
                        <div class="flex justify-center gap-2">
                          <span class={cn(
                            "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase",
                            entry.readonly ? "bg-orange-500/10 text-orange-400" : "bg-accent-teal/10 text-accent-teal"
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
        <div class="glass-card">
          <button
            onClick={() => setLocalAuthExpanded(!localAuthExpanded())}
            class="w-full flex items-center justify-between p-6 text-left"
          >
            <h3 class="text-sm font-bold uppercase tracking-widest text-text-secondary flex items-center gap-2">
              <Users size={14} />
              Local Authorization List
              <Show when={localAuth()}>
                <span class="text-[10px] font-normal text-text-muted">
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
                    "text-[10px] px-2 py-0.5 rounded font-bold uppercase",
                    localAuth()!.enabled ? "bg-accent-teal/10 text-accent-teal" : "bg-red-500/10 text-red-400"
                  )}>
                    {localAuth()!.enabled ? "Enabled" : "Disabled"}
                  </span>
                </Show>
                <div class="flex gap-2">
                  <button
                    onClick={() => setAddingAuthEntry(!addingAuthEntry())}
                    class="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-accent-teal/10 border border-accent-teal/30 text-accent-teal font-bold hover:bg-accent-teal/20 transition-all"
                  >
                    <Plus size={10} />
                    Add Entry
                  </button>
                  <button
                    onClick={handleClearAuthList}
                    disabled={!localAuth() || localAuth()!.entry_count === 0}
                    class="flex items-center gap-1 px-2 py-1 rounded text-[10px] border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
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
                      <label class="text-[10px] font-bold uppercase tracking-widest text-text-muted">ID Tag</label>
                      <input type="text" value={newAuthIdTag()} onInput={(e) => setNewAuthIdTag(e.currentTarget.value)} placeholder="Tag001"
                        class="w-full bg-bg-main border border-border-default rounded px-2 py-1.5 text-xs font-mono focus:border-accent-teal/50 focus:outline-none" />
                    </div>
                    <div class="space-y-1">
                      <label class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Status</label>
                      <select value={newAuthStatus()} onChange={(e) => setNewAuthStatus(e.currentTarget.value)}
                        class="w-full bg-bg-main border border-border-default rounded px-2 py-1.5 text-xs focus:border-accent-teal/50 focus:outline-none">
                        <option value="Accepted">Accepted</option>
                        <option value="Blocked">Blocked</option>
                        <option value="Expired">Expired</option>
                        <option value="Invalid">Invalid</option>
                      </select>
                    </div>
                    <div class="space-y-1">
                      <label class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Expiry (optional)</label>
                      <input type="datetime-local" value={newAuthExpiry()} onInput={(e) => setNewAuthExpiry(e.currentTarget.value)}
                        class="w-full bg-bg-main border border-border-default rounded px-2 py-1.5 text-xs font-mono focus:border-accent-teal/50 focus:outline-none" />
                    </div>
                    <div class="flex gap-2">
                      <button onClick={handleAddAuthEntry} disabled={!newAuthIdTag()}
                        class="px-3 py-1.5 rounded bg-accent-teal text-bg-main text-[10px] font-bold hover:bg-accent-teal/90 transition-colors disabled:opacity-50">
                        Add
                      </button>
                      <button onClick={() => setAddingAuthEntry(false)}
                        class="px-3 py-1.5 rounded border border-border-default text-[10px] hover:bg-white/5 transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </Show>

              {/* Entries table */}
              <div class="border border-border-default rounded-lg overflow-hidden">
                <div class="grid grid-cols-[1fr_100px_1fr_60px] gap-0 text-[10px] font-bold uppercase tracking-widest text-text-muted bg-bg-secondary/50 px-4 py-2 border-b border-border-default">
                  <span>ID Tag</span>
                  <span>Status</span>
                  <span>Expiry</span>
                  <span class="text-center">Actions</span>
                </div>
                <div class="max-h-64 overflow-y-auto custom-scrollbar divide-y divide-border-default">
                  <Show when={localAuth()?.entries && localAuth()!.entries.length > 0} fallback={
                    <div class="px-4 py-6 text-center text-text-muted text-xs italic">
                      No authorization entries
                    </div>
                  }>
                    <For each={localAuth()?.entries}>
                      {(entry) => (
                        <div class="grid grid-cols-[1fr_100px_1fr_60px] gap-0 px-4 py-2 text-xs items-center hover:bg-white/[0.02]">
                          <span class="font-mono text-text-secondary">{entry.id_tag}</span>
                          <span class={cn(
                            "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase w-fit",
                            entry.status === "Accepted" ? "bg-green-500/10 text-green-400" :
                            entry.status === "Blocked" ? "bg-red-500/10 text-red-400" :
                            entry.status === "Expired" ? "bg-orange-500/10 text-orange-400" :
                            "bg-yellow-500/10 text-yellow-400"
                          )}>
                            {entry.status}
                          </span>
                          <span class="text-text-muted font-mono text-[10px]">
                            {entry.expiry_date ? new Date(entry.expiry_date).toLocaleString() : "—"}
                          </span>
                          <div class="flex justify-center">
                            <button
                              onClick={() => handleDeleteAuthEntry(entry.id_tag)}
                              class="text-red-400 hover:text-red-300 p-1"
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
  );
}
