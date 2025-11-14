import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Package, Search, Filter } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useStock } from "@/hooks/useStock";

const Stock = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Usar o hook customizado para gerenciar o estado do estoque
  const {
    stock,
    filteredStock,
    searchTerm,
    setSearchTerm,
    showOnlyInStock,
    setShowOnlyInStock,
    sortBy,
    setSortBy,
    minQuantity,
    setMinQuantity,
    minValue,
    setMinValue,
    clearFilters,
  } = useStock();

  const [formData, setFormData] = useState({
    name: "",
    unit_of_measure: "kg",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("materials").insert({
      user_id: user.id,
      name: formData.name,
      unit_of_measure: formData.unit_of_measure,
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
      setFormData({ name: "", unit_of_measure: "kg" });
      
      // Invalidar a query para refetch dos dados atualizados
      queryClient.invalidateQueries({ queryKey: ["stock"] });
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
                  value={formData.unit_of_measure}
                  onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })}
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

      {/* Seção de Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
          <CardDescription>Filtre e organize seu estoque</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Busca por nome */}
            <div className="space-y-2">
              <Label>Buscar Material</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nome do material..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Ordenação */}
            <div className="space-y-2">
              <Label>Ordenar por</Label>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Nome</SelectItem>
                  <SelectItem value="quantity">Quantidade</SelectItem>
                  <SelectItem value="value">Valor Total</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quantidade mínima */}
            <div className="space-y-2">
              <Label>Quantidade Mínima</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Ex: 10"
                value={minQuantity}
                onChange={(e) => setMinQuantity(e.target.value)}
              />
            </div>

            {/* Valor mínimo */}
            <div className="space-y-2">
              <Label>Valor Mínimo (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Ex: 100.00"
                value={minValue}
                onChange={(e) => setMinValue(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="inStock"
                checked={showOnlyInStock}
                onCheckedChange={(checked) => setShowOnlyInStock(checked as boolean)}
              />
              <Label htmlFor="inStock" className="cursor-pointer">
                Mostrar apenas itens em estoque
              </Label>
            </div>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Limpar Filtros
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            Mostrando {filteredStock.length} de {stock.length} materiais
          </div>
        </CardContent>
      </Card>

      {/* Lista de Materiais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredStock.map((item) => (
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
                    R$ {item.total_stock_value.toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredStock.length === 0 && stock.length > 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Filter className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">Nenhum material encontrado</h3>
            <p className="mb-4 text-center text-sm text-muted-foreground">
              Tente ajustar os filtros para ver mais resultados
            </p>
            <Button variant="outline" onClick={clearFilters}>
              Limpar Filtros
            </Button>
          </CardContent>
        </Card>
      )}

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
