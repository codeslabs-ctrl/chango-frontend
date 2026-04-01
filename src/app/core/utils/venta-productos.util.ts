export interface VentaProductoDestaque {
  imagen_url?: string | null;
  descripcion?: string | null;
  cantidad?: number;
}

export interface VentaVisualProductos {
  left: VentaProductoDestaque | null;
  right: VentaProductoDestaque | null;
}

/**
 * Misma lógica que `normalizeProductosDestaque` en el backend (strings JSON, keys alternativas).
 */
export function parseProductosDestaque(raw: unknown): VentaProductoDestaque[] {
  if (raw == null) return [];

  let data: unknown = raw;

  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t || t === 'null') return [];
    try {
      data = JSON.parse(t);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(data)) return [];

  return data.map((item) => {
    if (!item || typeof item !== 'object') {
      return { imagen_url: null, descripcion: null, cantidad: 0 };
    }
    const o = item as Record<string, unknown>;
    const urlVal = o['imagen_url'] ?? o['imagenUrl'] ?? o['IMAGEN_URL'];
    const imagen_url =
      urlVal == null || urlVal === '' ? null : String(urlVal).trim() || null;
    const descVal = o['descripcion'];
    const descripcion = descVal == null ? null : String(descVal);
    const cantidad = Number(o['cantidad']);
    return {
      imagen_url,
      descripcion,
      cantidad: Number.isFinite(cantidad) ? cantidad : 0
    };
  });
}

export function ventaVisualFromDestaque(raw: unknown): VentaVisualProductos {
  const arr = parseProductosDestaque(raw);
  return {
    left: arr[0] ?? null,
    right: arr[1] ?? null
  };
}
