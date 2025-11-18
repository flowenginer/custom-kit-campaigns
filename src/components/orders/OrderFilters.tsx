import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Filter, X } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export interface OrderFilterOptions {
  dateRange: DateRange | undefined;
  statuses: string[];
  campaigns: string[];
}

interface OrderFiltersProps {
  onFiltersChange: (filters: OrderFilterOptions) => void;
}

const STATUS_OPTIONS = [
  { value: "awaiting_approval", label: "Aguardando Aprovação" },
  { value: "approved", label: "Aprovado" },
  { value: "completed", label: "Concluído" },
];

export function OrderFilters({ onFiltersChange }: OrderFiltersProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [campaigns, setCampaigns] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  // Fetch available campaigns
  useEffect(() => {
    const fetchCampaigns = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("campaigns")
        .select("id, name")
        .order("name");
      setCampaigns(data || []);
      setLoading(false);
    };
    fetchCampaigns();
  }, []);

  // Notify parent of filter changes
  useEffect(() => {
    onFiltersChange({
      dateRange,
      statuses: selectedStatuses,
      campaigns: selectedCampaigns,
    });
  }, [dateRange, selectedStatuses, selectedCampaigns, onFiltersChange]);

  const toggleStatus = (status: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  const toggleCampaign = (campaignId: string) => {
    setSelectedCampaigns((prev) =>
      prev.includes(campaignId)
        ? prev.filter((c) => c !== campaignId)
        : [...prev, campaignId]
    );
  };

  const clearFilters = () => {
    setDateRange(undefined);
    setSelectedStatuses([]);
    setSelectedCampaigns([]);
  };

  const activeFiltersCount =
    (dateRange?.from ? 1 : 0) +
    selectedStatuses.length +
    selectedCampaigns.length;

  const hasFilters = activeFiltersCount > 0;

  return (
    <div className="flex flex-wrap items-center gap-2 p-4 bg-card border border-border rounded-lg">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Filter className="h-4 w-4" />
        Filtros
        {hasFilters && (
          <Badge variant="secondary" className="ml-1">
            {activeFiltersCount}
          </Badge>
        )}
      </div>

      {/* Date Range Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={dateRange?.from ? "default" : "outline"}
            size="sm"
            className={cn(
              "justify-start text-left font-normal",
              !dateRange?.from && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "dd/MM/yy")} -{" "}
                  {format(dateRange.to, "dd/MM/yy")}
                </>
              ) : (
                format(dateRange.from, "dd/MM/yyyy")
              )
            ) : (
              <span>Data</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={setDateRange}
            numberOfMonths={2}
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      {/* Status Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={selectedStatuses.length > 0 ? "default" : "outline"}
            size="sm"
            className="justify-start"
          >
            Status
            {selectedStatuses.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {selectedStatuses.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar status..." />
            <CommandList>
              <CommandEmpty>Nenhum status encontrado.</CommandEmpty>
              <CommandGroup>
                {STATUS_OPTIONS.map((status) => (
                  <CommandItem
                    key={status.value}
                    onSelect={() => toggleStatus(status.value)}
                    className="cursor-pointer"
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        selectedStatuses.includes(status.value)
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <span>{status.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Campaign Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={selectedCampaigns.length > 0 ? "default" : "outline"}
            size="sm"
            className="justify-start"
            disabled={loading}
          >
            {loading ? (
              <Skeleton className="h-4 w-16" />
            ) : (
              <>
                Campanha
                {selectedCampaigns.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedCampaigns.length}
                  </Badge>
                )}
              </>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[250px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar campanha..." />
            <CommandList>
              <CommandEmpty>Nenhuma campanha encontrada.</CommandEmpty>
              <CommandGroup>
                {campaigns.map((campaign) => (
                  <CommandItem
                    key={campaign.id}
                    onSelect={() => toggleCampaign(campaign.id)}
                    className="cursor-pointer"
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        selectedCampaigns.includes(campaign.id)
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <span className="truncate">{campaign.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Clear Filters Button */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          Limpar
        </Button>
      )}
    </div>
  );
}
