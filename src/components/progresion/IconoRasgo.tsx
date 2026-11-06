export default function IconoRasgo({ claseId, className = "h-8 w-8" }: { claseId: string; className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" className={`shrink-0 ${className}`} viewBox="0 0 24 24">
      <use href={`/sprites/rasgos.svg#${claseId}`} />
    </svg>
  );
}
