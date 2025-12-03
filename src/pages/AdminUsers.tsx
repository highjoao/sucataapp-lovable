import { useAdmin } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Shield, ShieldAlert, UserX, UserCheck } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const AdminUsers = () => {
    const { users, isLoading, toggleBlockUser, updateUserRole } = useAdmin();

    const totalUsers = users.length;
    const proUsers = users.filter((u) => u.subscriptions?.plan_type === "pro").length;
    const blockedUsers = users.filter((u) => u.is_blocked).length;

    if (isLoading) {
        return <div className="p-8 text-center">Carregando painel administrativo...</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Gestão de Usuários</h1>
                <p className="text-muted-foreground">Painel administrativo do sistema</p>
            </div>

            {/* Métricas */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalUsers}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Usuários Pro</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{proUsers}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Bloqueados</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-destructive">{blockedUsers}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabela de Usuários */}
            <Card>
                <CardHeader>
                    <CardTitle>Usuários Cadastrados</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Usuário</TableHead>
                                <TableHead>Função</TableHead>
                                <TableHead>Plano</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Criado em</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <div className="font-medium">{user.full_name || "Sem nome"}</div>
                                        <div className="text-xs text-muted-foreground">{user.id}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={user.role === "admin" ? "default" : "outline"}>
                                            {user.role === "admin" ? "Admin" : "Usuário"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={user.subscriptions?.plan_type === "pro" ? "secondary" : "outline"}>
                                            {user.subscriptions?.plan_type === "pro" ? "PRO" : "Free"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={user.is_blocked ? "destructive" : "outline"} className={!user.is_blocked ? "text-green-600 border-green-600" : ""}>
                                            {user.is_blocked ? "Bloqueado" : "Ativo"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Abrir menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                                <DropdownMenuItem
                                                    onClick={() => toggleBlockUser.mutate({ userId: user.id, isBlocked: !user.is_blocked })}
                                                    className={user.is_blocked ? "text-green-600" : "text-destructive"}
                                                >
                                                    {user.is_blocked ? (
                                                        <>
                                                            <UserCheck className="mr-2 h-4 w-4" /> Desbloquear
                                                        </>
                                                    ) : (
                                                        <>
                                                            <UserX className="mr-2 h-4 w-4" /> Bloquear
                                                        </>
                                                    )}
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => updateUserRole.mutate({ userId: user.id, role: user.role === "admin" ? "user" : "admin" })}
                                                >
                                                    {user.role === "admin" ? (
                                                        <>
                                                            <Shield className="mr-2 h-4 w-4" /> Remover Admin
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ShieldAlert className="mr-2 h-4 w-4" /> Tornar Admin
                                                        </>
                                                    )}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminUsers;
