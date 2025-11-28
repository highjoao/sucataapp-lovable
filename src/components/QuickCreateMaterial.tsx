import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMaterials } from "@/hooks/useMaterials";
import { materialSchema, type MaterialFormData } from "@/lib/validations";
import { Plus } from "lucide-react";

interface QuickCreateMaterialProps {
  onCreated?: (materialId: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const QuickCreateMaterial = ({ onCreated, open: controlledOpen, onOpenChange: setControlledOpen }: QuickCreateMaterialProps) => {
  const { createMaterial, isCreating } = useMaterials();
  const [internalOpen, setInternalOpen] = useState(false);
  const [formData, setFormData] = useState<MaterialFormData>({
    name: "",
    unit_of_measure: "kg", // Default to kg
  });
  const [errors, setErrors] = useState<Partial<Record<keyof MaterialFormData, string>>>({});

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = isControlled ? setControlledOpen : setInternalOpen;

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
        if (setIsOpen) setIsOpen(false);
        setFormData({ name: "", unit_of_measure: "kg" });
        if (onCreated && data?.id) {
          onCreated(data.id);
        }
      },
    });
  };

  const handleClose = () => {
    if (setIsOpen) setIsOpen(false);
    setFormData({ name: "", unit_of_measure: "kg" });
    setErrors({});
  };

  return (
    <>
      {!isControlled && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setInternalOpen(true)}
          className="shrink-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) handleClose();
        else if (setIsOpen) setIsOpen(true);
      }}>
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
              <Select
                value={formData.unit_of_measure}
                onValueChange={(value) => setFormData({ ...formData, unit_of_measure: value as MaterialFormData["unit_of_measure"] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">KG</SelectItem>
                  <SelectItem value="g">G</SelectItem>
                  <SelectItem value="un">UN</SelectItem>
                  <SelectItem value="ton">TON</SelectItem>
                  <SelectItem value="peca">Peça</SelectItem>
                </SelectContent>
              </Select>
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
