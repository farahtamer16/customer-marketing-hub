import { Loader2 } from "lucide-react";

export default function LoadingState({ label }: { label: string }) {
  return (
    <div className="glass-card flex min-h-64 items-center justify-center rounded-3xl text-sm text-slate-500">
      <Loader2 size={18} className="me-2 animate-spin" />
      {label}
    </div>
  );
}
