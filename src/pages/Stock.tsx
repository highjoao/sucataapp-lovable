import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Package } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface StockItem {
  material_id: string;
  material_name: string;
  unit: string;
  current_stock: number;
  avg_purchase_price: number;
}

const Stock = () => {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    unit: "kg",
  });

  const fetchStock = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase.rpc("get_user_stock");

    if (error) {
      toast({
        title: "Erro ao carregar estoque",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    if (data) {
      setStock(data as StockItem[]);
    }
  };

  useEffect(() => {
    fetchStock();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("materials").insert({
      user_id: user.id,
      name: formData.name,
      unit: formData.unit,
    });

    if (error) {
      toast({
        title: "Erro ao cadastrar material",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Material cadastrado!",
        description: "Novo material adicionado ao sistema.",
      });
      setIsOpen(false);
      setFormData({ name: "", unit: "kg" });
      fetchStock();
    }

    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Estoque</h1>
          <p className="text-muted-foreground">Acompanhe seu estoque de materiais</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Material
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Material</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Material</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Cobre, Alumínio, Bronze..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Unidade de Medida</Label>
                <Input
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="Ex: kg, ton, un..."
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Cadastrando..." : "Cadastrar Material"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stock.map((item) => (
          <Card key={item.material_id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  <CardTitle>{item.material_name}</CardTitle>
                </div>
                <Badge
                  variant={item.current_stock > 0 ? "default" : "secondary"}
                  className={item.current_stock > 0 ? "bg-success" : ""}
                >
                  {item.current_stock > 0 ? "Em estoque" : "Vazio"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Quantidade</p>
                  <p className="text-2xl font-bold">
                    {item.current_stock.toFixed(2)} {item.unit}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Preço Médio de Compra</p>
                  <p className="text-lg font-semibold text-primary">
                    R$ {item.avg_purchase_price.toFixed(2)}/{item.unit}
                  </p>
                </div>
                <div className="border-t pt-2">
                  <p className="text-sm text-muted-foreground">Valor Total em Estoque</p>
                  <p className="text-lg font-bold">
                    R$ {(item.current_stock * item.avg_purchase_price).toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {stock.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Package className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">Nenhum material cadastrado</h3>
            <p className="mb-4 text-center text-sm text-muted-foreground">
              Comece cadastrando os materiais que você trabalha
            </p>
            <Button onClick={() => setIsOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Cadastrar Primeiro Material
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Stock;
