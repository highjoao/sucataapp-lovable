import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, TrendingUp } from "lucide-react";

interface Transaction {
  id: string;
  type: "purchase" | "sale";
  date: string;
  material: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  profit?: number;
  notes?: string;
}

const Transactions = () => {
  const [searchParams] = useSearchParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    const fetchTransactions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch purchases
      const { data: purchases } = await supabase
        .from("purchases")
        .select(`
          id,
          purchase_date,
          quantity,
          unit_price,
          total_price,
          notes,
          materials (name, unit)
        `)
        .eq("user_id", user.id)
        .order("purchase_date", { ascending: false });

      // Fetch sales
      const { data: sales } = await supabase
        .from("sales")
        .select(`
          id,
          sale_date,
          quantity,
          unit_price,
          total_price,
          profit,
          notes,
          materials (name, unit)
        `)
        .eq("user_id", user.id)
        .order("sale_date", { ascending: false });

      const allTransactions: Transaction[] = [];

      purchases?.forEach((p: any) => {
        allTransactions.push({
          id: p.id,
          type: "purchase",
          date: p.purchase_date,
          material: p.materials.name,
          quantity: p.quantity,
          unit: p.materials.unit,
          unitPrice: p.unit_price,
          totalPrice: p.total_price,
          notes: p.notes,
        });
      });

      sales?.forEach((s: any) => {
        allTransactions.push({
          id: s.id,
          type: "sale",
          date: s.sale_date,
          material: s.materials.name,
          quantity: s.quantity,
          unit: s.materials.unit,
          unitPrice: s.unit_price,
          totalPrice: s.total_price,
          profit: s.profit,
          notes: s.notes,
        });
      });

      allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(allTransactions);
      setIsLoading(false);
    };

    fetchTransactions();
  }, []);

  useEffect(() => {
    const typeParam = searchParams.get("type");
    if (typeParam === "BUY") {
      setActiveTab("purchases");
    } else if (typeParam === "SELL") {
      setActiveTab("sales");
    }
  }, [searchParams]);

  const purchases = transactions.filter(t => t.type === "purchase");
  const sales = transactions.filter(t => t.type === "sale");

  const TransactionTable = ({ data }: { data: Transaction[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data</TableHead>
          <TableHead>Material</TableHead>
          <TableHead>Quantidade</TableHead>
          <TableHead>Preço Unit.</TableHead>
          <TableHead>Total</TableHead>
          {data[0]?.type === "sale" && <TableHead>Lucro</TableHead>}
          <TableHead>Observações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((transaction) => (
          <TableRow key={transaction.id}>
            <TableCell>{new Date(transaction.date).toLocaleDateString("pt-BR")}</TableCell>
            <TableCell className="font-medium">{transaction.material}</TableCell>
            <TableCell>
              {transaction.quantity} {transaction.unit}
            </TableCell>
            <TableCell>R$ {transaction.unitPrice.toFixed(2)}</TableCell>
            <TableCell className="font-bold">R$ {transaction.totalPrice.toFixed(2)}</TableCell>
            {transaction.type === "sale" && (
              <TableCell>
                <Badge variant={transaction.profit && transaction.profit > 0 ? "default" : "destructive"}>
                  R$ {transaction.profit?.toFixed(2)}
                </Badge>
              </TableCell>
            )}
            <TableCell className="text-muted-foreground text-sm">
              {transaction.notes || "-"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Movimentações</h1>
        <p className="text-muted-foreground">Histórico completo de compras e vendas</p>
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
                {transactions.length} transações registradas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-center py-8 text-muted-foreground">Carregando...</p>
              ) : transactions.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Nenhuma movimentação registrada</p>
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
              <CardDescription>
                {purchases.length} compras registradas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {purchases.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Nenhuma compra registrada</p>
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
                <p className="text-center py-8 text-muted-foreground">Nenhuma venda registrada</p>
              ) : (
                <TransactionTable data={sales} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Transactions;
