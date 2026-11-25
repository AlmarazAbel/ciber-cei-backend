import { Router, Response } from 'express';
import { Producto } from '../models/Producto.js';
import {
  exigirRol,
  verificarToken,
  type AuthRequest,
} from '../middleware/authMiddleware.js';

const router = Router();
router.use(verificarToken);

function serializarProducto(p: {
  codigo: string;
  codigoBarras?: string;
  nombre: string;
  tipo: string;
  precio: number;
  precioCompra?: number;
  stock?: number;
  imagenUrl?: string;
}) {
  return {
    id: p.codigo,
    codigo: p.codigo,
    codigoBarras: p.codigoBarras,
    nombre: p.nombre,
    tipo: p.tipo,
    precio: p.precio,
    precioCompra: p.precioCompra,
    stock: p.stock,
    imagen: p.imagenUrl,
    imagenUrl: p.imagenUrl,
  };
}

router.get('/', async (_req: AuthRequest, res: Response): Promise<void> => {
  const items = await Producto.find().sort({ createdAt: -1 });
  res.json(items.map(serializarProducto));
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

  const imagenValor = req.body?.imagenUrl ?? req.body?.imagen;
  const codigoBarrasValor =
    typeof req.body?.codigoBarras === 'string' && req.body.codigoBarras.trim() !== ''
      ? req.body.codigoBarras.trim()
      : undefined;

  const creado = await Producto.create({
    codigo,
    codigoBarras: codigoBarrasValor,
    nombre: String(req.body?.nombre || '').trim(),
    tipo,
    precio: Number(req.body?.precio) || 0,
    precioCompra:
      typeof req.body?.precioCompra === 'number' ? req.body.precioCompra : undefined,
    stock:
      tipo === 'articulo' && typeof req.body?.stock === 'number'
        ? req.body.stock
        : undefined,
    imagenUrl: typeof imagenValor === 'string' && imagenValor.trim() !== '' ? imagenValor.trim() : undefined,
  });

  res.status(201).json(serializarProducto(creado));
});

router.put('/:codigo', exigirRol('Admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const actual = await Producto.findOne({ codigo: req.params.codigo });
  if (!actual) {
    res.status(404).json({ error: 'Producto no encontrado' });
    return;
  }

  const tieneImagenEnBody =
    Object.prototype.hasOwnProperty.call(req.body ?? {}, 'imagenUrl') ||
    Object.prototype.hasOwnProperty.call(req.body ?? {}, 'imagen');
  const imagenEntrante = req.body?.imagenUrl ?? req.body?.imagen;

  const tieneCodigoBarrasEnBody = Object.prototype.hasOwnProperty.call(
    req.body ?? {},
    'codigoBarras'
  );

  if (req.body?.nombre !== undefined) {
    actual.nombre = String(req.body.nombre).trim();
  }
  if (req.body?.tipo === 'articulo' || req.body?.tipo === 'servicio') {
    actual.tipo = req.body.tipo;
  }
  if (req.body?.precio !== undefined) {
    actual.precio = Number(req.body.precio);
  }
  if (req.body?.precioCompra !== undefined) {
    actual.precioCompra = Number(req.body.precioCompra);
  }
  if (req.body?.stock !== undefined) {
    actual.stock = Number(req.body.stock);
  }
  if (tieneCodigoBarrasEnBody) {
    actual.codigoBarras =
      typeof req.body.codigoBarras === 'string' && req.body.codigoBarras.trim() !== ''
        ? req.body.codigoBarras.trim()
        : undefined;
  }
  if (tieneImagenEnBody) {
    actual.imagenUrl =
      typeof imagenEntrante === 'string' && imagenEntrante.trim() !== ''
        ? imagenEntrante.trim()
        : undefined;
  }

  const actualizado = await actual.save();
  res.json(serializarProducto(actualizado));
});

router.delete('/:codigo', exigirRol('Admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  await Producto.findOneAndDelete({ codigo: req.params.codigo });
  res.json({ ok: true });
});

export default router;