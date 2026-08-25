import { createPortal } from "react-dom";

// Rendered via portal directly into <body> so it's a sibling of the app
// root, not a descendant of any positioned/z-indexed ancestor — otherwise
// a parent that creates its own stacking context (e.g. `relative z-10`)
// would trap this fixed layer above normal content instead of behind it.
export function AnimatedBackground() {
  return createPortal(
    <div className="background-blobs" aria-hidden>
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />
    </div>,
    document.body,
  );
}
