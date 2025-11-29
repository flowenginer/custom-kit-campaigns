import { useElapsedTime } from "@/hooks/useElapsedTime";

interface ElapsedTimerProps {
  since: string;
  label: string;
  fontSize?: number;
}

export const ElapsedTimer = ({ since, label, fontSize = 12 }: ElapsedTimerProps) => {
  const elapsed = useElapsedTime(since);

  return (
    <div className="flex flex-col items-center">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="font-semibold text-card-foreground" style={{ fontSize: `${fontSize}px` }}>{elapsed}</span>
    </div>
  );
};
