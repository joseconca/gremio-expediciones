"use client";

type ActionButton = "actionA" | "actionB";

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
      className="h-16 w-16 touch-none rounded-full bg-white/20 text-xl font-bold text-white backdrop-blur-sm active:bg-white/40"
      onPointerDown={(event) => {
        event.preventDefault();
        emit();
      }}
    >
      {label}
    </button>
  );
}

export default function ActionButtons() {
  return (
    <div className="flex items-center gap-4">
      <ActionButton action="actionA" label="A" />

      <ActionButton action="actionB" label="B" />
    </div>
  );
}
