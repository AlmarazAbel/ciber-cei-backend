import mongoose, { Schema, Document } from 'mongoose';

export type RolUsuario = 'Admin' | 'Empleado';

export interface IUsuario extends Document {
  nombre: string;
  usuario: string;
  passwordHash: string;
  rol: RolUsuario;
  activo: boolean;
}

const usuarioSchema = new Schema<IUsuario>(
  {
    nombre: { type: String, required: true, trim: true },
    usuario: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    rol: { type: String, enum: ['Admin', 'Empleado'], default: 'Empleado' },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Usuario = mongoose.model<IUsuario>('Usuario', usuarioSchema);