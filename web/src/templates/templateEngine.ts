export type TemplateVars = Record<string, any>;

export function interpolate(template: string, vars: TemplateVars): string {
  return template.replace(/{{\s*([\w\.]+)\s*}}/g, (_, key) => {
    const value = key.split('.').reduce<any>((acc, k) => (acc ? acc[k] : undefined), vars);
    return value !== undefined && value !== null ? String(value) : '';
  });
}

export function computeDerived(vars: TemplateVars, computed: Record<string, string>): TemplateVars {
  const out: TemplateVars = { ...vars };
  for (const [k, expr] of Object.entries(computed || {})) {
    // Support {{dirname var}} helper or simple interpolation
    const dirnameMatch = expr.match(/{{\s*dirname\s+([\w\.]+)\s*}}/);
    if (dirnameMatch) {
      const key = dirnameMatch[1];
      const value = key.split('.').reduce<any>((acc, kk) => (acc ? acc[kk] : undefined), vars);
      if (typeof value === 'string') {
        const idx = value.lastIndexOf('/');
        out[k] = idx > 0 ? value.substring(0, idx) : '/';
      } else {
        out[k] = '';
      }
    } else {
      out[k] = interpolate(expr, vars);
    }
  }
  return out;
}
