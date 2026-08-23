import type { defectEvents } from "../db/schema.js";

type DefectEventRow = typeof defectEvents.$inferSelect;

export function serializeDefectEvent(row: DefectEventRow) {
  return {
    id: row.id,
    created_at: row.createdAt.toISOString(),
    machine_id: row.machineId,
    anomaly_score: row.anomalyScore,
    bbox: { x: row.bboxX, y: row.bboxY, w: row.bboxW, h: row.bboxH },
    frames: { start: row.frameStart, end: row.frameEnd },
    evidence_url: row.evidencePath ? `/evidence/${row.evidencePath}` : null,
    session_id: row.sessionId,
    meter: row.meter,
    position: row.position,
    status: row.status,
    defect_type: row.defectType,
    suggested_defect_type: row.suggestedDefectType,
    suggestion_confidence: row.suggestionConfidence,
    suggestion_method: row.suggestionMethod,
    reject_reason: row.rejectReason,
    verified_at: row.verifiedAt ? row.verifiedAt.toISOString() : null,
    verified_by: row.verifiedBy,
  };
}
