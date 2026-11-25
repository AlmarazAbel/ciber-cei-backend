import mongoose, { Schema, Document } from 'mongoose';
import type { MedioPago } from './Venta.js';

export interface IMovimientoCaja {
  _id?: mongoose.Types.ObjectId;
  fechaHora: string;
  tipo: 'ingreso' | 'egreso';
  concepto: string;
  monto: number;
  medioPago: MedioPago;
}

export interface ICierreCaja {
  _id?: mongoose.Types.ObjectId;
  fechaHora: string;
  cajero: string;
  fondoInicial: number;
  ventasEfectivo: number;
  ventasTransferencia: number;
  ventasTarjeta: number;
  ingresosManuales: number;
  egresosManuales: number;
  efectivoTeorico: number;
  efectivoContado: number;
  diferencia: number;
  observacion?: string;
}

export interface IArqueo extends Document {
  clave: string;
  fondoInicial: number;
  movimientos: IMovimientoCaja[];
  cierres: ICierreCaja[];
}

const movimientoSchema = new Schema<IMovimientoCaja>({
  fechaHora: { type: String, required: true },
  tipo: { type: String, enum: ['ingreso', 'egreso'], required: true },
  concepto: { type: String, required: true },
  monto: { type: Number, required: true },
  medioPago: {
    type: String,
    enum: ['Efectivo', 'Transferencia', 'Tarjeta'],
    required: true,
  },
});

const cierreSchema = new Schema<ICierreCaja>({
  fechaHora: { type: String, required: true },
  cajero: { type: String, required: true },
  fondoInicial: { type: Number, required: true },
  ventasEfectivo: { type: Number, required: true },
  ventasTransferencia: { type: Number, required: true },
  ventasTarjeta: { type: Number, required: true },
  ingresosManuales: { type: Number, required: true },
  egresosManuales: { type: Number, required: true },
  efectivoTeorico: { type: Number, required: true },
  efectivoContado: { type: Number, required: true },
  diferencia: { type: Number, required: true },
  observacion: String,
});

const arqueoSchema = new Schema<IArqueo>(
  {
    clave: { type: String, default: 'turno_actual', unique: true },
    fondoInicial: { type: Number, default: 0 },
    movimientos: { type: [movimientoSchema], default: [] },
    cierres: { type: [cierreSchema], default: [] },
  },
  { timestamps: true }
);

export const Arqueo = mongoose.model<IArqueo>('Arqueo', arqueoSchema);