import { Heart, MapPin, Maximize, Bed, Bath, Move3D } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Property } from '@/types/property';
import { formatPrice, getPropertyTypeLabel } from '@/data/mockData';
import { cn } from '@/lib/utils';

interface PropertyCardProps {
  property: Property;
  onSelect?: (property: Property) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (property: Property) => void;
}

const PropertyCard = ({ property, onSelect, isFavorite, onToggleFavorite }: PropertyCardProps) => {
  const statusColors: Record<string, 'success' | 'destructive' | 'warning' | 'sky'> = {
    available: 'success',
    sold: 'destructive',
    'under-offer': 'warning',
    rented: 'sky',
  };

  const primaryImage = property.images?.[0];
  const hasValidSize = !!property.size && Number.isFinite(property.size.value) && property.size.value > 0;

  return (
    <Card 
      variant="property" 
      className="group"
      onClick={() => onSelect?.(property)}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={property.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <span className="text-sm text-muted-foreground">No images uploaded</span>
          </div>
        )}
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Top badges */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
          <div className="flex flex-col gap-2 min-w-0">
            {property.isFeatured && (
              <Badge variant="featured">Featured</Badge>
            )}
            <Badge variant={statusColors[property.status]}>
              {property.status.replace('-', ' ')}
            </Badge>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 shrink-0 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite?.(property);
            }}
          >
            <Heart className={cn('h-4 w-4', isFavorite ? 'fill-semkat-orange text-semkat-orange' : '')} />
          </Button>
        </div>

        {/* Property type badge */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
          <Badge variant="orange" className="shrink-0">{getPropertyTypeLabel(property.type)}</Badge>
          <div className="flex flex-wrap items-center justify-end gap-2 min-w-0">
            {!!property.kmlUrl && (
              <div className="flex items-center gap-1 bg-semkat-orange/90 text-white px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
                <MapPin className="h-3 w-3" />
                <span>Estate Tour</span>
              </div>
            )}
            {!!property.illustration3D && (
              <div className="flex items-center gap-1 bg-sky/90 text-white px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
                <Move3D className="h-3 w-3" />
                <span>3D Tour</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4 min-w-0">
        {/* Price */}
        <div className="flex items-baseline gap-2 mb-2">
          <span className="font-heading text-lg xs:text-xl font-bold text-foreground truncate">
            {formatPrice(property.price, property.currency)}
          </span>
          {property.type === 'rental' && (
            <span className="text-xs xs:text-sm text-muted-foreground">/month</span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-heading font-semibold text-foreground text-sm xs:text-base line-clamp-2 mb-2 group-hover:text-primary transition-colors">
          {property.title}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs xs:text-sm mb-3 min-w-0">
          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="line-clamp-1">{property.location.district}, {property.location.region}</span>
        </div>

        {/* Features */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs xs:text-sm text-muted-foreground">
          {property.bedrooms && (
            <div className="flex items-center gap-1">
              <Bed className="h-4 w-4" />
              <span>{property.bedrooms}</span>
            </div>
          )}
          {property.bathrooms && (
            <div className="flex items-center gap-1">
              <Bath className="h-4 w-4" />
              <span>{property.bathrooms}</span>
            </div>
          )}
          {hasValidSize && (
            <div className="flex items-center gap-1">
              <Maximize className="h-4 w-4" />
              <span>{property.size.value} {property.size.unit}</span>
            </div>
          )}
        </div>

        {/* Title status */}
        {property.hasTitle && (
          <div className="mt-3 pt-3 border-t">
            <span className="inline-flex items-center gap-1.5 text-xs text-semkat-success font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-semkat-success" />
              Title deed available
            </span>
          </div>
        )}
      </div>
    </Card>
  );
};

export default PropertyCard;
