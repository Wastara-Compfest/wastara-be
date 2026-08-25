import {
  boolean,
  doublePrecision,
  integer,
  pgEnum,
  pgSequence,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const defectEventSeq = pgSequence("defect_event_seq", {
  startWith: 1,
  minValue: 1,
});

export const defectStatus = pgEnum("defect_status", [
  "PENDING_REVIEW",
  "CONFIRMED",
  "FALSE_POSITIVE",
]);

export const labelType = pgEnum("label_type", ["confirmed", "false_positive"]);

export const videoInspectionStatus = pgEnum("video_inspection_status", [
  "queued",
  "processing",
  "done",
  "failed",
]);

export const defectEvents = pgTable("defect_events", {
  id: text("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  machineId: text("machine_id").notNull(),

  anomalyScore: doublePrecision("anomaly_score").notNull(),

  bboxX: integer("bbox_x").notNull(),
  bboxY: integer("bbox_y").notNull(),
  bboxW: integer("bbox_w").notNull(),
  bboxH: integer("bbox_h").notNull(),

  frameStart: integer("frame_start").notNull(),
  frameEnd: integer("frame_end").notNull(),

  evidencePath: text("evidence_path"),

  sessionId: uuid("session_id").references(() => productionSessions.id),
  meter: doublePrecision("meter"),
  position: doublePrecision("position"),
  videoInspectionId: uuid("video_inspection_id").references(
    () => videoInspections.id,
  ),

  status: defectStatus("status").notNull().default("PENDING_REVIEW"),
  defectType: text("defect_type"),
  suggestedDefectType: text("suggested_defect_type"),
  suggestionConfidence: doublePrecision("suggestion_confidence"),
  suggestionMethod: text("suggestion_method"),
  rejectReason: text("reject_reason"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  verifiedBy: text("verified_by"),
});

export const productionSessions = pgTable("production_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  machineId: text("machine_id").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  metersProduced: doublePrecision("meters_produced"),
  defectCount: integer("defect_count").notNull().default(0),
});

export const videoInspections = pgTable("video_inspections", {
  id: uuid("id").primaryKey().defaultRandom(),
  machineId: text("machine_id").notNull(),
  filename: text("filename").notNull(),
  videoPath: text("video_path").notNull(),
  status: videoInspectionStatus("status").notNull().default("queued"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  defectCount: integer("defect_count").notNull().default(0),
  errorMessage: text("error_message"),
});

export const labeledSamples = pgTable("labeled_samples", {
  id: uuid("id").primaryKey().defaultRandom(),
  defectEventId: text("defect_event_id")
    .notNull()
    .references(() => defectEvents.id),
  label: labelType("label").notNull(),
  defectType: text("defect_type"),
  exportedToTraining: boolean("exported_to_training").notNull().default(false),
});
