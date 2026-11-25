import mongoose, { Schema, Document } from 'mongoose';

export type TipoItem = 'articulo' | 'servicio';

export interface IProducto extends Document {
  codigo: string;
  nombre: string;
  tipo: TipoItem;
  precio: number;
  precioCompra?: number;
  stock?: number;
  imagenUrl?: string;
}

const productoSchema = new Schema<IProducto>(
  {
    codigo: { type: String, required: true, unique: true, trim: true },
    nombre: { type: String, required: true, trim: true },
    tipo: { type: String, enum: ['articulo', 'servicio'], default: 'articulo' },
    precio: { type: Number, required: true, min: 0 },
    precioCompra: { type: Number, min: 0 },
    stock: { type: Number, min: 0 },
    imagenUrl: { type: String, trim: true },
  },
  { timestamps: true }
);

export const Producto = mongoose.model<IProducto>('Producto', productoSchema);