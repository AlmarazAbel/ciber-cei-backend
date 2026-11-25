import { Router, Response } from 'express';
import { Producto } from '../models/Producto.js';
import {
  exigirRol,
  verificarToken,
  type AuthRequest,
} from '../middleware/authMiddleware.js';

const router = Router();
router.use(verificarToken);

router.get('/', async (_req: AuthRequest, res: Response): Promise<void> => {
  const items = await Producto.find().sort({ createdAt: -1 });
  res.json(
    items.map((p) => ({
      id: p.codigo,
      nombre: p.nombre,
      tipo: p.tipo,
      precio: p.precio,
      precioCompra: p.precioCompra,
      stock: p.stock,
      imagenUrl: p.imagenUrl,
    }))
  );
});

router.post('/', exigirRol('Admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const tipo = req.body?.tipo === 'servicio' ? 'servicio' : 'articulo';
  const codigo =
    String(req.body?.id || req.body?.codigo || '').trim() ||
    `${tipo === 'servicio' ? 'srv' : 'art'}-${Date.now().toString().slice(-6)}`;

  const existe = await Producto.findOne({ codigo });
  if (existe) {
    res.status(409).json({ error: `Ya existe un ítem con el código "${codigo}"` });
    return;
  }

  const creado = await Producto.create({
    codigo,
    nombre: String(req.body?.nombre || '').trim(),
    tipo,
    precio: Number(req.body?.precio) || 0,
    precioCompra:
      typeof req.body?.precioCompra === 'number' ? req.body.precioCompra : undefined,
    stock: typeof req.body?.stock === 'number' ? req.body.stock : undefined,
    imagenUrl: req.body?.imagenUrl,
  });

  res.status(201).json({
    id: creado.codigo,
    nombre: creado.nombre,
    tipo: creado.tipo,
    precio: creado.precio,
    precioCompra: creado.precioCompra,
    stock: creado.stock,
    imagenUrl: creado.imagenUrl,
  });
});

router.put('/:codigo', exigirRol('Admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const actualizado = await Producto.findOneAndUpdate(
    { codigo: req.params.codigo },
    {
      nombre: req.body?.nombre,
      tipo: req.body?.tipo,
      precio: req.body?.precio,
      precioCompra: req.body?.precioCompra,
      stock: req.body?.stock,
      imagenUrl: req.body?.imagenUrl,
    },
    { new: true }
  );

  if (!actualizado) {
    res.status(404).json({ error: 'Producto no encontrado' });
    return;
  }

  res.json({
    id: actualizado.codigo,
    nombre: actualizado.nombre,
    tipo: actualizado.tipo,
    precio: actualizado.precio,
    precioCompra: actualizado.precioCompra,
    stock: actualizado.stock,
    imagenUrl: actualizado.imagenUrl,
  });
});

router.delete('/:codigo', exigirRol('Admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  await Producto.findOneAndDelete({ codigo: req.params.codigo });
  res.json({ ok: true });
});

export default router;