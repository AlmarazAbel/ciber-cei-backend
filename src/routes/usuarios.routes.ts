import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Usuario, type RolUsuario } from '../models/Usuario.js';
import {
  exigirRol,
  verificarToken,
  type AuthRequest,
} from '../middleware/authMiddleware.js';

const router = Router();
router.use(verificarToken, exigirRol('Admin'));

router.get('/', async (_req: AuthRequest, res: Response): Promise<void> => {
  const usuarios = await Usuario.find().select('-passwordHash').sort({ createdAt: 1 });
  res.json(
    usuarios.map((u) => ({
      id: String(u._id),
      nombre: u.nombre,
      usuario: u.usuario,
      rol: u.rol,
      activo: u.activo,
    }))
  );
});

router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const nombre = String(req.body?.nombre || '').trim();
    const usuarioLimpio = String(req.body?.usuario || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '');
    const password = String(req.body?.password || '');
    const rol: RolUsuario = req.body?.rol === 'Admin' ? 'Admin' : 'Empleado';

    if (!nombre || !usuarioLimpio || !password) {
      res.status(400).json({ error: 'Nombre, usuario y contraseña son obligatorios' });
      return;
    }

    const existe = await Usuario.findOne({ usuario: usuarioLimpio });
    if (existe) {
      res.status(409).json({ error: `El usuario "${usuarioLimpio}" ya existe` });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const creado = await Usuario.create({
      nombre,
      usuario: usuarioLimpio,
      passwordHash,
      rol,
      activo: true,
    });

    res.status(201).json({
      id: String(creado._id),
      nombre: creado.nombre,
      usuario: creado.usuario,
      rol: creado.rol,
      activo: creado.activo,
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ error: 'No se pudo crear el usuario' });
  }
});

router.patch('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { rol, activo, password } = req.body as {
      rol?: RolUsuario;
      activo?: boolean;
      password?: string;
    };

    if (req.usuario && String(req.usuario._id) === id && (activo === false || (rol && rol !== 'Admin'))) {
      res.status(400).json({
        error: 'No podés desactivarte ni quitarte el rol Admin a vos mismo',
      });
      return;
    }

    const actualizacion: {
      rol?: RolUsuario;
      activo?: boolean;
      passwordHash?: string;
    } = {};

    if (rol === 'Admin' || rol === 'Empleado') actualizacion.rol = rol;
    if (typeof activo === 'boolean') actualizacion.activo = activo;
    if (password && password.trim().length >= 4) {
      actualizacion.passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    const actualizado = await Usuario.findByIdAndUpdate(id, actualizacion, {
      new: true,
    }).select('-passwordHash');

    if (!actualizado) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    res.json({
      id: String(actualizado._id),
      nombre: actualizado.nombre,
      usuario: actualizado.usuario,
      rol: actualizado.rol,
      activo: actualizado.activo,
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ error: 'No se pudo actualizar el usuario' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (req.usuario && String(req.usuario._id) === id) {
      res.status(400).json({ error: 'No podés eliminar tu propio usuario' });
      return;
    }

    const eliminado = await Usuario.findByIdAndDelete(id);
    if (!eliminado) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ error: 'No se pudo eliminar el usuario' });
  }
});

export default router;