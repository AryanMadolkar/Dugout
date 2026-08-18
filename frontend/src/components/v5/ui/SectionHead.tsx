export function SectionHead({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="section-head">
      <h2 className="font-label flex-1 text-[12px] font-bold text-[var(--text-primary)]">{title}</h2>
      {right}
    </div>
  );
}
