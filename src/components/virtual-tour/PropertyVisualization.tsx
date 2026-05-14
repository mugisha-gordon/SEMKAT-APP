import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Move3D, LayoutGrid, MapPin, Play, Pause, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import VirtualTour3D from './VirtualTour3D';
import InteractiveFloorPlan from './InteractiveFloorPlan';
import LandPlotMap from '@/components/land/LandPlotMap';
import { Property } from '@/types/property';

interface PropertyVisualizationProps {
  property: Property;
}

const PropertyVisualization = ({ property }: PropertyVisualizationProps) => {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [currentTab, setCurrentTab] = useState('3d');

  // Determine if property supports various visualization modes
  const has3DTour = property.type === 'residential' || property.type === 'commercial' || property.type === 'rental';
  const hasFloorPlan = property.type === 'residential' || property.type === 'rental';
  const hasVideoTour = property.images.length > 0;
  const isLandProperty = property.type === 'land' || property.type === 'agricultural';
  const hasDroneView = isLandProperty;

  // Sample drone/satellite imagery for land properties
  const droneImages = [
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1500076656116-558758c991c1?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1200&h=800&fit=crop',
  ];

  // Set default tab based on property type
  const defaultTab = isLandProperty
    ? 'map'
    : (has3DTour ? '3d' : (hasFloorPlan ? 'floorplan' : (hasVideoTour ? 'video' : '3d')));

  return (
    <div className="space-y-4">
      <Tabs value={currentTab || defaultTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="w-full justify-start bg-muted/50 p-1 h-auto flex-wrap gap-1">
          {isLandProperty && (
            <TabsTrigger 
              value="map" 
              className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Map className="h-4 w-4" />
              Plot Map
            </TabsTrigger>
          )}
          {has3DTour && (
            <TabsTrigger 
              value="3d" 
              className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Move3D className="h-4 w-4" />
              3D Tour
            </TabsTrigger>
          )}
          {hasFloorPlan && (
            <TabsTrigger 
              value="floorplan"
              className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <LayoutGrid className="h-4 w-4" />
              Floor Plan
            </TabsTrigger>
          )}
          {hasDroneView && (
            <TabsTrigger 
              value="drone"
              className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <MapPin className="h-4 w-4" />
              Aerial View
            </TabsTrigger>
          )}
          {hasVideoTour && (
            <TabsTrigger 
              value="video"
              className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Play className="h-4 w-4" />
              Video Tour
            </TabsTrigger>
          )}
        </TabsList>

        {/* Land Plot Map Tab */}
        {isLandProperty && (
          <TabsContent value="map" className="mt-4">
            <LandPlotMap 
              estateName={property.title}
              location={property.location.district + ', ' + property.location.region}
            />
          </TabsContent>
        )}

        {has3DTour && (
          <TabsContent value="3d" className="mt-4">
            <VirtualTour3D 
              propertyType={property.type as 'residential' | 'commercial' | 'land'} 
            />
          </TabsContent>
        )}

        {hasFloorPlan && (
          <TabsContent value="floorplan" className="mt-4">
            <InteractiveFloorPlan 
              totalArea={property.size.unit === 'sqft' 
                ? Math.round(property.size.value * 0.093) 
                : property.size.value
              }
              unit="sqm"
            />
          </TabsContent>
        )}

        {hasDroneView && (
          <TabsContent value="drone" className="mt-4">
            <div className="space-y-4">
              <div className="relative aspect-video rounded-xl overflow-hidden bg-muted">
                <img
                  src={droneImages[0]}
                  alt="Aerial view"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                  <div className="bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2">
                    <div className="text-sm font-semibold text-foreground">
                      {property.size.value} {property.size.unit}
                    </div>
                    <div className="text-xs text-muted-foreground">Property Boundaries</div>
                  </div>
                  <div className="flex gap-2">
                    {droneImages.map((img, i) => (
                      <button
                        key={i}
                        className="w-12 h-12 rounded-lg overflow-hidden border-2 border-background/50 hover:border-primary transition-colors"
                      >
                        <img src={img} alt={`View ${i + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-card rounded-lg border p-3 text-center">
                  <div className="text-lg font-bold text-primary">{property.size.value}</div>
                  <div className="text-xs text-muted-foreground">{property.size.unit}</div>
                </div>
                <div className="bg-card rounded-lg border p-3 text-center">
                  <div className="text-lg font-bold text-semkat-success">Verified</div>
                  <div className="text-xs text-muted-foreground">Boundaries</div>
                </div>
                <div className="bg-card rounded-lg border p-3 text-center">
                  <div className="text-lg font-bold text-semkat-sky">GPS</div>
                  <div className="text-xs text-muted-foreground">Coordinates</div>
                </div>
                <div className="bg-card rounded-lg border p-3 text-center">
                  <div className="text-lg font-bold text-foreground">2024</div>
                  <div className="text-xs text-muted-foreground">Survey Date</div>
                </div>
              </div>
            </div>
          </TabsContent>
        )}

        {hasVideoTour && (
          <TabsContent value="video" className="mt-4">
            <div className="relative aspect-video rounded-xl overflow-hidden bg-muted">
              <img
                src={property.images[0]}
                alt={property.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <Button
                  variant="hero"
                  size="lg"
                  className="rounded-full w-16 h-16 p-0"
                  onClick={() => setIsVideoPlaying(!isVideoPlaying)}
                >
                  {isVideoPlaying ? (
                    <Pause className="h-6 w-6" />
                  ) : (
                    <Play className="h-6 w-6 ml-1" />
                  )}
                </Button>
              </div>
              <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2">
                <div className="text-sm font-semibold text-foreground">Video Walkthrough</div>
                <div className="text-xs text-muted-foreground">Duration: 3:45</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-3 text-center">
              Full video tour available • Contact agent for viewing appointment
            </p>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default PropertyVisualization;
