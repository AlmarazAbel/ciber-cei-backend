import express from 'express';
import cors from 'cors';

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, servicio: 'ciber-cei-backend' });
});

app.post('/api/facturacion/arca', (req, res) => {
  const { total, cliente } = req.body ?? {};

  if (typeof total !== 'number' || total <= 0) {
    return res.status(400).json({ message: 'El total de la factura debe ser mayor a 0.' });
  }

  const vencimientoCae = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  return res.json({
    autorizada: true,
    puntoVenta: 1,
    numeroComprobante: Math.floor(10000 + Math.random() * 89999),
    cae: '74123456789012',
    vencimientoCae,
    receptor: cliente?.razonSocial ?? 'Consumidor Final',
  });
});

app.listen(PORT, () => {
  console.log(`Servidor Ciber Cei escuchando en http://localhost:${PORT}`);
});
