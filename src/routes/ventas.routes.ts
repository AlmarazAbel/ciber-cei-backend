import { Router, Response } from 'express';
import { Venta, type IItemVenta } from '../models/Venta.js';
import { Producto } from '../models/Producto.js';
import {
  exigirRol,
  verificarToken,
  type AuthRequest,
} from '../middleware/authMiddleware.js';

const router = Router();
router.use(verificarToken);

router.get('/', exigirRol('Admin'), async (_req: AuthRequest, res: Response): Promise<void> => {
  const ventas = await Venta.find().sort({ createdAt: -1 });
  res.json(
    ventas.map((v) => ({
      idRegistro: String(v._id),
      numero: v.numero,
      fechaHora: v.fechaHora,
      cajero: v.cajero,
      tipoComprobante: v.tipoComprobante,
      datosCliente: v.datosCliente,
      items: v.items,
      total: v.total,
      medioPago: v.medioPago,
    }))
  );
});

router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const items: IItemVenta[] = Array.isArray(req.body?.items) ? req.body.items : [];
  if (items.length === 0) {
    res.status(400).json({ error: 'La venta debe tener al menos un ítem' });
    return;
  }

  const ultimaVenta = await Venta.findOne().sort({ numero: -1 });
  const numero = ultimaVenta ? ultimaVenta.numero + 1 : 1042;

for (const item of items) {
    if (item.tipo === 'articulo') {
      const producto = await Producto.findOne({ codigo: item.id });
      if (producto) {
        const cantidadVendida = Number(item.cantidad) || 1;
        const stockActual = typeof producto.stock === 'number' ? producto.stock : 0;
        producto.stock = Math.max(0, stockActual - cantidadVendida);
        await producto.save();
      }
    }
  }

  const creada = await Venta.create({
    numero,
    fechaHora:
      req.body?.fechaHora ||
      new Date().toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }),
    cajero: req.usuario?.nombre || 'Operador',
    tipoComprobante:
      req.body?.tipoComprobante === 'factura_arca' ? 'factura_arca' : 'comprobante',
    datosCliente: req.body?.datosCliente,
    items,
    total: Number(req.body?.total) || 0,
    medioPago: req.body?.medioPago || 'Efectivo',
  });

  res.status(201).json({
    idRegistro: String(creada._id),
    numero: creada.numero,
    fechaHora: creada.fechaHora,
    cajero: creada.cajero,
    tipoComprobante: creada.tipoComprobante,
    datosCliente: creada.datosCliente,
    items: creada.items,
    total: creada.total,
    medioPago: creada.medioPago,
  });
});

router.delete('/', exigirRol('Admin'), async (_req: AuthRequest, res: Response): Promise<void> => {
  await Venta.deleteMany({});
  res.json({ ok: true });
});

export default router;