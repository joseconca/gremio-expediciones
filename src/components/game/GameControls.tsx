"use client";

import DPad from "./DPad";
import ActionButtons from "./ActionButtons";

export default function GameControls() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between bg-gradient-to-t from-black/50 to-transparent px-5 pb-5 pt-12">
      <div className="pointer-events-auto">
        <DPad />
      </div>

      <div className="pointer-events-auto">
        <ActionButtons />
      </div>
    </div>
  );
}
