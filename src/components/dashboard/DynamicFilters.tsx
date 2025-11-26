import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface FilterOptions {
  campaigns: string[];
  segments: string[];
  utmSources: string[];
  utmMediums: string[];
  utmCampaigns: string[];
}

interface DynamicFiltersProps {
  startDate: Date;
  endDate: Date;
  onFiltersChange: (filters: FilterOptions) => void;
}

export function DynamicFilters({ startDate, endDate, onFiltersChange }: DynamicFiltersProps) {
  const [campaigns, setCampaigns] = useState<Array<{ id: string; name: string }>>([]);
  const [segments, setSegments] = useState<Array<{ id: string; name: string }>>([]);
  const [utmSources, setUtmSources] = useState<string[]>([]);
  const [utmMediums, setUtmMediums] = useState<string[]>([]);
  const [utmCampaigns, setUtmCampaigns] = useState<string[]>([]);

  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);
  const [selectedUtmSources, setSelectedUtmSources] = useState<string[]>([]);
  const [selectedUtmMediums, setSelectedUtmMediums] = useState<string[]>([]);
  const [selectedUtmCampaigns, setSelectedUtmCampaigns] = useState<string[]>([]);

  useEffect(() => {
    fetchFilterOptions();
  }, [startDate, endDate]);

  useEffect(() => {
    onFiltersChange({
      campaigns: selectedCampaigns,
      segments: selectedSegments,
      utmSources: selectedUtmSources,
      utmMediums: selectedUtmMediums,
      utmCampaigns: selectedUtmCampaigns,
    });
  }, [selectedCampaigns, selectedSegments, selectedUtmSources, selectedUtmMediums, selectedUtmCampaigns]);

  const fetchFilterOptions = async () => {
    // Fetch campaigns
    const { data: campaignsData } = await supabase
      .from("campaigns")
      .select("id, name")
      .is('deleted_at', null)
      .order("name");
    setCampaigns(campaignsData || []);

    // Fetch segments
    const { data: segmentsData } = await supabase
      .from("segments")
      .select("id, name")
      .order("name");
    setSegments(segmentsData || []);

    // Fetch unique UTM values from leads in date range
    const { data: leadsData } = await supabase
      .from("leads")
      .select("utm_source, utm_medium, utm_campaign")
      .is("deleted_at", null)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString());

    if (leadsData) {
      const sources = [...new Set(leadsData.map(l => l.utm_source).filter(Boolean))].sort();
      const mediums = [...new Set(leadsData.map(l => l.utm_medium).filter(Boolean))].sort();
      const campaigns = [...new Set(leadsData.map(l => l.utm_campaign).filter(Boolean))].sort();
      
      setUtmSources(sources as string[]);
      setUtmMediums(mediums as string[]);
      setUtmCampaigns(campaigns as string[]);
    }
  };

  const clearAllFilters = () => {
    setSelectedCampaigns([]);
    setSelectedSegments([]);
    setSelectedUtmSources([]);
    setSelectedUtmMediums([]);
    setSelectedUtmCampaigns([]);
  };

  const hasActiveFilters = 
    selectedCampaigns.length > 0 ||
    selectedSegments.length > 0 ||
    selectedUtmSources.length > 0 ||
    selectedUtmMediums.length > 0 ||
    selectedUtmCampaigns.length > 0;

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <MultiSelectFilter
        label="Campanhas"
        options={campaigns.map(c => ({ value: c.id, label: c.name }))}
        selected={selectedCampaigns}
        onSelectedChange={setSelectedCampaigns}
      />

      <MultiSelectFilter
        label="Segmentos"
        options={segments.map(s => ({ value: s.id, label: s.name }))}
        selected={selectedSegments}
        onSelectedChange={setSelectedSegments}
      />

      <MultiSelectFilter
        label="UTM Source"
        options={utmSources.map(s => ({ value: s, label: s }))}
        selected={selectedUtmSources}
        onSelectedChange={setSelectedUtmSources}
      />

      <MultiSelectFilter
        label="UTM Medium"
        options={utmMediums.map(m => ({ value: m, label: m }))}
        selected={selectedUtmMediums}
        onSelectedChange={setSelectedUtmMediums}
      />

      <MultiSelectFilter
        label="UTM Campaign"
        options={utmCampaigns.map(c => ({ value: c, label: c }))}
        selected={selectedUtmCampaigns}
        onSelectedChange={setSelectedUtmCampaigns}
      />

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-9">
          <X className="h-4 w-4 mr-1" />
          Limpar Filtros
        </Button>
      )}
    </div>
  );
}

interface MultiSelectFilterProps {
  label: string;
  options: Array<{ value: string; label: string }>;
  selected: string[];
  onSelectedChange: (selected: string[]) => void;
}

function MultiSelectFilter({ label, options, selected, onSelectedChange }: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);

  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onSelectedChange(selected.filter(v => v !== value));
    } else {
      onSelectedChange([...selected, value]);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-9 justify-between min-w-[140px] bg-background"
        >
          <span className="truncate">
            {selected.length === 0 ? label : `${label} (${selected.length})`}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0 bg-popover" align="start">
        <Command className="bg-popover">
          <CommandInput placeholder={`Buscar ${label.toLowerCase()}...`} />
          <CommandList>
            <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => toggleOption(option.value)}
                  className="cursor-pointer"
                >
                  <div className={cn(
                    "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                    selected.includes(option.value)
                      ? "bg-primary text-primary-foreground"
                      : "opacity-50 [&_svg]:invisible"
                  )}>
                    <Check className="h-3 w-3" />
                  </div>
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
