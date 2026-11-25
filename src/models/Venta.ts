import mongoose, { Schema, Document } from 'mongoose';

export type MedioPago = 'Efectivo' | 'Transferencia' | 'Tarjeta';
export type TipoComprobante = 'comprobante' | 'factura_arca';

export interface IItemVenta {
  id: string;
  nombre: string;
  precio: number;
  cantidad: number;
  tipo: TipoItem;
}

type TipoItem = 'articulo' | 'servicio';

export interface IDatosCliente {
  razonSocial?: string;
  cuitDni?: string;
  condicionFiscal?: string;
  domicilio?: string;
}

export interface IVenta extends Document {
  numero: number;
  fechaHora: string;
  cajero: string;
  tipoComprobante: TipoComprobante;
  datosCliente?: IDatosCliente;
  items: IItemVenta[];
  total: number;
  medioPago: MedioPago;
}

const itemVentaSchema = new Schema<IItemVenta>(
  {
    id: { type: String, required: true },
    nombre: { type: String, required: true },
    precio: { type: Number, required: true },
    cantidad: { type: Number, required: true },
    tipo: { type: String, enum: ['articulo', 'servicio'], required: true },
  },
  { _id: false }
);

const ventaSchema = new Schema<IVenta>(
  {
    numero: { type: Number, required: true },
    fechaHora: { type: String, required: true },
    cajero: { type: String, required: true },
    tipoComprobante: {
      type: String,
      enum: ['comprobante', 'factura_arca'],
      required: true,
    },
    datosCliente: {
      razonSocial: String,
      cuitDni: String,
      condicionFiscal: String,
      domicilio: String,
    },
    items: { type: [itemVentaSchema], required: true },
    total: { type: Number, required: true },
    medioPago: {
      type: String,
      enum: ['Efectivo', 'Transferencia', 'Tarjeta'],
      required: true,
    },
  },
  { timestamps: true }
);

export const Venta = mongoose.model<IVenta>('Venta', ventaSchema);