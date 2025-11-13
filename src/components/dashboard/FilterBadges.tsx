import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { FilterOptions } from "./DynamicFilters";

interface FilterBadgesProps {
  filters: FilterOptions;
  campaignNames: Map<string, string>;
  segmentNames: Map<string, string>;
  onRemoveFilter: (type: keyof FilterOptions, value: string) => void;
}

export function FilterBadges({ filters, campaignNames, segmentNames, onRemoveFilter }: FilterBadgesProps) {
  const hasFilters = Object.values(filters).some(arr => arr.length > 0);

  if (!hasFilters) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {filters.campaigns.map(id => (
        <Badge key={id} variant="secondary" className="gap-1 pr-1">
          <span className="text-xs">Campanha: {campaignNames.get(id) || id}</span>
          <button
            onClick={() => onRemoveFilter("campaigns", id)}
            className="ml-1 rounded-sm hover:bg-muted p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      
      {filters.segments.map(id => (
        <Badge key={id} variant="secondary" className="gap-1 pr-1">
          <span className="text-xs">Segmento: {segmentNames.get(id) || id}</span>
          <button
            onClick={() => onRemoveFilter("segments", id)}
            className="ml-1 rounded-sm hover:bg-muted p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {filters.utmSources.map(value => (
        <Badge key={value} variant="secondary" className="gap-1 pr-1">
          <span className="text-xs">Source: {value}</span>
          <button
            onClick={() => onRemoveFilter("utmSources", value)}
            className="ml-1 rounded-sm hover:bg-muted p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {filters.utmMediums.map(value => (
        <Badge key={value} variant="secondary" className="gap-1 pr-1">
          <span className="text-xs">Medium: {value}</span>
          <button
            onClick={() => onRemoveFilter("utmMediums", value)}
            className="ml-1 rounded-sm hover:bg-muted p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {filters.utmCampaigns.map(value => (
        <Badge key={value} variant="secondary" className="gap-1 pr-1">
          <span className="text-xs">Campaign: {value}</span>
          <button
            onClick={() => onRemoveFilter("utmCampaigns", value)}
            className="ml-1 rounded-sm hover:bg-muted p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
    </div>
  );
}
