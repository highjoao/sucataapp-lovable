import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { QuickCreateMaterial } from "@/components/QuickCreateMaterial";

interface Material {
  id: string;
  name: string;
  unit_of_measure: string;
}

interface Supplier {
  id: string;
  name: string;
}

interface Sale {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  cost_price: number;
  profit: number;
  sale_date: string;
  notes: string | null;
  supplier_id: string | null;
  materials: { name: string; unit_of_measure: string };
  suppliers?: { name: string } | null;
}

const Sales = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Quick Create State
  const [isCreateMaterialOpen, setIsCreateMaterialOpen] = useState(false);

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

  const fetchSuppliers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("suppliers")
      .select("id, name")
      .eq("user_id", user.id)
      .order("name");

    if (data) setSuppliers(data);
  };

  const fetchSales = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("sales")
      .select(`
        *,
        materials (name, unit_of_measure),
        suppliers (name)
      `)
      .eq("user_id", user.id)
      .order("sale_date", { ascending: false });

    if (data) setSales(data as Sale[]);
  };

  useEffect(() => {
    fetchMaterials();
    fetchSuppliers();
    fetchSales();
  }, []);

  const calculateCostPrice = async (materialId: string, quantity: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { data: purchases } = await supabase
      .from("purchases")
      .select("unit_price, quantity")
      .eq("user_id", user.id)
      .eq("material_id", materialId)
      .order("purchase_date", { ascending: false });

    if (!purchases || purchases.length === 0) return 0;

    const avgCost = purchases.reduce((sum, p) => sum + Number(p.unit_price), 0) / purchases.length;
    return avgCost * quantity;
  };

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
    const costPrice = await calculateCostPrice(formData.materialId, quantity);
    const profit = totalPrice - costPrice;

    const { error } = await supabase.from("sales").insert({
      user_id: user.id,
      material_id: formData.materialId,
      supplier_id: formData.supplierId && formData.supplierId !== "none" ? formData.supplierId : null,
      quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      cost_price: costPrice,
      profit,
      notes: formData.notes || null,
    });

    if (error) {
      toast({
        title: "Erro ao cadastrar venda",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Venda cadastrada!",
        description: `Lucro de R$ ${profit.toFixed(2)}`,
      });
      setIsOpen(false);
      setFormData({ materialId: "", supplierId: "none", quantity: "", unitPrice: "", notes: "" });
      fetchSales();
    }

    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vendas</h1>
          <p className="text-muted-foreground">Registre suas vendas e acompanhe o lucro</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Venda
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Venda</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Material</Label>
                <Select
                  value={formData.materialId}
                  onValueChange={(value) => {
                    if (value === "new") {
                      setIsCreateMaterialOpen(true);
                      return;
                    }
                    setFormData({ ...formData, materialId: value });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o material" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new" className="text-primary font-medium">
                      + Cadastrar Novo Material
                    </SelectItem>
                    {materials.map((material) => (
                      <SelectItem key={material.id} value={material.id}>
                        {material.name} ({material.unit_of_measure})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fornecedor (opcional)</Label>
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
                <Label>Preço de Venda Unitário (R$)</Label>
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
                {isLoading ? "Cadastrando..." : "Cadastrar Venda"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <QuickCreateMaterial
        open={isCreateMaterialOpen}
        onOpenChange={setIsCreateMaterialOpen}
        onCreated={(materialId) => {
          fetchMaterials(); // Refresh list
          setFormData({ ...formData, materialId }); // Auto-select
        }}
      />

      <div className="grid gap-4">
        {sales.map((sale) => (
          <Card key={sale.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{sale.materials.name}</CardTitle>
                  <CardDescription>
                    {new Date(sale.sale_date).toLocaleString("pt-BR", {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </CardDescription>
                </div>
                <Badge variant={sale.profit > 0 ? "default" : "destructive"} className="text-sm">
                  Lucro: R$ {sale.profit.toFixed(2)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quantidade:</span>
                  <span className="font-medium">
                    {sale.quantity} {sale.materials.unit_of_measure}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Preço Unitário:</span>
                  <span className="font-medium">R$ {sale.unit_price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-bold text-primary">R$ {sale.total_price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Custo:</span>
                  <span className="font-medium">R$ {sale.cost_price.toFixed(2)}</span>
                </div>
                {sale.suppliers && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fornecedor:</span>
                    <span className="font-medium">{sale.suppliers.name}</span>
                  </div>
                )}
                {sale.notes && (
                  <div className="mt-2 border-t pt-2">
                    <span className="text-muted-foreground">Observações:</span>
                    <p className="mt-1">{sale.notes}</p>
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

export default Sales;
