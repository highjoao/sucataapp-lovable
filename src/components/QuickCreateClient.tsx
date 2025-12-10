import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useClients } from "@/hooks/useClients";
import { clientSchema, type ClientFormData } from "@/lib/validations";
import { Plus } from "lucide-react";

interface QuickCreateClientProps {
    onCreated?: (clientId: string) => void;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export const QuickCreateClient = ({ onCreated, open: controlledOpen, onOpenChange: setControlledOpen }: QuickCreateClientProps) => {
    const { createClient, isCreating } = useClients();
    const [internalOpen, setInternalOpen] = useState(false);
    const [formData, setFormData] = useState<ClientFormData>({
        name: "",
        phone: "",
        address: "",
    });
    const [errors, setErrors] = useState<Partial<Record<keyof ClientFormData, string>>>({});

    const isControlled = controlledOpen !== undefined;
    const isOpen = isControlled ? controlledOpen : internalOpen;
    const setIsOpen = isControlled ? setControlledOpen : setInternalOpen;

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

        createClient(result.data as any, {
            onSuccess: (data: any) => {
                if (setIsOpen) setIsOpen(false);
                setFormData({ name: "", phone: "", address: "" });
                if (onCreated && data?.id) {
                    onCreated(data.id);
                }
            },
        });
    };

    const handleClose = () => {
        if (setIsOpen) setIsOpen(false);
        setFormData({ name: "", phone: "", address: "" });
        setErrors({});
    };

    return (
        <>
            {!isControlled && (
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setInternalOpen(true)}
                    className="shrink-0"
                >
                    <Plus className="h-4 w-4" />
                </Button>
            )}

            <Dialog open={isOpen} onOpenChange={(open) => {
                if (!open) handleClose();
                else if (setIsOpen) setIsOpen(true);
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Criar Cliente Rapidamente</DialogTitle>
                        <DialogDescription>
                            Cadastre um novo cliente para usar nesta transação
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="quick-client-name">Nome do Cliente*</Label>
                            <Input
                                id="quick-client-name"
                                placeholder="Ex: João Silva"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="quick-client-phone">Telefone</Label>
                            <Input
                                id="quick-client-phone"
                                placeholder="Ex: (11) 98765-4321"
                                value={formData.phone || ""}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                            {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="quick-client-address">Endereço</Label>
                            <Input
                                id="quick-client-address"
                                placeholder="Ex: Rua das Flores, 123"
                                value={formData.address || ""}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            />
                            {errors.address && <p className="text-sm text-destructive">{errors.address}</p>}
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button type="button" variant="outline" onClick={handleClose}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isCreating}>
                                {isCreating ? "Criando..." : "Criar"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
};
