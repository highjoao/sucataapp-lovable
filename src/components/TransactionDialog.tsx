import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTransactions } from "@/hooks/useTransactions";
import { useStockData } from "@/hooks/useStockData";
import { useMaterials } from "@/hooks/useMaterials";
import { useSuppliers } from "@/hooks/useSuppliers";
import { transactionSchema, type TransactionFormData } from "@/lib/validations";
import { extractEntitiesFromText, calculateConfidenceScore, getExtractionFeedback } from "@/lib/nlp";
import { VoiceRecognition } from "@/components/VoiceRecognition";
import { QuickCreateMaterial } from "@/components/QuickCreateMaterial";
import { QuickCreateSupplier } from "@/components/QuickCreateSupplier";
import { Sparkles, AlertCircle } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import type { Tables } from "@/integrations/supabase/types";

interface TransactionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialData?: Partial<TransactionFormData>;
    transactionId?: string; // If editing
    isEditMode?: boolean;
}

export const TransactionDialog = ({
    open,
    onOpenChange,
    initialData,
    transactionId,
    isEditMode = false
}: TransactionDialogProps) => {
    const { createTransaction, isCreating, updateTransaction, isUpdating } = useTransactions();
    const { stockData } = useStockData();
    const { materials, refetch: refetchMaterials } = useMaterials();
    const { suppliers, refetch: refetchSuppliers } = useSuppliers();

    // Quick Create States
    const [isCreateMaterialOpen, setIsCreateMaterialOpen] = useState(false);
    const [isCreateSupplierOpen, setIsCreateSupplierOpen] = useState(false);

    // Helper to get current local datetime string for input
    const getCurrentDateTime = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    };

    const [formData, setFormData] = useState<TransactionFormData>({
        type: "BUY",
        material_id: "",
        supplier_id: "",
        quantity: 0,
        price_per_unit: 0,
        transaction_date: getCurrentDateTime(),
    });
    const [errors, setErrors] = useState<Partial<Record<keyof TransactionFormData, string>>>({});
    const [nlpFeedback, setNlpFeedback] = useState<string[]>([]);
    const [confidenceScore, setConfidenceScore] = useState<number>(0);

    // Reset form when dialog opens or initialData changes
    useEffect(() => {
        if (open) {
            setFormData({
                type: initialData?.type || "BUY",
                material_id: initialData?.material_id || "",
                supplier_id: initialData?.supplier_id || "",
                quantity: initialData?.quantity || 0,
                price_per_unit: initialData?.price_per_unit || 0,
                transaction_date: initialData?.transaction_date
                    ? new Date(initialData.transaction_date).toISOString().slice(0, 16)
                    : getCurrentDateTime(),
            });
            setErrors({});
            setNlpFeedback([]);
            setConfidenceScore(0);
        }
    }, [open, initialData]);

    const materialsForSelection = useMemo(() => {
        if (formData.type === 'BUY') {
            return materials;
        }

        // Mapeia o estoque para um objeto de fácil consulta
        const stockMap = stockData.reduce((acc, item) => {
            acc[item.material_id] = item.quantity;
            return acc;
        }, {} as Record<string, number>);

        // Filtra os materiais que têm estoque positivo
        return materials.filter(material => {
            const stock = stockMap[material.id] || 0;
            return stock > 0;
        });
    }, [materials, stockData, formData.type]);

    // Improvement #2: Get current stock for the selected material
    const currentStock = useMemo(() => {
        if (!formData.material_id) return 0;
        const item = stockData.find(s => s.material_id === formData.material_id);
        return item ? item.quantity : 0;
    }, [stockData, formData.material_id]);

    const selectedMaterialUnit = useMemo(() => {
        if (!formData.material_id) return "";
        const material = materials.find(m => m.id === formData.material_id);
        return material ? material.unit_of_measure : "";
    }, [materials, formData.material_id]);

    const handleVoiceTranscript = (transcript: string) => {
        const entities = extractEntitiesFromText(transcript, materials);
        const score = calculateConfidenceScore(entities);
        const feedback = getExtractionFeedback(entities);

        setConfidenceScore(score);
        setNlpFeedback(feedback);

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

        if (isCreating || isUpdating) {
            return;
        }

        setErrors({});

        // Ensure transaction_date is a full ISO string for validation/storage
        const dataToSubmit = {
            ...formData,
            transaction_date: new Date(formData.transaction_date || new Date()).toISOString(),
        };

        const result = transactionSchema.safeParse(dataToSubmit);
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

        if (isEditMode && transactionId) {
            updateTransaction({
                id: transactionId,
                data: result.data as any
            }, {
                onSuccess: () => onOpenChange(false)
            });
        } else {
            createTransaction(result.data as any, {
                onSuccess: () => onOpenChange(false)
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? "Editar Transação" : "Nova Transação"}</DialogTitle>
                    <DialogDescription>
                        {isEditMode
                            ? "Edite a transação. O estoque será recalculado automaticamente."
                            : "Registre uma compra ou venda. O estoque será atualizado automaticamente."}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <VoiceRecognition
                        onTranscript={handleVoiceTranscript}
                        isDisabled={isCreating || isUpdating}
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
                                <Label htmlFor="date">Data e Hora*</Label>
                                <Input
                                    id="date"
                                    type="datetime-local"
                                    value={formData.transaction_date}
                                    onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                                    required
                                />
                                {errors.transaction_date && <p className="text-sm text-destructive">{errors.transaction_date}</p>}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="material">Material*</Label>
                            <div className="flex gap-2">
                                <Select
                                    value={formData.material_id}
                                    onValueChange={(value) => {
                                        if (value === "new") {
                                            setTimeout(() => setIsCreateMaterialOpen(true), 100);
                                            return;
                                        }
                                        setFormData({ ...formData, material_id: value });
                                    }}
                                >
                                    <SelectTrigger className="flex-1">
                                        <SelectValue placeholder="Selecione o material" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="new" className="text-primary font-medium">
                                            + Cadastrar Novo Material
                                        </SelectItem>
                                        {materialsForSelection.map((material) => (
                                            <SelectItem key={material.id} value={material.id}>
                                                {material.name} ({material.unit_of_measure})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {errors.material_id && <p className="text-sm text-destructive">{errors.material_id}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="supplier">Fornecedor (Opcional)</Label>
                            <div className="flex gap-2">
                                <Select
                                    value={formData.supplier_id}
                                    onValueChange={(value) => {
                                        if (value === "new") {
                                            setTimeout(() => setIsCreateSupplierOpen(true), 100);
                                            return;
                                        }
                                        setFormData({ ...formData, supplier_id: value });
                                    }}
                                >
                                    <SelectTrigger className="flex-1">
                                        <SelectValue placeholder="Selecione o fornecedor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="new" className="text-primary font-medium">
                                            + Cadastrar Novo Fornecedor
                                        </SelectItem>
                                        {suppliers.map((supplier) => (
                                            <SelectItem key={supplier.id} value={supplier.id}>
                                                {supplier.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <Label htmlFor="quantity">Quantidade*</Label>
                                {/* Improvement #2: Show stock quantity when selling */}
                                {formData.type === "SELL" && formData.material_id && (
                                    <span className="text-sm text-muted-foreground">
                                        Disponível: {formatNumber(currentStock)} {selectedMaterialUnit}
                                    </span>
                                )}
                            </div>
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
                                    Total: {formatCurrency(formData.quantity * formData.price_per_unit)}
                                </p>
                            </div>
                        )}
                        <div className="flex gap-2 justify-end">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isCreating || isUpdating}>
                                {isEditMode
                                    ? (isUpdating ? "Atualizando..." : "Atualizar Transação")
                                    : (isCreating ? "Salvando..." : "Salvar Transação")}
                            </Button>
                        </div>
                    </form>
                </div>
            </DialogContent>

            <QuickCreateMaterial
                open={isCreateMaterialOpen}
                onOpenChange={setIsCreateMaterialOpen}
                onCreated={(materialId) => {
                    refetchMaterials();
                    setFormData({ ...formData, material_id: materialId });
                }}
            />

            <QuickCreateSupplier
                open={isCreateSupplierOpen}
                onOpenChange={setIsCreateSupplierOpen}
                onCreated={(supplierId) => {
                    refetchSuppliers();
                    setFormData({ ...formData, supplier_id: supplierId });
                }}
            />
        </Dialog>
    );
};
