import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Usuario } from '../models/Usuario.js';

const router = Router();

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const identificador = String(req.body?.usuario || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!identificador || !password) {
      res.status(400).json({ error: 'Ingresá usuario y contraseña' });
      return;
    }

    const encontrado = await Usuario.findOne({ usuario: identificador });
    if (!encontrado) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    if (!encontrado.activo) {
      res.status(403).json({ error: 'El usuario está desactivado' });
      return;
    }

    const passwordValida = await bcrypt.compare(password, encontrado.passwordHash);
    if (!passwordValida) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    const secret = process.env.JWT_SECRET || 'cambia_esta_clave_secreta';
    const token = jwt.sign(
      { id: String(encontrado._id), rol: encontrado.rol },
      secret,
      { expiresIn: '12h' }
    );

    res.json({
      token,
      usuario: {
        id: String(encontrado._id),
        nombre: encontrado.nombre,
        usuario: encontrado.usuario,
        rol: encontrado.rol,
        activo: encontrado.activo,
      },
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno al iniciar sesión' });
  }
});

export default router;