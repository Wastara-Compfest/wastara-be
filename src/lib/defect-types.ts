import { z } from "zod";

/** Human-confirmed defect categories (PRD). */
export const DEFECT_TYPES = [
  "broken_yarn",
  "hole",
  "pattern_anomaly",
  "texture_anomaly",
  "unknown",
] as const;

export type DefectType = (typeof DEFECT_TYPES)[number];

export const defectTypeSchema = z.enum(DEFECT_TYPES);

export const DEFECT_TYPE_LABELS: Record<DefectType, string> = {
  broken_yarn: "Broken yarn",
  hole: "Hole",
  pattern_anomaly: "Pattern anomaly",
  texture_anomaly: "Texture anomaly",
  unknown: "Unknown",
};

export function defectTypeOptions() {
  return DEFECT_TYPES.map((value) => ({
    value,
    label: DEFECT_TYPE_LABELS[value],
  }));
}
