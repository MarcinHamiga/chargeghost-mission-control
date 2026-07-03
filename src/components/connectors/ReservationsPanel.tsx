import { createSignal, createResource, For, Show } from "solid-js";
import { api } from "../../lib/api";
import { state } from "../../store/simulator";
import { addToast } from "../../store/toast";
import { Plus, Trash2, Calendar } from "lucide-solid";
import { cn } from "../../lib/cn";
import { Panel, PanelHeader } from "../ui/Panel";
import { Button } from "../ui/Button";
import { Field, inputClass } from "../ui/Field";

export function ReservationsPanel() {
  const [reservations, { refetch: refetchReservations }] = createResource(() => api.getReservations());

  const [adding, setAdding] = createSignal(false);
  const [resConnectorId, setResConnectorId] = createSignal(1);
  const [resIdTag, setResIdTag] = createSignal("");
  const [resExpiryDate, setResExpiryDate] = createSignal("");
  const [resParentIdTag, setResParentIdTag] = createSignal("");
  const [resReservationId, setResReservationId] = createSignal(1);

  const activeReservations = () => state.snapshot?.reservations ?? reservations() ?? [];

  const handleCreate = async () => {
    try {
      await api.createReservation({
        reservation_id: resReservationId(),
        connector_id: resConnectorId(),
        id_tag: resIdTag(),
        expiry_date: new Date(resExpiryDate()).toISOString(),
        parent_id_tag: resParentIdTag() || null,
      });
      setAdding(false);
      setResIdTag("");
      setResExpiryDate("");
      setResParentIdTag("");
      refetchReservations();
      addToast("success", "Reservation created");
    } catch (e: any) {
      addToast("error", `Failed to create reservation: ${e.message || e}`);
    }
  };

  const handleCancel = async (id: number) => {
    try {
      await api.cancelReservation(id);
      refetchReservations();
      addToast("success", "Reservation cancelled");
    } catch (e: any) {
      addToast("error", `Failed to cancel reservation: ${e.message || e}`);
    }
  };

  return (
    <Panel>
      <PanelHeader
        icon={<Calendar size={15} class="text-accent-teal" />}
        title={
          <span class="flex items-center gap-2">
            Reservations
            <Show when={activeReservations().length > 0}>
              <span class="text-xs font-normal text-text-muted tnum">({activeReservations().length})</span>
            </Show>
          </span>
        }
        aside={
          <Button variant="primary" size="sm" icon={<Plus size={12} />} onClick={() => setAdding(!adding())}>
            Add reservation
          </Button>
        }
      />

      <div class="p-5 space-y-4">
        <Show when={adding()}>
          <div class="p-4 rounded-lg border border-accent-teal/20 bg-accent-teal/5 space-y-3">
            <div class="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
              <Field label="Reservation ID">
                <input type="number" value={resReservationId()} onInput={(e) => setResReservationId(Number(e.currentTarget.value))} class={cn(inputClass, "w-full")} />
              </Field>
              <Field label="Connector ID">
                <input type="number" value={resConnectorId()} onInput={(e) => setResConnectorId(Number(e.currentTarget.value))} class={cn(inputClass, "w-full")} />
              </Field>
              <Field label="ID Tag">
                <input type="text" value={resIdTag()} onInput={(e) => setResIdTag(e.currentTarget.value)} placeholder="e.g. Tag001" class={cn(inputClass, "w-full")} />
              </Field>
              <Field label="Expiry date">
                <input type="datetime-local" value={resExpiryDate()} onInput={(e) => setResExpiryDate(e.currentTarget.value)} class={cn(inputClass, "w-full")} />
              </Field>
              <div class="flex gap-2">
                <Button variant="primary" size="sm" onClick={handleCreate} disabled={!resIdTag() || !resExpiryDate()}>Create</Button>
                <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
              </div>
            </div>
            <Field label="Parent ID tag (optional)" class="max-w-xs">
              <input type="text" value={resParentIdTag()} onInput={(e) => setResParentIdTag(e.currentTarget.value)} placeholder="optional" class={cn(inputClass, "w-full")} />
            </Field>
          </div>
        </Show>

        <Show when={activeReservations().length > 0} fallback={<p class="text-xs text-text-muted italic">No active reservations</p>}>
          <div class="space-y-2">
            <For each={activeReservations()}>
              {(res) => (
                <div class="flex items-center justify-between p-3 rounded-lg border border-border-default bg-bg-main/50">
                  <div class="flex items-center gap-4 text-xs">
                    <span class="font-mono text-text-muted">#{res.reservation_id}</span>
                    <span class="text-text-secondary">Connector {res.connector_id}</span>
                    <span class="font-mono text-accent-teal">{res.id_tag}</span>
                    <span class="text-text-muted">Expires {new Date(res.expiry_date).toLocaleString()}</span>
                  </div>
                  <button onClick={() => handleCancel(res.reservation_id)} class="p-1.5 rounded-lg text-critical hover:bg-critical/10 transition-colors" title="Cancel reservation">
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    </Panel>
  );
}
