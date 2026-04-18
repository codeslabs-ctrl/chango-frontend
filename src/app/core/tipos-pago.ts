/** Alineado con `backend/src/utils/metodosPago.ts` */
export const TIPO_PAGO_A_CONVENIR = 'A_CONVENIR';

export const OPCIONES_METODO_PAGO_LISTA: { value: string; label: string }[] = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'pago movil', label: 'Pago móvil' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'cashea', label: 'Cashea' },
  { value: 'divisa', label: 'Divisa' }
];

const NORMALIZE = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');

export function normalizarTipoPago(raw: string | null | undefined): string {
  const t = NORMALIZE(raw || '');
  if (!t) return TIPO_PAGO_A_CONVENIR;
  if (t === 'a convenir' || t === 'a_convenir' || t === 'aconvenir') return TIPO_PAGO_A_CONVENIR;
  if (t === 'efectivo') return 'efectivo';
  if (t === 'transaccion' || t.includes('transfer')) return 'transferencia';
  if (t === 'pagomovil' || t === 'pago movil' || t.includes('pago movil')) return 'pago movil';
  if (t.includes('cashea')) return 'cashea';
  if (t === 'divisa' || t === 'dolar' || t === 'dolares' || t === 'usd') return 'divisa';
  return (raw || '').trim() || TIPO_PAGO_A_CONVENIR;
}

export function etiquetaTipoPago(codigo: string | null | undefined): string {
  const c = normalizarTipoPago(codigo);
  switch (c) {
    case 'efectivo':
      return 'Efectivo';
    case 'transferencia':
      return 'Transferencia';
    case 'pago movil':
      return 'Pago móvil';
    case 'cashea':
      return 'Cashea';
    case 'divisa':
      return 'Divisa';
    case TIPO_PAGO_A_CONVENIR:
      return 'A convenir';
    default:
      return codigo?.trim() ? codigo : '-';
  }
}

export function requiereReferenciaTipoPago(tipo: string | null | undefined): boolean {
  const n = normalizarTipoPago(tipo);
  return n === 'transferencia' || n === 'pago movil';
}

export function esTipoPagoEnListaScroll(tipo: string | null | undefined): boolean {
  const n = normalizarTipoPago(tipo);
  return OPCIONES_METODO_PAGO_LISTA.some(o => o.value === n);
}
