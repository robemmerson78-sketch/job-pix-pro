import type { ProjectAnalysis } from "./analysis";
import { defaultQuoteDefaults, loadPreferences, type QuoteDefaults } from "./settings";

export type DocType = "quote" | "invoice";

export interface Task {
  id: string;
  text: string;
}

export interface Material {
  id: string;
  name: string;
  qty: number;
  price: number;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  address: string;
  type: DocType;
  createdAt: number;
  updatedAt: number;
  photos: string[];
  scope: string;
  tasks: Task[];
  materials: Material[];
  laborHours: number;
  laborRate: number;
  taxPercent: number;
  notes: string;
  paymentTerms?: string;
  validityDays?: number;
  depositPercent?: number;
}

export interface Contractor {
  name: string;
  business: string;
  phone: string;
  email: string;
  address: string;
  license: string;
  logo?: string;
}

export function emptyProject(name: string, defaults: QuoteDefaults = defaultQuoteDefaults): Project {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name,
    client: "",
    address: "",
    type: "quote",
    createdAt: now,
    updatedAt: now,
    photos: [],
    scope: "",
    tasks: [],
    materials: [],
    laborHours: 0,
    laborRate: defaults.laborRate,
    taxPercent: defaults.taxPercent,
    notes: "",
    paymentTerms: defaults.paymentTerms,
    validityDays: defaults.validityDays,
    depositPercent: defaults.depositPercent,
  };
}

export function totals(p: Project) {
  const materials = p.materials.reduce(
    (s, m) => s + (Number(m.qty) || 0) * (Number(m.price) || 0),
    0,
  );
  const labor = (Number(p.laborHours) || 0) * (Number(p.laborRate) || 0);
  const subtotal = materials + labor;
  const tax = subtotal * ((Number(p.taxPercent) || 0) / 100);
  return { materials, labor, subtotal, tax, total: subtotal + tax };
}

export const money = (n: number, currency?: string) =>
  n.toLocaleString(undefined, {
    style: "currency",
    currency: currency ?? loadPreferences().currency,
  });
