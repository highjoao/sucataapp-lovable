import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMaterials } from "@/hooks/useMaterials";
import { materialSchema, type MaterialFormData } from "@/lib/validations";
import { Plus } from "lucide-react";

interface QuickCreateMaterialProps {
  onCreated?: (materialId: string) => void;
}

export const QuickCreateMaterial = ({ onCreated }: QuickCreateMaterialProps) => {
  const { createMaterial, isCreating } = useMaterials();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<MaterialFormData>({
    name: "",
    unit_of_measure: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof MaterialFormData, string>>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = materialSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof MaterialFormData, string>> = {};
      result.error.errors.forEach((error) => {
        if (error.path[0]) {
          fieldErrors[error.path[0] as keyof MaterialFormData] = error.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    createMaterial.mutate(result.data as any, {
      onSuccess: (data: any) => {
        setIsOpen(false);
        setFormData({ name: "", unit_of_measure: "" });
        if (onCreated && data?.id) {
          onCreated(data.id);
        }
      },
    });
  };

  const handleClose = () => {
    setIsOpen(false);
    setFormData({ name: "", unit_of_measure: "" });
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
        Criar Material
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Material Rapidamente</DialogTitle>
            <DialogDescription>
              Cadastre um novo material para usar nesta transação
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quick-name">Nome do Material*</Label>
              <Input
                id="quick-name"
                placeholder="Ex: Cobre, Alumínio, Ferro"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick-unit">Unidade de Medida*</Label>
              <Input
                id="quick-unit"
                placeholder="Ex: KG, TON, UN"
                value={formData.unit_of_measure}
                onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })}
              />
              {errors.unit_of_measure && <p className="text-sm text-destructive">{errors.unit_of_measure}</p>}
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
