import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTransactions } from "@/hooks/useTransactions";
import { TransactionDialog } from "@/components/TransactionDialog";
import { Plus, ShoppingCart, TrendingUp, ArrowUpDown, Pencil, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import type { Tables } from "@/integrations/supabase/types";
import type { TransactionFormData } from "@/lib/validations";

const NewTransactions = () => {
  const { transactions, isLoading, deleteTransaction, isDeleting, isUpdating } = useTransactions();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);

  // State for passing data to the dialog
  const [dialogInitialData, setDialogInitialData] = useState<Partial<TransactionFormData>>({
    type: "BUY",
    material_id: "",
    supplier_id: "",
    quantity: 0,
    price_per_unit: 0,
  });

  const handleCreateClick = () => {
    setIsEditMode(false);
    setEditingId(null);
    setDialogInitialData({
      type: "BUY",
      material_id: "",
      supplier_id: "",
      quantity: 0,
      price_per_unit: 0,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (transaction: Tables<"transactions">) => {
    setIsEditMode(true);
    setEditingId(transaction.id);
    setDialogInitialData({
      type: transaction.type as "BUY" | "SELL",
      material_id: transaction.material_id,
      supplier_id: transaction.supplier_id || "",
      quantity: Number(transaction.quantity),
      price_per_unit: Number(transaction.price_per_unit),
    });
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (transactionId: string) => {
    setTransactionToDelete(transactionId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (transactionToDelete) {
      deleteTransaction(transactionToDelete);
      setDeleteDialogOpen(false);
      setTransactionToDelete(null);
    }
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
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
              Nenhuma transação registrada
            </TableCell>
          </TableRow>
        ) : (
          data.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell>
                {/* Improvement #5: Show date and time */}
                {new Date(transaction.transaction_date || transaction.created_at).toLocaleString("pt-BR", {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </TableCell>
              <TableCell className="font-medium">{transaction.materials?.name}</TableCell>
              <TableCell>{transaction.suppliers?.name || "-"}</TableCell>
              <TableCell>
                {transaction.quantity} {transaction.materials?.unit_of_measure}
              </TableCell>
              <TableCell>{formatCurrency(Number(transaction.price_per_unit))}</TableCell>
              <TableCell className="font-bold">
                {formatCurrency(Number(transaction.quantity) * Number(transaction.price_per_unit))}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(transaction)}
                    disabled={isDeleting || isUpdating}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(transaction.id)}
                    disabled={isDeleting || isUpdating}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
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

        <Button onClick={handleCreateClick}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Transação
        </Button>

        <TransactionDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          initialData={dialogInitialData}
          isEditMode={isEditMode}
          transactionId={editingId || undefined}
        />
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


      </Tabs>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta transação? O estoque será automaticamente ajustado.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default NewTransactions;
