import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { conectarDB } from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import usuariosRoutes from './routes/usuarios.routes.js';
import catalogoRoutes from './routes/catalogo.routes.js';
import ventasRoutes from './routes/ventas.routes.js';
import arqueoRoutes from './routes/arqueo.routes.js';
import facturacionRoutes from './routes/facturacion.routes.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/catalogo', catalogoRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/arqueo', arqueoRoutes);
app.use('/api/facturacion', facturacionRoutes);

const PORT = process.env.PORT || 4000;

conectarDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Error al iniciar servidor:', err);
    process.exit(1);
  });