import { Router, Response } from 'express';
import { Arqueo, type IArqueo } from '../models/Arqueo.js';
import {
  exigirRol,
  verificarToken,
  type AuthRequest,
} from '../middleware/authMiddleware.js';

const router = Router();
router.use(verificarToken, exigirRol('Admin'));

async function obtenerOcrearDocumento(): Promise<IArqueo> {
  let doc = await Arqueo.findOne({ clave: 'turno_actual' });
  if (!doc) {
    doc = await Arqueo.create({
      clave: 'turno_actual',
      fondoInicial: 0,
      movimientos: [],
      cierres: [],
    });
  }
  return doc;
}

router.get('/', async (_req: AuthRequest, res: Response): Promise<void> => {
  const doc = await obtenerOcrearDocumento();
  res.json({
    fondoInicial: doc.fondoInicial,
    movimientos: doc.movimientos.map((m) => ({
      id: String(m._id),
      fechaHora: m.fechaHora,
      tipo: m.tipo,
      concepto: m.concepto,
      monto: m.monto,
      medioPago: m.medioPago,
    })),
    cierres: doc.cierres.map((c) => ({
      id: String(c._id),
      fechaHora: c.fechaHora,
      cajero: c.cajero,
      fondoInicial: c.fondoInicial,
      ventasEfectivo: c.ventasEfectivo,
      ventasTransferencia: c.ventasTransferencia,
      ventasTarjeta: c.ventasTarjeta,
      ingresosManuales: c.ingresosManuales,
      egresosManuales: c.egresosManuales,
      efectivoTeorico: c.efectivoTeorico,
      efectivoContado: c.efectivoContado,
      diferencia: c.diferencia,
      observacion: c.observacion,
    })),
  });
});

router.put('/fondo', async (req: AuthRequest, res: Response): Promise<void> => {
  const monto = Math.max(0, Number(req.body?.fondoInicial) || 0);
  const doc = await obtenerOcrearDocumento();
  doc.fondoInicial = monto;
  await doc.save();
  res.json({ fondoInicial: doc.fondoInicial });
});

router.post('/movimientos', async (req: AuthRequest, res: Response): Promise<void> => {
  const doc = await obtenerOcrearDocumento();
  const fechaHora = new Date().toLocaleString('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
  doc.movimientos.unshift({
    tipo: req.body?.tipo === 'egreso' ? 'egreso' : 'ingreso',
    concepto: String(req.body?.concepto || '').trim(),
    monto: Number(req.body?.monto) || 0,
    medioPago: req.body?.medioPago || 'Efectivo',
    fechaHora,
  });
  await doc.save();
  const agregado = doc.movimientos[0];
  res.status(201).json({
    id: String(agregado._id),
    fechaHora: agregado.fechaHora,
    tipo: agregado.tipo,
    concepto: agregado.concepto,
    monto: agregado.monto,
    medioPago: agregado.medioPago,
  });
});

router.delete('/movimientos/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const doc = await obtenerOcrearDocumento();
  doc.movimientos = doc.movimientos.filter(
    (m) => String(m._id) !== req.params.id
  );
  await doc.save();
  res.json({ ok: true });
});

router.post('/cierres', async (req: AuthRequest, res: Response): Promise<void> => {
  const doc = await obtenerOcrearDocumento();
  const fechaHora = new Date().toLocaleString('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
  doc.cierres.unshift({
    ...req.body,
    fechaHora,
  });
  await doc.save();
  const creado = doc.cierres[0];
  res.status(201).json({
    id: String(creado._id),
    fechaHora: creado.fechaHora,
    cajero: creado.cajero,
    fondoInicial: creado.fondoInicial,
    ventasEfectivo: creado.ventasEfectivo,
    ventasTransferencia: creado.ventasTransferencia,
    ventasTarjeta: creado.ventasTarjeta,
    ingresosManuales: creado.ingresosManuales,
    egresosManuales: creado.egresosManuales,
    efectivoTeorico: creado.efectivoTeorico,
    efectivoContado: creado.efectivoContado,
    diferencia: creado.diferencia,
    observacion: creado.observacion,
  });
});

export default router;