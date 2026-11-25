import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Usuario, type IUsuario, type RolUsuario } from '../models/Usuario.js';

export interface AuthRequest extends Request {
  usuario?: IUsuario;
}

interface JwtPayloadPos {
  id: string;
  rol: RolUsuario;
}

export async function verificarToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      res.status(401).json({ error: 'Token no proporcionado' });
      return;
    }

    const secret = process.env.JWT_SECRET || 'cambia_esta_clave_secreta';
    const payload = jwt.verify(token, secret) as JwtPayloadPos;

    const usuario = await Usuario.findById(payload.id).select('-passwordHash');
    if (!usuario || !usuario.activo) {
      res.status(401).json({ error: 'Usuario inválido o inactivo' });
      return;
    }

    req.usuario = usuario;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

export function exigirRol(...rolesPermitidos: RolUsuario[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
      res.status(403).json({ error: 'No tenés permisos para esta acción' });
      return;
    }
    next();
  };
}