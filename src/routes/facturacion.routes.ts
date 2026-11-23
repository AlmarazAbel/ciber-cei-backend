import { Router, Request, Response } from "express";
import { emitirFacturaC } from "../services/wsfeService.js";

const router = Router();

router.post("/arca", async (req: Request, res: Response) => {
  try {
    const importeTotal = Number(req.body.importeTotal);

    if (!importeTotal || importeTotal <= 0) {
      res.status(400).json({ ok: false, error: "El importeTotal debe ser mayor a 0" });
      return;
    }

    const factura = await emitirFacturaC({
      importeTotal,
      concepto: req.body.concepto ?? 1,
      docTipo: req.body.docTipo ?? 99,
      docNro: req.body.docNro ?? 0,
      condicionIvaReceptorId: req.body.condicionIvaReceptorId ?? 5,
    });

    res.status(200).json({ ok: true, data: factura });
  } catch (error) {
    console.error("Error completo en /api/facturacion/arca:", error);
    const causeMessage =
      error instanceof Error && error.cause instanceof Error
        ? error.cause.message
        : error instanceof Error && error.cause
        ? String(error.cause)
        : "";
    const mensaje = error instanceof Error ? error.message : "Error al emitir comprobante en ARCA";
    res.status(500).json({
      ok: false,
      error: causeMessage ? `${mensaje}: ${causeMessage}` : mensaje,
    });
  }
});

export default router;