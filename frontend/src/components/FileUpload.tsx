/** File picker for CSV and JSON process data. */

import { useRef } from "react";

interface FileUploadProps {
  disabled: boolean;
  onFile: (file: File) => void;
}

/** Trigger a file picker and hand the chosen file to the caller. */
export default function FileUpload({ disabled, onFile }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-wrap items-center gap-3">
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
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Upload CSV or JSON
      </button>
      <span className="text-xs text-slate-500">Maximum file size 1 MB.</span>
    </div>
  );
}
