import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { Usuario } from '../models/Usuario.js';

export async function conectarDB(): Promise<void> {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ciber_cei_pos';
  await mongoose.connect(uri);
  console.log(`MongoDB conectado en: ${uri}`);

  const totalUsuarios = await Usuario.countDocuments();
  if (totalUsuarios === 0) {
    const username = (process.env.ADMIN_INIT_USER || 'abel').trim().toLowerCase();
    const rawPass = process.env.ADMIN_INIT_PASS || 'admin123';
    const nombre = (process.env.ADMIN_INIT_NAME || 'Abel').trim();
    const passwordHash = await bcrypt.hash(rawPass, 10);

    await Usuario.create({
      nombre,
      usuario: username,
      passwordHash,
      rol: 'Admin',
      activo: true,
    });
    console.log(`Usuario Admin inicial creado: @${username}`);
  }
}