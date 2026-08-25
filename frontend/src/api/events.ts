const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export interface WorkflowUpdateEvent {
  workflowId: string;
  type: string;
  message: string;
}

// Native EventSource auto-reconnects on drop, so this is the whole client —
// no library needed. Callers pair it with a slow fallback poll in case a
// connection never establishes (e.g. a proxy that blocks SSE).
export function subscribeToUpdates(onUpdate: (event: WorkflowUpdateEvent) => void): () => void {
  const source = new EventSource(`${API_BASE}/api/events`);
  source.onmessage = (e) => {
    try {
      onUpdate(JSON.parse(e.data) as WorkflowUpdateEvent);
    } catch {
      // ignore malformed events
    }
  };
  return () => source.close();
}
