import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

export type DateRange = "today" | "week" | "month";

interface DateRangeFilterProps {
    value: DateRange;
    onChange: (value: DateRange) => void;
}

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
    return (
        <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border">
            <Calendar className="w-4 h-4 ml-2 text-muted-foreground" />
            <div className="flex gap-1">
                <Button
                    variant={value === "today" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => onChange("today")}
                    className="h-7 text-xs"
                >
                    Hoje
                </Button>
                <Button
                    variant={value === "week" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => onChange("week")}
                    className="h-7 text-xs"
                >
                    Semana
                </Button>
                <Button
                    variant={value === "month" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => onChange("month")}
                    className="h-7 text-xs"
                >
                    Mês
                </Button>
            </div>
        </div>
    );
}
