import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTransactions } from "@/hooks/useTransactions";
import { useMaterials } from "@/hooks/useMaterials";
import { useSuppliers } from "@/hooks/useSuppliers";
import { transactionSchema, type TransactionFormData } from "@/lib/validations";
import { extractEntitiesFromText, calculateConfidenceScore, getExtractionFeedback } from "@/lib/nlp";
import { VoiceRecognition } from "@/components/VoiceRecognition";
import { Plus, ShoppingCart, TrendingUp, ArrowUpDown, Sparkles, AlertCircle } from "lucide-react";

const NewTransactions = () => {
  const { transactions, isLoading, createTransaction, isCreating, stockOverview, isLoadingStock } = useTransactions();
  const { materials } = useMaterials();
  const { suppliers } = useSuppliers();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<TransactionFormData>({
    type: "BUY",
    material_id: "",
    supplier_id: "",
    quantity: 0,
    price_per_unit: 0,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof TransactionFormData, string>>>({});
  const [nlpFeedback, setNlpFeedback] = useState<string[]>([]);
  const [confidenceScore, setConfidenceScore] = useState<number>(0);

  const handleVoiceTranscript = (transcript: string) => {
    // Extrai entidades do texto usando PLN
    const entities = extractEntitiesFromText(transcript, materials);
    const score = calculateConfidenceScore(entities);
    const feedback = getExtractionFeedback(entities);
    
    setConfidenceScore(score);
    setNlpFeedback(feedback);

    // Pré-preenche o formulário com os dados extraídos
    if (entities.type) {
      setFormData((prev) => ({ ...prev, type: entities.type! }));
    }
    
    if (entities.quantity && entities.quantity > 0) {
      setFormData((prev) => ({ ...prev, quantity: entities.quantity! }));
    }
    
    if (entities.materialName) {
      const material = materials.find(
        (m) => m.name.toLowerCase() === entities.materialName?.toLowerCase()
      );
      if (material) {
        setFormData((prev) => ({ ...prev, material_id: material.id }));
      }
    }
    
    if (entities.pricePerUnit && entities.pricePerUnit > 0) {
      setFormData((prev) => ({ ...prev, price_per_unit: entities.pricePerUnit! }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = transactionSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof TransactionFormData, string>> = {};
      result.error.errors.forEach((error) => {
        if (error.path[0]) {
          fieldErrors[error.path[0] as keyof TransactionFormData] = error.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    createTransaction(result.data as any);
    setIsDialogOpen(false);
    setFormData({
      type: "BUY",
      material_id: "",
      supplier_id: "",
      quantity: 0,
      price_per_unit: 0,
    });
    setNlpFeedback([]);
    setConfidenceScore(0);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setFormData({
      type: "BUY",
      material_id: "",
      supplier_id: "",
      quantity: 0,
      price_per_unit: 0,
    });
    setErrors({});
  };

  const purchases = transactions.filter(t => t.type === "BUY");
  const sales = transactions.filter(t => t.type === "SELL");

  const TransactionTable = ({ data }: { data: typeof transactions }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data</TableHead>
          <TableHead>Material</TableHead>
          <TableHead>Fornecedor</TableHead>
          <TableHead>Quantidade</TableHead>
          <TableHead>Preço Unit.</TableHead>
          <TableHead>Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
              Nenhuma transação registrada
            </TableCell>
          </TableRow>
        ) : (
          data.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell>
                {new Date(transaction.transaction_date || transaction.created_at).toLocaleDateString("pt-BR")}
              </TableCell>
              <TableCell className="font-medium">{transaction.materials?.name}</TableCell>
              <TableCell>{transaction.suppliers?.name || "-"}</TableCell>
              <TableCell>
                {transaction.quantity} {transaction.materials?.unit_of_measure}
              </TableCell>
              <TableCell>R$ {Number(transaction.price_per_unit).toFixed(2)}</TableCell>
              <TableCell className="font-bold">
                R$ {(Number(transaction.quantity) * Number(transaction.price_per_unit)).toFixed(2)}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Transações</h1>
          <p className="text-muted-foreground">
            Gerencie compras e vendas com atualização automática de estoque
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Transação
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Transação</DialogTitle>
              <DialogDescription>
                Registre uma compra ou venda. O estoque será atualizado automaticamente.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Reconhecimento de Voz */}
              <VoiceRecognition 
                onTranscript={handleVoiceTranscript}
                isDisabled={isCreating}
              />

              {/* Feedback do PLN */}
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
              <div className="space-y-2">
                <Label htmlFor="type">Tipo de Transação*</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: "BUY" | "SELL") => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUY">Compra</SelectItem>
                    <SelectItem value="SELL">Venda</SelectItem>
                  </SelectContent>
                </Select>
                {errors.type && <p className="text-sm text-destructive">{errors.type}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="material">Material*</Label>
                <Select
                  value={formData.material_id}
                  onValueChange={(value) => setFormData({ ...formData, material_id: value })}
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
                {errors.material_id && <p className="text-sm text-destructive">{errors.material_id}</p>}
              </div>
              {formData.type === "BUY" && (
                <div className="space-y-2">
                  <Label htmlFor="supplier">Fornecedor</Label>
                  <Select
                    value={formData.supplier_id}
                    onValueChange={(value) => setFormData({ ...formData, supplier_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o fornecedor (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade*</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.001"
                  placeholder="Ex: 100.5"
                  value={formData.quantity || ""}
                  onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                />
                {errors.quantity && <p className="text-sm text-destructive">{errors.quantity}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Preço Unitário (R$)*</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  placeholder="Ex: 25.50"
                  value={formData.price_per_unit || ""}
                  onChange={(e) => setFormData({ ...formData, price_per_unit: parseFloat(e.target.value) || 0 })}
                />
                {errors.price_per_unit && <p className="text-sm text-destructive">{errors.price_per_unit}</p>}
              </div>
              {formData.quantity > 0 && formData.price_per_unit > 0 && (
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm font-medium">
                    Total: R$ {(formData.quantity * formData.price_per_unit).toFixed(2)}
                  </p>
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={handleDialogClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? "Salvando..." : "Salvar Transação"}
                </Button>
              </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Transações</CardTitle>
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactions.length}</div>
            <p className="text-xs text-muted-foreground">Compras e vendas registradas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compras</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{purchases.length}</div>
            <p className="text-xs text-muted-foreground">Materiais adquiridos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sales.length}</div>
            <p className="text-xs text-muted-foreground">Materiais vendidos</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="purchases">
            <ShoppingCart className="mr-2 h-4 w-4" />
            Compras
          </TabsTrigger>
          <TabsTrigger value="sales">
            <TrendingUp className="mr-2 h-4 w-4" />
            Vendas
          </TabsTrigger>
          <TabsTrigger value="stock">Estoque Atual</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>Todas as Transações</CardTitle>
              <CardDescription>{transactions.length} transações registradas</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-center py-8 text-muted-foreground">Carregando...</p>
              ) : (
                <TransactionTable data={transactions} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchases">
          <Card>
            <CardHeader>
              <CardTitle>Compras</CardTitle>
              <CardDescription>{purchases.length} compras registradas</CardDescription>
            </CardHeader>
            <CardContent>
              <TransactionTable data={purchases} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle>Vendas</CardTitle>
              <CardDescription>{sales.length} vendas registradas</CardDescription>
            </CardHeader>
            <CardContent>
              <TransactionTable data={sales} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock">
          <Card>
            <CardHeader>
              <CardTitle>Estoque Atual</CardTitle>
              <CardDescription>Visão atualizada do estoque após transações</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingStock ? (
                <p className="text-center py-8 text-muted-foreground">Carregando...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Última Atualização</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockOverview.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          Nenhum item em estoque
                        </TableCell>
                      </TableRow>
                    ) : (
                      stockOverview.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.materials?.name}</TableCell>
                          <TableCell>
                            <Badge variant={Number(item.quantity) > 0 ? "default" : "secondary"}>
                              {Number(item.quantity).toFixed(3)} {item.materials?.unit_of_measure}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {item.updated_at ? new Date(item.updated_at).toLocaleDateString("pt-BR") : "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NewTransactions;
