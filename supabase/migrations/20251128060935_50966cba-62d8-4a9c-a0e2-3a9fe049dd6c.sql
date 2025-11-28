-- Add supplier_id column to sales table
ALTER TABLE public.sales 
ADD COLUMN supplier_id uuid REFERENCES public.suppliers(id);

-- Add index for better query performance
CREATE INDEX idx_sales_supplier_id ON public.sales(supplier_id);