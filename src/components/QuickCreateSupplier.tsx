import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSuppliers } from "@/hooks/useSuppliers";
import { supplierSchema, type SupplierFormData } from "@/lib/validations";
import { Plus } from "lucide-react";

interface QuickCreateSupplierProps {
  onCreated?: (supplierId: string) => void;
}

export const QuickCreateSupplier = ({ onCreated }: QuickCreateSupplierProps) => {
  const { createSupplier, isCreating } = useSuppliers();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<SupplierFormData>({
    name: "",
    contact: "",
    address: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof SupplierFormData, string>>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = supplierSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof SupplierFormData, string>> = {};
      result.error.errors.forEach((error) => {
        if (error.path[0]) {
          fieldErrors[error.path[0] as keyof SupplierFormData] = error.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    createSupplier(result.data as any, {
      onSuccess: (data: any) => {
        setIsOpen(false);
        setFormData({ name: "", contact: "", address: "" });
        if (onCreated && data?.id) {
          onCreated(data.id);
        }
      },
    });
  };

  const handleClose = () => {
    setIsOpen(false);
    setFormData({ name: "", contact: "", address: "" });
    setErrors({});
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="w-full"
      >
        <Plus className="mr-2 h-4 w-4" />
        Criar Fornecedor
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Fornecedor Rapidamente</DialogTitle>
            <DialogDescription>
              Cadastre um novo fornecedor para usar nesta transação
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quick-supplier-name">Nome do Fornecedor*</Label>
              <Input
                id="quick-supplier-name"
                placeholder="Ex: Recicladora ABC"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick-supplier-contact">Contato</Label>
              <Input
                id="quick-supplier-contact"
                placeholder="Ex: (11) 98765-4321"
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              />
              {errors.contact && <p className="text-sm text-destructive">{errors.contact}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick-supplier-address">Endereço</Label>
              <Input
                id="quick-supplier-address"
                placeholder="Ex: Rua das Flores, 123"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
              {errors.address && <p className="text-sm text-destructive">{errors.address}</p>}
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Criando..." : "Criar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
