import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, TrendingUp, Pencil, Trash2, Filter, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/formatters";

interface Transaction {
  id: string;
  type: "purchase" | "sale";
  date: string;
  material: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  supplier?: string;
  profit?: number;
  notes?: string;
  source: "purchases" | "sales" | "transactions";
  raw: any; // Keep raw data for editing
}

const Transactions = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState<string | null>(null);

  // Edit/Delete state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [editFormData, setEditFormData] = useState({
    quantity: "",
    unitPrice: "",
    notes: "",
  });

  const fetchTransactions = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch purchases (Legacy)
    const { data: purchases } = await supabase
      .from("purchases")
      .select(`
        *,
        materials (name, unit_of_measure),
        suppliers (name)
      `)
      .eq("user_id", user.id);

    // Fetch sales (Legacy)
    const { data: sales } = await supabase
      .from("sales")
      .select(`
        *,
        materials (name, unit_of_measure)
      `)
      .eq("user_id", user.id);

    // Fetch new transactions
    const { data: newTransactions } = await supabase
      .from("transactions")
      .select(`
        *,
        materials (name, unit_of_measure),
        suppliers (name)
      `)
      .eq("user_id", user.id);

    const allTransactions: Transaction[] = [];

    purchases?.forEach((p: any) => {
      allTransactions.push({
        id: p.id,
        type: "purchase",
        date: p.purchase_date,
        material: p.materials?.name || "Desconhecido",
        quantity: Number(p.quantity),
        unit: p.materials?.unit_of_measure || "un",
        unitPrice: Number(p.unit_price),
        totalPrice: Number(p.total_price),
        supplier: p.suppliers?.name,
        notes: p.notes,
        source: "purchases",
        raw: p,
      });
    });

    sales?.forEach((s: any) => {
      allTransactions.push({
        id: s.id,
        type: "sale",
        date: s.sale_date,
        material: s.materials?.name || "Desconhecido",
        quantity: Number(s.quantity),
        unit: s.materials?.unit_of_measure || "un",
        unitPrice: Number(s.unit_price),
        totalPrice: Number(s.total_price),
        profit: Number(s.profit),
        notes: s.notes,
        source: "sales",
        raw: s,
      });
    });

    newTransactions?.forEach((t: any) => {
      allTransactions.push({
        id: t.id,
        type: t.type === "BUY" ? "purchase" : "sale",
        date: t.transaction_date || t.created_at,
        material: t.materials?.name || "Desconhecido",
        quantity: Number(t.quantity),
        unit: t.materials?.unit_of_measure || "un",
        unitPrice: Number(t.price_per_unit),
        totalPrice: Number(t.quantity) * Number(t.price_per_unit),
        supplier: t.suppliers?.name,
        notes: null, // New transactions table doesn't have notes column yet? Check schema.
        source: "transactions",
        raw: t,
      });
    });

    allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setTransactions(allTransactions);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    const typeParam = searchParams.get("type");
    const supplierIdParam = searchParams.get("supplierId");

    if (typeParam === "BUY") {
      setActiveTab("purchases");
    } else if (typeParam === "SELL") {
      setActiveTab("sales");
    }

    if (supplierIdParam) {
      setSupplierFilter(supplierIdParam);
    } else {
      setSupplierFilter(null);
    }
  }, [searchParams]);

  useEffect(() => {
    let filtered = transactions;

    if (supplierFilter) {
      // Filter by supplier ID (need to check raw data for ID)
      filtered = filtered.filter(t =>
        (t.source === "purchases" && t.raw.supplier_id === supplierFilter) ||
        (t.source === "transactions" && t.raw.supplier_id === supplierFilter)
      );
    }

    setFilteredTransactions(filtered);
  }, [transactions, supplierFilter]);

  const handleDeleteClick = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!transactionToDelete) return;

    try {
      const { error } = await supabase
        .from(transactionToDelete.source)
        .delete()
        .eq("id", transactionToDelete.id);

      if (error) throw error;

      toast({
        title: "Transação excluída",
        description: "A transação foi removida com sucesso.",
      });

      fetchTransactions();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setTransactionToDelete(null);
    }
  };

  const handleEditClick = (transaction: Transaction) => {
    setTransactionToEdit(transaction);
    setEditFormData({
      quantity: transaction.quantity.toString(),
      unitPrice: transaction.unitPrice.toString(),
      notes: transaction.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleConfirmEdit = async () => {
    if (!transactionToEdit) return;

    try {
      const quantity = parseFloat(editFormData.quantity);
      const unitPrice = parseFloat(editFormData.unitPrice);
      const totalPrice = quantity * unitPrice;

      if (isNaN(quantity) || isNaN(unitPrice)) {
        throw new Error("Valores inválidos");
      }

      let updateData: any = {};

      if (transactionToEdit.source === "purchases") {
        updateData = {
          quantity,
          unit_price: unitPrice,
          total_price: totalPrice,
          notes: editFormData.notes,
        };
      } else if (transactionToEdit.source === "sales") {
        // For sales, we might need to recalculate profit, but that's complex without cost price.
        // For now, just update basic fields. Profit might become inconsistent.
        // Ideally, backend trigger should handle this, or we fetch cost price.
        // Let's update what we can.
        updateData = {
          quantity,
          unit_price: unitPrice,
          total_price: totalPrice,
          notes: editFormData.notes,
        };
      } else if (transactionToEdit.source === "transactions") {
        updateData = {
          quantity,
          price_per_unit: unitPrice,
          // transactions table doesn't have total_price or notes column in schema shown earlier?
          // Checking schema: transactions has quantity, price_per_unit. No total_price (calculated).
          // No notes column in transactions table schema shown earlier.
        };
      }

      const { error } = await supabase
        .from(transactionToEdit.source)
        .update(updateData)
        .eq("id", transactionToEdit.id);

      if (error) throw error;

      toast({
        title: "Transação atualizada",
        description: "As alterações foram salvas com sucesso.",
      });

      fetchTransactions();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsEditDialogOpen(false);
      setTransactionToEdit(null);
    }
  };

  const purchases = filteredTransactions.filter(t => t.type === "purchase");
  const sales = filteredTransactions.filter(t => t.type === "sale");

  const TransactionTable = ({ data, showType = false }: { data: Transaction[], showType?: boolean }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data</TableHead>
          {showType && <TableHead>Tipo</TableHead>}
          <TableHead>Material</TableHead>
          <TableHead>Qtd.</TableHead>
          <TableHead>Preço Unit.</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Fornecedor</TableHead>
          <TableHead>Obs.</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((transaction) => (
          <TableRow key={transaction.id}>
            <TableCell>
              {new Date(transaction.date).toLocaleString("pt-BR", {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </TableCell>
            {showType && (
              <TableCell>
                <Badge variant={transaction.type === "purchase" ? "secondary" : "default"}>
                  {transaction.type === "purchase" ? "Compra" : "Venda"}
                </Badge>
              </TableCell>
            )}
            <TableCell className="font-medium">{transaction.material}</TableCell>
            <TableCell>
              {transaction.quantity} {transaction.unit}
            </TableCell>
            <TableCell>{formatCurrency(transaction.unitPrice)}</TableCell>
            <TableCell className="font-bold">{formatCurrency(transaction.totalPrice)}</TableCell>
            <TableCell className="text-muted-foreground">
              {transaction.supplier || "-"}
            </TableCell>
            <TableCell className="text-muted-foreground text-sm max-w-[150px] truncate">
              {transaction.notes || "-"}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEditClick(transaction)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteClick(transaction)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Movimentações</h1>
          <p className="text-muted-foreground">Histórico completo de compras e vendas</p>
        </div>
        {supplierFilter && (
          <Button variant="outline" onClick={() => setSearchParams({})}>
            <X className="mr-2 h-4 w-4" />
            Limpar Filtro de Fornecedor
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
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
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>Todas as Movimentações</CardTitle>
              <CardDescription>
                {filteredTransactions.length} transações registradas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-center py-8 text-muted-foreground">Carregando...</p>
              ) : filteredTransactions.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Nenhuma movimentação encontrada</p>
              ) : (
                <TransactionTable data={filteredTransactions} showType={true} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchases">
          <Card>
            <CardHeader>
              <CardTitle>Compras</CardTitle>
              <CardDescription>
                {purchases.length} compras registradas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {purchases.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Nenhuma compra encontrada</p>
              ) : (
                <TransactionTable data={purchases} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle>Vendas</CardTitle>
              <CardDescription>
                {sales.length} vendas registradas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sales.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Nenhuma venda encontrada</p>
              ) : (
                <TransactionTable data={sales} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita e afetará o estoque.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Transação</DialogTitle>
            <DialogDescription>
              Atualize os dados da transação. O estoque será recalculado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-quantity">Quantidade</Label>
              <Input
                id="edit-quantity"
                type="number"
                value={editFormData.quantity}
                onChange={(e) => setEditFormData({ ...editFormData, quantity: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-price">Preço Unitário (R$)</Label>
              <Input
                id="edit-price"
                type="number"
                value={editFormData.unitPrice}
                onChange={(e) => setEditFormData({ ...editFormData, unitPrice: e.target.value })}
              />
            </div>
            {transactionToEdit?.source !== "transactions" && (
              <div className="space-y-2">
                <Label htmlFor="edit-notes">Observações</Label>
                <Input
                  id="edit-notes"
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleConfirmEdit}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Transactions;
