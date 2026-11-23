import "dotenv/config";
import express from "express";
import cors from "cors";
import facturacionRoutes from "./routes/facturacion.routes.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/facturacion", facturacionRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});