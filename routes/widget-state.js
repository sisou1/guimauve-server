import { getWidgetState } from "../services/widget-state.js";

export function registerWidgetStateRoute(app) {
  app.get("/widget-state", (_req, res) => {
    return res.json(getWidgetState());
  });
}
