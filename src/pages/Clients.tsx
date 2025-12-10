import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useClients } from "@/hooks/useClients";
import { clientSchema, type ClientFormData } from "@/lib/validations";
import { Plus, Pencil, Trash2, Users, History } from "lucide-react";

const Clients = () => {
    const navigate = useNavigate();
    const { clients, isLoading, createClient, updateClient, deleteClient, isCreating, isUpdating, isDeleting } = useClients();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<{ id: string; name: string; phone: string | null; address: string | null } | null>(null);
    const [formData, setFormData] = useState<ClientFormData>({
        name: "",
        phone: "",
        address: "",
    });
    const [errors, setErrors] = useState<Partial<Record<keyof ClientFormData, string>>>({});

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        const result = clientSchema.safeParse(formData);
        if (!result.success) {
            const fieldErrors: Partial<Record<keyof ClientFormData, string>> = {};
            result.error.errors.forEach((error) => {
                if (error.path[0]) {
                    fieldErrors[error.path[0] as keyof ClientFormData] = error.message;
                }
            });
            setErrors(fieldErrors);
            return;
        }

        if (editingClient) {
            updateClient({ id: editingClient.id, ...result.data } as any, {
                onSuccess: handleDialogClose,
            });
        } else {
            createClient(result.data as any, {
                onSuccess: handleDialogClose,
            });
        }
    };

    const handleEdit = (client: typeof clients[0]) => {
        setEditingClient(client);
        setFormData({
            name: client.name,
            phone: client.phone || "",
            address: client.address || "",
        });
        setIsDialogOpen(true);
    };

    const handleDelete = (id: string) => {
        if (confirm("Tem certeza que deseja excluir este cliente?")) {
            deleteClient(id);
        }
    };

    const handleDialogClose = () => {
        setIsDialogOpen(false);
        setFormData({ name: "", phone: "", address: "" });
        setEditingClient(null);
        setErrors({});
    };

    const handleDialogOpenChange = (open: boolean) => {
        if (!open) {
            handleDialogClose();
        } else {
            setIsDialogOpen(true);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Clientes</h1>
                    <p className="text-muted-foreground">Gerencie seus clientes</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Novo Cliente
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingClient ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
                            <DialogDescription>
                                {editingClient ? "Atualize as informações do cliente" : "Cadastre um novo cliente"}
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome do Cliente*</Label>
                                <Input
                                    id="name"
                                    placeholder="Ex: João Silva"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Telefone</Label>
                                <Input
                                    id="phone"
                                    placeholder="Ex: (11) 98765-4321"
                                    value={formData.phone || ""}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                                {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="address">Endereço</Label>
                                <Input
                                    id="address"
                                    placeholder="Ex: Rua das Flores, 123 - Centro"
                                    value={formData.address || ""}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                />
                                {errors.address && <p className="text-sm text-destructive">{errors.address}</p>}
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
                    <CardTitle>Clientes Cadastrados</CardTitle>
                    <CardDescription>{clients.length} clientes registrados</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <p className="text-center py-8 text-muted-foreground">Carregando...</p>
                    ) : clients.length === 0 ? (
                        <div className="text-center py-12">
                            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">Nenhum cliente cadastrado ainda</p>
                            <p className="text-sm text-muted-foreground mt-2">Clique em "Novo Cliente" para começar</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Telefone</TableHead>
                                    <TableHead>Endereço</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {clients.map((client) => (
                                    <TableRow key={client.id}>
                                        <TableCell className="font-medium">{client.name}</TableCell>
                                        <TableCell>{client.phone || "-"}</TableCell>
                                        <TableCell>{client.address || "-"}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {/* 
                         TODO: Habilitar histórico quando a página de transações suportar clientes
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Ver Histórico"
                          onClick={() => navigate(`/transactions?clientId=${client.id}`)}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        */}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleEdit(client)}
                                                    disabled={isUpdating}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(client.id)}
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

export default Clients;
