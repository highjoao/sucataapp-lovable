import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Filter } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useSuppliers } from "@/hooks/useSuppliers";

interface Material {
  id: string;
  name: string;
  unit_of_measure: string;
}

interface Purchase {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  purchase_date: string;
  notes: string | null;
  supplier_id: string | null;
  materials: { name: string; unit_of_measure: string };
  suppliers?: { name: string } | null;
}

const Purchases = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all");
  const { toast } = useToast();
  const { suppliers } = useSuppliers();

  const [formData, setFormData] = useState({
    materialId: "",
    supplierId: "none",
    quantity: "",
    unitPrice: "",
    notes: "",
  });

  const fetchMaterials = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("materials")
      .select("*")
      .eq("user_id", user.id)
      .order("name");

    if (data) setMaterials(data);
  };

  const fetchPurchases = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("purchases")
      .select(`
        *,
        materials (name, unit_of_measure),
        suppliers (name)
      `)
      .eq("user_id", user.id)
      .order("purchase_date", { ascending: false });

    if (data) setPurchases(data as Purchase[]);
  };

  useEffect(() => {
    fetchMaterials();
    fetchPurchases();
  }, []);

  // Apply supplier filter
  useEffect(() => {
    if (selectedSupplier === "all") {
      setFilteredPurchases(purchases);
    } else if (selectedSupplier === "none") {
      setFilteredPurchases(purchases.filter(p => !p.supplier_id));
    } else {
      setFilteredPurchases(purchases.filter(p => p.supplier_id === selectedSupplier));
    }
  }, [purchases, selectedSupplier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const quantity = parseFloat(formData.quantity);
    const unitPrice = parseFloat(formData.unitPrice);

    // Validate inputs
    if (isNaN(quantity) || quantity <= 0 || quantity > 999999) {
      toast({
        title: "Erro de validação",
        description: "Quantidade deve ser um número positivo entre 0.01 e 999999",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (isNaN(unitPrice) || unitPrice <= 0 || unitPrice > 999999) {
      toast({
        title: "Erro de validação",
        description: "Preço deve ser um número positivo entre 0.01 e 999999",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (formData.notes.length > 500) {
      toast({
        title: "Erro de validação",
        description: "Observações devem ter no máximo 500 caracteres",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const totalPrice = quantity * unitPrice;

    const { error } = await supabase.from("purchases").insert({
      user_id: user.id,
      material_id: formData.materialId,
      supplier_id: formData.supplierId && formData.supplierId !== "none" ? formData.supplierId : null,
      quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      notes: formData.notes || null,
    });

    if (error) {
      toast({
        title: "Erro ao cadastrar compra",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Compra cadastrada!",
        description: "A compra foi adicionada ao estoque automaticamente.",
      });
      setIsOpen(false);
      setFormData({ materialId: "", supplierId: "none", quantity: "", unitPrice: "", notes: "" });
      fetchPurchases();
    }

    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Compras</h1>
          <p className="text-muted-foreground">Registre suas compras de materiais</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Compra
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Compra</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Material</Label>
                <Select
                  value={formData.materialId}
                  onValueChange={(value) => setFormData({ ...formData, materialId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o material" />
                  </SelectTrigger>
                  <SelectContent>
                    {materials.map((material) => (
                      <SelectItem key={material.id} value={material.id}>
                        {material.name} ({material.unit_of_measure})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fornecedor (Opcional)</Label>
                <Select
                  value={formData.supplierId}
                  onValueChange={(value) => setFormData({ ...formData, supplierId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o fornecedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="999999"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Preço Unitário (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="999999"
                  value={formData.unitPrice}
                  onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Adicione observações (opcional)"
                  maxLength={500}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Cadastrando..." : "Cadastrar Compra"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter by Supplier */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtrar por Fornecedor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
            <SelectTrigger>
              <SelectValue placeholder="Todos os fornecedores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os fornecedores</SelectItem>
              <SelectItem value="none">Sem fornecedor</SelectItem>
              {suppliers.map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground mt-2">
            Mostrando {filteredPurchases.length} de {purchases.length} compras
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filteredPurchases.map((purchase) => (
          <Card key={purchase.id}>
            <CardHeader>
              <CardTitle>{purchase.materials.name}</CardTitle>
              <CardDescription>
                {new Date(purchase.purchase_date).toLocaleString("pt-BR", {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quantidade:</span>
                  <span className="font-medium">
                    {purchase.quantity} {purchase.materials.unit_of_measure}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Preço Unitário:</span>
                  <span className="font-medium">R$ {purchase.unit_price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-bold text-primary">R$ {purchase.total_price.toFixed(2)}</span>
                </div>
                {purchase.suppliers && (
                  <div className="mt-2 border-t pt-2">
                    <span className="text-muted-foreground">Fornecedor:</span>
                    <p className="mt-1 font-medium">{purchase.suppliers.name}</p>
                  </div>
                )}
                {purchase.notes && (
                  <div className="mt-2 border-t pt-2">
                    <span className="text-muted-foreground">Observações:</span>
                    <p className="mt-1">{purchase.notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Purchases;
