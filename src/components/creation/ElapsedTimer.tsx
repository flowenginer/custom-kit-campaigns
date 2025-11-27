import { useElapsedTime } from "@/hooks/useElapsedTime";

interface ElapsedTimerProps {
  since: string;
  label: string;
}

export const ElapsedTimer = ({ since, label }: ElapsedTimerProps) => {
  const elapsed = useElapsedTime(since);

  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="text-xs font-semibold">{elapsed}</span>
    </div>
  );
};
