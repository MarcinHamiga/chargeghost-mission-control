import { createSignal, createResource, createEffect, For, Show } from "solid-js";
import { api, APIError } from "../../lib/api";
import { state } from "../../store/simulator";
import { addToast } from "../../store/toast";
import { Plus, Trash2, Layers, Eye } from "lucide-solid";
import { cn } from "../../lib/cn";
import { Select } from "../Select";
import { Panel, PanelHeader } from "../ui/Panel";
import { Button } from "../ui/Button";
import { Field, inputClass } from "../ui/Field";
import { PROFILE_KIND_OPTIONS, PROFILE_PURPOSE_OPTIONS, PROFILE_RATE_UNIT_OPTIONS } from "../../lib/select-options";

function defaultChargingProfileLimit(unit: "W" | "A"): number {
  return unit === "A" ? 32 : 7400;
}

export function ProfilesPanel() {
  const [profiles, { refetch: refetchProfiles }] = createResource(() => api.getChargingProfiles());

  const [addingProfile, setAddingProfile] = createSignal(false);
  const [profileConnectorId, setProfileConnectorId] = createSignal(1);
  const [profilePurpose, setProfilePurpose] = createSignal<string>("TxDefaultProfile");
  const [profileStackLevel, setProfileStackLevel] = createSignal(0);
  const [profileKind, setProfileKind] = createSignal<string>("Absolute");
  const [profileRateUnit, setProfileRateUnit] = createSignal<"W" | "A">("W");
  const [profilePeriods, setProfilePeriods] = createSignal<{ start_period: number; limit: number; number_phases?: number }[]>([
    { start_period: 0, limit: defaultChargingProfileLimit("W") },
  ]);

  const [compositeConnectorId, setCompositeConnectorId] = createSignal(1);
  const [compositeDuration, setCompositeDuration] = createSignal(3600);
  const [compositeResult, setCompositeResult] = createSignal<any>(null);
  const [showComposite, setShowComposite] = createSignal(false);

  createEffect(() => {
    state.wsInvalidation.chargingProfiles;
    refetchProfiles();
  });

  const appendProfilePeriod = () => {
    const periods = profilePeriods();
    const last = periods[periods.length - 1];
    setProfilePeriods([
      ...periods,
      { start_period: last ? last.start_period + 3600 : 0, limit: defaultChargingProfileLimit(profileRateUnit()) },
    ]);
  };

  const handleCreateProfile = async () => {
    try {
      await api.createChargingProfile({
        connector_id: profileConnectorId(),
        profile: {
          profile_id: Date.now() % 100000,
          connector_id: profileConnectorId(),
          purpose: profilePurpose() as "ChargePointMaxProfile" | "TxDefaultProfile" | "TxProfile",
          stack_level: profileStackLevel(),
          charging_profile_kind: profileKind() as "Absolute" | "Recurring" | "Relative",
          charging_rate_unit: profileRateUnit(),
          schedule_period: profilePeriods(),
        },
      });
      setAddingProfile(false);
      refetchProfiles();
      addToast("success", "Charging profile created");
    } catch (e: unknown) {
      const msg = e instanceof APIError && e.status === 409
        ? `Profile install conflict: ${e.message}`
        : e instanceof Error ? e.message : String(e);
      addToast("error", `Failed to create charging profile: ${msg}`);
    }
  };

  const handleDeleteProfile = async (profileId: number, connectorId?: number) => {
    try {
      await api.deleteChargingProfiles({ profile_id: profileId, connector_id: connectorId });
      refetchProfiles();
      addToast("success", `Profile #${profileId} deleted`);
    } catch (e: any) {
      addToast("error", `Failed to delete charging profile: ${e.message || e}`);
    }
  };

  const handleGetCompositeSchedule = async () => {
    try {
      const result = await api.getCompositeSchedule(compositeConnectorId(), compositeDuration());
      setCompositeResult(result);
      setShowComposite(true);
    } catch (e: any) {
      addToast("error", `Failed to get composite schedule: ${e.message || e}`);
    }
  };

  return (
    <Panel>
      <PanelHeader
        icon={<Layers size={15} class="text-accent-teal" />}
        title={
          <span class="flex items-center gap-2">
            Charging profiles
            <Show when={profiles()}>
              <span class="text-xs font-normal text-text-muted tnum">({profiles()!.length})</span>
            </Show>
          </span>
        }
        aside={
          <div class="flex gap-2">
            <Button variant="ghost" size="sm" icon={<Eye size={12} />} onClick={() => setShowComposite(!showComposite())}>Composite</Button>
            <Button variant="primary" size="sm" icon={<Plus size={12} />} onClick={() => setAddingProfile(!addingProfile())}>Add</Button>
          </div>
        }
      />

      <div class="p-5 space-y-4">
        {/* Composite schedule viewer */}
        <Show when={showComposite()}>
          <div class="p-3 rounded-lg border border-info/20 bg-info/5 space-y-3">
            <div class="flex items-end gap-3">
              <Field label="Connector ID">
                <input type="number" value={compositeConnectorId()} onInput={(e) => setCompositeConnectorId(Number(e.currentTarget.value))} class={cn(inputClass, "w-20")} />
              </Field>
              <Field label="Duration (s)">
                <input type="number" value={compositeDuration()} onInput={(e) => setCompositeDuration(Number(e.currentTarget.value))} class={cn(inputClass, "w-24")} />
              </Field>
              <button onClick={handleGetCompositeSchedule} class="px-3 py-2 rounded-lg bg-info/15 text-info text-xs font-semibold hover:bg-info/25 transition-colors">Get schedule</button>
            </div>
            <Show when={compositeResult()}>
              <pre class="text-[11px] font-mono text-text-secondary max-h-40 overflow-auto custom-scrollbar bg-bg-main/80 p-3 rounded-lg border border-border-default">
                {JSON.stringify(compositeResult(), null, 2)}
              </pre>
            </Show>
          </div>
        </Show>

        {/* Create profile form */}
        <Show when={addingProfile()}>
          <div class="p-3 rounded-lg border border-accent-teal/20 bg-accent-teal/5 space-y-3">
            <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Field label="Connector ID">
                <input type="number" value={profileConnectorId()} onInput={(e) => setProfileConnectorId(Number(e.currentTarget.value))} class={cn(inputClass, "w-full")} />
              </Field>
              <Field label="Stack level">
                <input type="number" value={profileStackLevel()} onInput={(e) => setProfileStackLevel(Number(e.currentTarget.value))} class={cn(inputClass, "w-full")} />
              </Field>
              <Field label="Purpose">
                <Select value={profilePurpose()} options={PROFILE_PURPOSE_OPTIONS} onChange={setProfilePurpose} aria-label="Profile purpose" />
              </Field>
              <Field label="Kind">
                <Select value={profileKind()} options={PROFILE_KIND_OPTIONS} onChange={setProfileKind} aria-label="Profile kind" />
              </Field>
              <Field label="Rate unit">
                <Select value={profileRateUnit()} options={PROFILE_RATE_UNIT_OPTIONS} onChange={setProfileRateUnit} aria-label="Rate unit" />
              </Field>
            </div>
            <div>
              <span class="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted block mb-1.5">Schedule periods</span>
              <For each={profilePeriods()}>
                {(period, idx) => (
                  <div class="flex items-center gap-2 mb-1.5">
                    <span class="text-xs text-text-muted w-6 tnum">#{idx() + 1}</span>
                    <input type="number" value={period.start_period} placeholder="Start (s)"
                      onInput={(e) => { const p = [...profilePeriods()]; p[idx()] = { ...p[idx()], start_period: Number(e.currentTarget.value) }; setProfilePeriods(p); }}
                      class={cn(inputClass, "w-24 py-1")} />
                    <input type="number" value={period.limit} placeholder={`Limit (${profileRateUnit()})`}
                      onInput={(e) => { const p = [...profilePeriods()]; p[idx()] = { ...p[idx()], limit: Number(e.currentTarget.value) }; setProfilePeriods(p); }}
                      class={cn(inputClass, "w-24 py-1")} />
                    <button onClick={() => setProfilePeriods(profilePeriods().filter((_, i) => i !== idx()))} class="p-1 rounded text-critical hover:bg-critical/10 transition-colors"><Trash2 size={11} /></button>
                  </div>
                )}
              </For>
              <button onClick={appendProfilePeriod} class="text-xs text-accent-teal hover:text-accent-teal-hover mt-1">+ Add period</button>
            </div>
            <div class="flex gap-2">
              <Button variant="primary" size="sm" onClick={handleCreateProfile}>Create profile</Button>
              <Button variant="ghost" size="sm" onClick={() => setAddingProfile(false)}>Cancel</Button>
            </div>
          </div>
        </Show>

        {/* Profile list */}
        <Show when={profiles() && profiles()!.length > 0} fallback={<p class="text-xs text-text-muted italic">No charging profiles configured</p>}>
          <div class="space-y-2">
            <For each={profiles()}>
              {(profile) => (
                <div class="p-3 rounded-lg border border-border-default bg-bg-main/50 text-xs">
                  <div class="flex items-center justify-between mb-1">
                    <span class="font-semibold text-text-primary">Profile #{profile.profile_id}</span>
                    <div class="flex items-center gap-2">
                      <span class="text-[10px] px-1.5 py-0.5 rounded bg-accent-teal/10 text-accent-teal">{profile.purpose}</span>
                      <button onClick={() => handleDeleteProfile(profile.profile_id, profile.connector_id)} class="p-0.5 rounded text-critical hover:bg-critical/10 transition-colors" title="Delete profile">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                  <div class="text-text-muted">
                    Connector {profile.connector_id} · Stack {profile.stack_level} · {profile.charging_profile_kind}
                  </div>
                  <Show when={profile.schedule_period.length > 0}>
                    <div class="mt-1.5 text-text-muted">
                      {profile.schedule_period.length} period(s) · max limit {Math.max(...profile.schedule_period.map((p) => p.limit))} {profile.charging_rate_unit}
                    </div>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    </Panel>
  );
}
