"use client";

import type { ProcessingPath } from "@/lib/ai/types";

interface ProcessingStatusProps {
  path: ProcessingPath;
  confidence: number;
}

const LOW_CONFIDENCE = 0.6;

export function ProcessingStatus({ path, confidence }: ProcessingStatusProps) {
  const isTemplateMode = path === "photo" && confidence < LOW_CONFIDENCE;

  let label: string;
  let colorClass: string;

  if (isTemplateMode) {
    label = "Template mode";
    colorClass = "bg-amber-100 text-amber-800";
  } else if (path === "photo") {
    label = "Photo mode";
    colorClass = "bg-blue-100 text-blue-800";
  } else {
    label = "Sketch mode";
    colorClass = "bg-green-100 text-green-800";
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${colorClass}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isTemplateMode ? "bg-amber-500" : path === "photo" ? "bg-blue-500" : "bg-green-500"
        }`}
      />
      {label}
      {path === "photo" && (
        <span className="ml-1 opacity-60">{Math.round(confidence * 100)}%</span>
      )}
    </span>
  );
}
