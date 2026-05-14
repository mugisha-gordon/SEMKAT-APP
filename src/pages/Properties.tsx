import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, Grid3X3, List, MapPin, X } from 'lucide-react';
import Header from '@/components/layout/Header';
import PropertyCard from '@/components/property/PropertyCard';
import PropertyDetailModal from '@/components/property/PropertyDetailModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Property, PropertyType, PropertyStatus } from '@/types/property';
import { cn } from '@/lib/utils';
import { getProperties } from '@/integrations/firebase/properties';
import type { PropertyDocument } from '@/integrations/firebase/properties';
import { getApprovedAgents } from '@/integrations/firebase/users';
import type { Agent } from '@/types/property';
import { useAuth } from '@/context/AuthContext';
import { addRecentSearch } from '@/integrations/firebase/recentSearches';
import { removeFavoriteProperty, saveFavoriteProperty, subscribeToFavoriteProperties } from '@/integrations/firebase/favorites';

const propertyTypes: { value: PropertyType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'land', label: 'Land' },
  { value: 'residential', label: 'Houses' },
  { value: 'rental', label: 'Rentals' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'agricultural', label: 'Agricultural' },
];

const locations = ['All Locations', 'Kampala', 'Wakiso', 'Mukono', 'Entebbe', 'Jinja'];

const priceRanges = [
  { label: 'Any Price', min: 0, max: Infinity },
  { label: 'Under 100M', min: 0, max: 100000000 },
  { label: '100M - 500M', min: 100000000, max: 500000000 },
  { label: '500M - 1B', min: 500000000, max: 1000000000 },
  { label: 'Above 1B', min: 1000000000, max: Infinity },
];

const Properties = () => {
  const { user } = useAuth();
  const shuffleSeedRef = useMemo(() => {
    const raw = sessionStorage.getItem('semkat_properties_shuffle_seed');
    if (raw) {
      const n = Number(raw);
      if (!Number.isNaN(n)) return n;
    }
    const seed = Date.now();
    sessionStorage.setItem('semkat_properties_shuffle_seed', String(seed));
    return seed;
  }, []);
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get('type') as PropertyType | null;
  
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<PropertyType | 'all'>(initialType || 'all');
  const [selectedLocation, setSelectedLocation] = useState('All Locations');
  const [selectedPriceRange, setSelectedPriceRange] = useState(priceRanges[0]);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [firestoreProperties, setFirestoreProperties] = useState<PropertyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentData, setAgentData] = useState<{ [agentId: string]: Agent }>({});
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const [approvedAgents, allProps] = await Promise.all([
          getApprovedAgents(300),
          getProperties({ limit: 600 }),
        ]);
        const approvedAgentIds = new Set(approvedAgents.map((a) => a.userId));

        const props = allProps.filter((p: any) => approvedAgentIds.has(p.agentId) || p.postedByRole === 'admin');
        setFirestoreProperties(props);

        const listingCounts = props.reduce<Record<string, number>>((acc, p) => {
          acc[p.agentId] = (acc[p.agentId] || 0) + 1;
          return acc;
        }, {});

        const agents: { [agentId: string]: Agent } = {};
        for (const u of approvedAgents) {
          agents[u.userId] = {
            id: u.userId,
            name: u.profile.fullName || 'Unknown Agent',
            avatar: u.profile.avatarUrl || '',
            phone: u.profile.phone || '',
            email: u.email,
            rating: 4.5,
            totalListings: listingCounts[u.userId] || 0,
          };
        }

        // Synthetic admin agent profile so admin-posted properties can render publicly
        for (const p of props as any[]) {
          if (p?.postedByRole === 'admin' && !agents[p.agentId]) {
            agents[p.agentId] = {
              id: p.agentId,
              name: 'Semkat Admin',
              avatar: '',
              phone: '',
              email: 'adminsemkat@gmail.com',
              rating: 5,
              totalListings: listingCounts[p.agentId] || 0,
            };
          }
        }

        setAgentData(agents);
      } catch (error) {
        console.error('Error fetching properties:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  useEffect(() => {
    if (!user) {
      setFavoriteIds(new Set());
      return;
    }

    const unsub = subscribeToFavoriteProperties(user.uid, (items) => {
      setFavoriteIds(new Set(items.map((i) => i.propertyId)));
    });

    return () => {
      unsub();
    };
  }, [user]);

  // Convert Firestore properties to Property type for compatibility
  const convertedProperties: Property[] = useMemo(() => {
    const rankForId = (id: string) => {
      let h = 2166136261;
      const s = `${shuffleSeedRef}:${id}`;
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    };

    return firestoreProperties
      .map(prop => ({
      id: prop.id,
      title: prop.title,
      type: prop.type,
      status: prop.status,
      price: prop.price,
      currency: prop.currency,
      location: prop.location,
      size: prop.size,
      images: (prop as any).images || [],
      illustration2D: prop.illustration2D,
      illustration3D: prop.illustration3D,
      kmlUrl: (prop as any).kmlUrl,
      postedByRole: (prop as any).postedByRole,
      description: prop.description,
      features: prop.features,
      hasTitle: prop.hasTitle,
      isFeatured: prop.isFeatured,
      bedrooms: prop.bedrooms,
      bathrooms: prop.bathrooms,
      agent: agentData[prop.agentId],
      createdAt: prop.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
    }))
      .filter((p) => !!p.agent)
      .sort((a, b) => rankForId(a.id) - rankForId(b.id));
  }, [firestoreProperties, agentData, shuffleSeedRef]);

  const filteredProperties = useMemo(() => {
    return convertedProperties.filter((property) => {
      // Type filter
      if (selectedType !== 'all' && property.type !== selectedType) return false;
      
      // Location filter
      if (selectedLocation !== 'All Locations' && 
          !property.location.district.toLowerCase().includes(selectedLocation.toLowerCase())) {
        return false;
      }
      
      // Price filter
      if (property.price < selectedPriceRange.min || property.price > selectedPriceRange.max) {
        return false;
      }
      
      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          property.title.toLowerCase().includes(query) ||
          property.location.district.toLowerCase().includes(query) ||
          property.location.address.toLowerCase().includes(query)
        );
      }
      
      return true;
    });
  }, [convertedProperties, selectedType, selectedLocation, selectedPriceRange, searchQuery]);

  const activeFiltersCount = [
    selectedType !== 'all',
    selectedLocation !== 'All Locations',
    selectedPriceRange.label !== 'Any Price',
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSelectedType('all');
    setSelectedLocation('All Locations');
    setSelectedPriceRange(priceRanges[0]);
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 bg-muted/30">
        {/* Hero */}
        <section className="bg-gradient-hero py-8 sm:py-12">
          <div className="container">
            <h1 className="font-heading text-2xl xs:text-3xl sm:text-4xl font-bold text-primary-foreground mb-2">
              Browse Properties
            </h1>
            <p className="text-primary-foreground/80 text-sm xs:text-base">
              Find your perfect investment from our curated selection
            </p>
          </div>
        </section>

        <div className="container py-6 sm:py-8">
          {/* Search and filters bar */}
          <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8">
            {/* Search input */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search properties..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && user) {
                    addRecentSearch(user.uid, searchQuery).catch((err) => {
                      console.error('Failed to save recent search', err);
                    });
                  }
                }}
                className="w-full h-12 pl-12 pr-4 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            {/* Filter toggles */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={showFilters ? 'default' : 'outline'}
                onClick={() => setShowFilters(!showFilters)}
                className="relative"
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filters
                {activeFiltersCount > 0 && (
                  <Badge variant="featured" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
              
              <div className="hidden sm:flex border rounded-lg overflow-hidden">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('grid')}
                  className="rounded-none"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('list')}
                  className="rounded-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Expandable filters */}
          {showFilters && (
            <div className="bg-card border rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 animate-scale-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {/* Property Type */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Property Type
                  </label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value as PropertyType | 'all')}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {propertyTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Location */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Location
                  </label>
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {locations.map((location) => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price Range */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Price Range
                  </label>
                  <select
                    value={selectedPriceRange.label}
                    onChange={(e) => {
                      const range = priceRanges.find(r => r.label === e.target.value);
                      if (range) setSelectedPriceRange(range);
                    }}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {priceRanges.map((range) => (
                      <option key={range.label} value={range.label}>
                        {range.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Clear filters */}
                <div className="flex items-end">
                  <Button variant="ghost" onClick={clearFilters} className="w-full">
                    <X className="h-4 w-4 mr-2" />
                    Clear Filters
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Results count */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <p className="text-muted-foreground min-w-0">
              Showing <span className="font-semibold text-foreground">{filteredProperties.length}</span> properties
            </p>
            
            {/* Active filter badges */}
            {activeFiltersCount > 0 && (
              <div className="hidden sm:flex flex-wrap gap-2 justify-end">
                {selectedType !== 'all' && (
                  <Badge variant="orange" className="cursor-pointer" onClick={() => setSelectedType('all')}>
                    {selectedType} <X className="h-3 w-3 ml-1" />
                  </Badge>
                )}
                {selectedLocation !== 'All Locations' && (
                  <Badge variant="sky" className="cursor-pointer" onClick={() => setSelectedLocation('All Locations')}>
                    {selectedLocation} <X className="h-3 w-3 ml-1" />
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Property grid */}
          {loading ? (
            <div className="text-center py-16">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading properties...</p>
            </div>
          ) : filteredProperties.length > 0 ? (
            <div className={cn(
              "grid gap-6",
              viewMode === 'grid' 
                ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" 
                : "grid-cols-1"
            )}>
              {filteredProperties.map((property, index) => (
                <div
                  key={property.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <PropertyCard 
                    property={property} 
                    onSelect={setSelectedProperty}
                    isFavorite={favoriteIds.has(property.id)}
                    onToggleFavorite={async (p) => {
                      if (!user) return;
                      const isFav = favoriteIds.has(p.id);
                      try {
                        if (isFav) {
                          await removeFavoriteProperty(user.uid, p.id);
                        } else {
                          await saveFavoriteProperty(user.uid, p);
                        }
                      } catch (err) {
                        console.error('Failed to toggle favorite', err);
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-heading text-xl font-semibold text-foreground mb-2">
                No properties found
              </h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your filters or search query
              </p>
              <Button variant="outline" onClick={clearFilters}>
                Clear all filters
              </Button>
            </div>
          )}
        </div>
      </main>

      <PropertyDetailModal
        property={selectedProperty}
        open={!!selectedProperty}
        onClose={() => setSelectedProperty(null)}
        isFavorite={!!(selectedProperty && favoriteIds.has(selectedProperty.id))}
        onToggleFavorite={async (p) => {
          if (!user) return;
          const isFav = favoriteIds.has(p.id);
          try {
            if (isFav) {
              await removeFavoriteProperty(user.uid, p.id);
            } else {
              await saveFavoriteProperty(user.uid, p);
            }
          } catch (err) {
            console.error('Failed to toggle favorite', err);
          }
        }}
        onDeleted={(id) => {
          setSelectedProperty(null);
          setFirestoreProperties((prev) => prev.filter((p) => p.id !== id));
        }}
      />
    </div>
  );
};

export default Properties;
