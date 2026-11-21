/** Drag-and-drop file zone with sample data and clear actions. */

import { useRef, useState, type DragEvent, type KeyboardEvent } from "react";

interface FileUploadProps {
  disabled: boolean;
  error: string | null;
  onFile: (file: File) => void;
  onLoadSample: () => void;
  onClear: () => void;
}

/** Accept a CSV or JSON file by drop or browse, with upload feedback. */
export default function FileUpload({
  disabled,
  error,
  onFile,
  onLoadSample,
  onClear,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const openPicker = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (disabled) {
      return;
    }
    const file = event.dataTransfer.files?.[0];
    if (file) {
      onFile(file);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPicker();
    }
  };

  return (
    <section aria-labelledby="upload-heading">
      <h2 id="upload-heading" className="mb-2 text-xs font-medium text-muted">
        Upload processes
      </h2>

      <input
        ref={inputRef}
        id="file-upload"
        type="file"
        accept=".csv,.json,text/csv,application/json"
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) {
            onFile(file);
          }
        }}
      />

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-describedby="upload-hint"
        onClick={openPicker}
        onKeyDown={handleKeyDown}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) {
            setDragging(true);
          }
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-[10px] border border-dashed px-4 py-5 text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/50 ${
          dragging
            ? "border-primary bg-primary/10"
            : error
              ? "border-error/60 bg-error/5"
              : "border-line-strong bg-field hover:border-primary/50"
        } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 text-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" strokeLinecap="round" />
          <path d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3" strokeLinecap="round" />
        </svg>

        <p className="text-xs text-muted">
          Drop a CSV or JSON file here, or{" "}
          <span className="font-medium text-primary">browse</span>
        </p>
        <p id="upload-hint" className="text-[11px] leading-relaxed text-faint">
          Columns: pid, arrival, burst, priority. Optional priority. Up to 1 MB.
        </p>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-xs leading-snug text-error">
          {error} No rows were loaded.
        </p>
      )}

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={onLoadSample}
          disabled={disabled}
          className="flex-1 rounded-lg border border-line-soft bg-raised px-3 py-2 text-xs font-medium text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          Load sample data
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={disabled}
          className="flex-1 rounded-lg border border-line-soft bg-transparent px-3 py-2 text-xs font-medium text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          Clear all
        </button>
      </div>
    </section>
  );
}
