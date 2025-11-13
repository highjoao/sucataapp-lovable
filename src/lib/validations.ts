import { z } from "zod";

// Material validation schema
export const materialSchema = z.object({
  name: z.string()
    .min(1, "Nome do material é obrigatório")
    .max(100, "Nome deve ter no máximo 100 caracteres")
    .trim(),
  unit_of_measure: z.string()
    .min(1, "Unidade de medida é obrigatória")
    .max(10, "Unidade deve ter no máximo 10 caracteres")
    .trim()
    .toUpperCase(),
});

export type MaterialFormData = z.infer<typeof materialSchema>;

// Supplier validation schema
export const supplierSchema = z.object({
  name: z.string()
    .min(1, "Nome do fornecedor é obrigatório")
    .max(100, "Nome deve ter no máximo 100 caracteres")
    .trim(),
  contact: z.string()
    .max(100, "Contato deve ter no máximo 100 caracteres")
    .trim()
    .optional()
    .or(z.literal("")),
  address: z.string()
    .max(255, "Endereço deve ter no máximo 255 caracteres")
    .trim()
    .optional()
    .or(z.literal("")),
});

export type SupplierFormData = z.infer<typeof supplierSchema>;

// Transaction validation schema
export const transactionSchema = z.object({
  type: z.enum(["BUY", "SELL"], {
    required_error: "Tipo de transação é obrigatório",
  }),
  material_id: z.string()
    .uuid("Selecione um material válido")
    .min(1, "Material é obrigatório"),
  supplier_id: z.string()
    .uuid("Selecione um fornecedor válido")
    .optional()
    .or(z.literal("")),
  quantity: z.number()
    .positive("Quantidade deve ser maior que zero")
    .max(999999, "Quantidade muito alta"),
  price_per_unit: z.number()
    .positive("Preço deve ser maior que zero")
    .max(999999, "Preço muito alto"),
  transaction_date: z.string()
    .optional()
    .or(z.date().transform(d => d.toISOString())),
});

export type TransactionFormData = z.infer<typeof transactionSchema>;

// Purchase validation schema
export const purchaseSchema = z.object({
  materialId: z.string()
    .uuid("Selecione um material válido")
    .min(1, "Material é obrigatório"),
  quantity: z.number()
    .positive("Quantidade deve ser maior que zero")
    .max(999999, "Quantidade muito alta"),
  unitPrice: z.number()
    .positive("Preço deve ser maior que zero")
    .max(999999, "Preço muito alto"),
  notes: z.string()
    .max(500, "Observações devem ter no máximo 500 caracteres")
    .optional()
    .or(z.literal("")),
});

export type PurchaseFormData = z.infer<typeof purchaseSchema>;

// Sale validation schema
export const saleSchema = z.object({
  materialId: z.string()
    .uuid("Selecione um material válido")
    .min(1, "Material é obrigatório"),
  quantity: z.number()
    .positive("Quantidade deve ser maior que zero")
    .max(999999, "Quantidade muito alta"),
  unitPrice: z.number()
    .positive("Preço deve ser maior que zero")
    .max(999999, "Preço muito alto"),
  notes: z.string()
    .max(500, "Observações devem ter no máximo 500 caracteres")
    .optional()
    .or(z.literal("")),
});

export type SaleFormData = z.infer<typeof saleSchema>;
