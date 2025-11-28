import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Sparkles, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { QuickCreateMaterial } from "@/components/QuickCreateMaterial";
import { QuickCreateSupplier } from "@/components/QuickCreateSupplier";
import { VoiceRecognition } from "@/components/VoiceRecognition";
import { extractEntitiesFromText, calculateConfidenceScore, getExtractionFeedback } from "@/lib/nlp";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { useStockData } from "@/hooks/useStockData";

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
  const { stockData } = useStockData();

  // Quick Create State
  const [isCreateMaterialOpen, setIsCreateMaterialOpen] = useState(false);
  const [isCreateSupplierOpen, setIsCreateSupplierOpen] = useState(false);

  // NLP State
  const [nlpFeedback, setNlpFeedback] = useState<string[]>([]);
  const [confidenceScore, setConfidenceScore] = useState<number>(0);

  // Helper to get current local datetime string for input
  const getCurrentDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const [formData, setFormData] = useState({
    materialId: "",
    supplierId: "none",
    quantity: "",
    unitPrice: "",
    notes: "",
    saleDate: getCurrentDateTime(),
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

  // Calculate current stock for selected material
  const currentStock = useMemo(() => {
    if (!formData.materialId) return 0;
    const item = stockData.find(s => s.material_id === formData.materialId);
    return item ? item.quantity : 0;
  }, [stockData, formData.materialId]);

  const selectedMaterialUnit = useMemo(() => {
    if (!formData.materialId) return "";
    const material = materials.find(m => m.id === formData.materialId);
    return material ? material.unit_of_measure : "";
  }, [materials, formData.materialId]);

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

  const handleVoiceTranscript = (transcript: string) => {
    const entities = extractEntitiesFromText(transcript, materials);
    const score = calculateConfidenceScore(entities);
    const feedback = getExtractionFeedback(entities);

    setConfidenceScore(score);
    setNlpFeedback(feedback);

    if (entities.quantity && entities.quantity > 0) {
      setFormData((prev) => ({ ...prev, quantity: entities.quantity!.toString() }));
    }

    if (entities.materialName) {
      const material = materials.find(
        (m) => m.name.toLowerCase() === entities.materialName?.toLowerCase()
      );
      if (material) {
        setFormData((prev) => ({ ...prev, materialId: material.id }));
      }
    }

    if (entities.pricePerUnit && entities.pricePerUnit > 0) {
      setFormData((prev) => ({ ...prev, unitPrice: entities.pricePerUnit!.toString() }));
    }
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
      sale_date: new Date(formData.saleDate).toISOString(),
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
      setFormData({
        materialId: "",
        supplierId: "none",
        quantity: "",
        unitPrice: "",
        notes: "",
        saleDate: getCurrentDateTime()
      });
      setNlpFeedback([]);
      setConfidenceScore(0);
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
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (open) {
            setFormData(prev => ({ ...prev, saleDate: getCurrentDateTime() }));
            setNlpFeedback([]);
            setConfidenceScore(0);
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Venda
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cadastrar Venda</DialogTitle>
              <DialogDescription>
                Registre uma venda. O estoque será atualizado automaticamente.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <VoiceRecognition
                onTranscript={handleVoiceTranscript}
                isDisabled={isLoading}
              />

              {nlpFeedback.length > 0 && (
                <Alert variant={confidenceScore === 100 ? "default" : "destructive"}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4" />
                        <span className="font-semibold">
                          Confiança: {confidenceScore}%
                        </span>
                      </div>
                      {nlpFeedback.map((feedback, idx) => (
                        <p key={idx} className="text-sm">
                          {feedback}
                        </p>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data e Hora*</Label>
                    <Input
                      type="datetime-local"
                      value={formData.saleDate}
                      onChange={(e) => setFormData({ ...formData, saleDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Material*</Label>
                  <Select
                    value={formData.materialId}
                    onValueChange={(value) => {
                      if (value === "new") {
                        setTimeout(() => setIsCreateMaterialOpen(true), 100);
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
                    onValueChange={(value) => {
                      if (value === "new") {
                        setTimeout(() => setIsCreateSupplierOpen(true), 100);
                        return;
                      }
                      setFormData({ ...formData, supplierId: value });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o fornecedor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new" className="text-primary font-medium">
                        + Cadastrar Novo Fornecedor
                      </SelectItem>
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
                  <div className="flex justify-between">
                    <Label>Quantidade*</Label>
                    {formData.materialId && (
                      <span className="text-sm text-muted-foreground">
                        Disponível: {formatNumber(currentStock)} {selectedMaterialUnit}
                      </span>
                    )}
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="999999"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    required
                    placeholder="Ex: 100.5"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Preço de Venda Unitário (R$)*</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="999999"
                    value={formData.unitPrice}
                    onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                    required
                    placeholder="Ex: 25.50"
                  />
                </div>

                {formData.quantity && formData.unitPrice && (
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-sm font-medium">
                      Total: {formatCurrency(parseFloat(formData.quantity) * parseFloat(formData.unitPrice))}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Adicione observações (opcional)"
                    maxLength={500}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Cadastrando..." : "Cadastrar Venda"}
                  </Button>
                </div>
              </form>
            </div>
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

      <QuickCreateSupplier
        open={isCreateSupplierOpen}
        onOpenChange={setIsCreateSupplierOpen}
        onCreated={(supplierId) => {
          fetchSuppliers(); // Refresh list
          setFormData({ ...formData, supplierId }); // Auto-select
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
