"use client";

type ActionButton = "actionA" | "actionB" | "start";

interface ActionButtonProps {
  action: ActionButton;
  label: string;
}

function ActionButton({ action, label }: ActionButtonProps) {
  const emit = () => {
    document.dispatchEvent(
      new CustomEvent("VirtualAction", {
        detail: {
          action,
        },
      })
    );
  };

  return (
    <button
      type="button"
      aria-label={label}
      className={`${action === "start" ? "min-h-11 w-full rounded-xl text-sm" : "h-16 w-16 rounded-full text-xl"} touch-none bg-white/20 font-bold text-white backdrop-blur-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 active:bg-white/40`}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        emit();
      }}
      onClick={(event) => {
        if (event.detail === 0) emit();
      }}
    >
      {label}
    </button>
  );
}

export default function ActionButtons() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <ActionButton action="actionA" label="A" />
        <ActionButton action="actionB" label="B" />
      </div>
      <ActionButton action="start" label="Start" />
    </div>
  );
}
