import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useMaterials } from "@/hooks/useMaterials";
import { materialSchema, type MaterialFormData } from "@/lib/validations";
import { Plus, Pencil, Trash2, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Materials = () => {
  const { materials, isLoading, createMaterial, updateMaterial, deleteMaterial, isCreating, isUpdating, isDeleting } = useMaterials();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<{ id: string; name: string; unit_of_measure: string } | null>(null);
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

    if (editingMaterial) {
      updateMaterial.mutate({ id: editingMaterial.id, ...result.data } as any, {
        onSuccess: () => {
          setIsDialogOpen(false);
          setFormData({ name: "", unit_of_measure: "" });
          setEditingMaterial(null);
        }
      });
    } else {
      createMaterial.mutate(result.data as any, {
        onSuccess: () => {
          setIsDialogOpen(false);
          setFormData({ name: "", unit_of_measure: "" });
          setEditingMaterial(null);
        }
      });
    }
  };

  const handleEdit = (material: typeof materials[0]) => {
    setEditingMaterial(material);
    setFormData({
      name: material.name,
      unit_of_measure: material.unit_of_measure,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este material?")) {
      deleteMaterial.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setFormData({ name: "", unit_of_measure: "" });
    setEditingMaterial(null);
    setErrors({});
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Materiais</h1>
          <p className="text-muted-foreground">Gerencie os tipos de materiais que você trabalha</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Material
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingMaterial ? "Editar Material" : "Novo Material"}</DialogTitle>
              <DialogDescription>
                {editingMaterial ? "Atualize as informações do material" : "Cadastre um novo tipo de material"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Material*</Label>
                <Input
                  id="name"
                  placeholder="Ex: Cobre, Alumínio, Ferro"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unidade de Medida*</Label>
                <Input
                  id="unit"
                  placeholder="Ex: KG, TON, UN"
                  value={formData.unit_of_measure}
                  onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })}
                />
                {errors.unit_of_measure && <p className="text-sm text-destructive">{errors.unit_of_measure}</p>}
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={handleDialogClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isCreating || isUpdating}>
                  {isCreating || isUpdating ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Materiais Cadastrados</CardTitle>
          <CardDescription>{materials.length} materiais registrados</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Carregando...</p>
          ) : materials.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum material cadastrado ainda</p>
              <p className="text-sm text-muted-foreground mt-2">Clique em "Novo Material" para começar</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Cadastrado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials.map((material) => (
                  <TableRow key={material.id}>
                    <TableCell className="font-medium">{material.name}</TableCell>
                    <TableCell>{material.unit_of_measure}</TableCell>
                    <TableCell>{new Date(material.created_at).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(material)}
                          disabled={isUpdating}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(material.id)}
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Materials;
