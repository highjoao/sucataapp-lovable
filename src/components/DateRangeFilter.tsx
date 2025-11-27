import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

export type DateRange = "today" | "week" | "month" | null;

interface DateRangeFilterProps {
    value: DateRange;
    onChange: (value: DateRange) => void;
}

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
    const handleClick = (range: "today" | "week" | "month") => {
        // Toggle: se já está selecionado, remove o filtro
        onChange(value === range ? null : range);
    };

    return (
        <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border">
            <Calendar className="w-4 h-4 ml-2 text-muted-foreground" />
            <div className="flex gap-1">
                <Button
                    variant={value === "today" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleClick("today")}
                    className="h-7 text-xs"
                >
                    Hoje
                </Button>
                <Button
                    variant={value === "week" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleClick("week")}
                    className="h-7 text-xs"
                >
                    Semana
                </Button>
                <Button
                    variant={value === "month" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleClick("month")}
                    className="h-7 text-xs"
                >
                    Mês
                </Button>
            </div>
        </div>
    );
}
