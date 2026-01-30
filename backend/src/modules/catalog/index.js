// backend/src/modules/catalog/index.js
import catalogRoutes from "./routes/catalogRoutes.js";

export const initCatalogModule = (app) => {
  app.use("/api/catalog", catalogRoutes);
};
