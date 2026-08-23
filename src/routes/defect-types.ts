import { Hono } from "hono";

import { DEFECT_TYPE_LABELS, DEFECT_TYPES } from "../lib/defect-types.js";

export const defectTypesRoute = new Hono();

defectTypesRoute.get("/defect-types", (c) => {
  return c.json({
    items: DEFECT_TYPES.map((value) => ({
      value,
      label: DEFECT_TYPE_LABELS[value],
    })),
  });
});
