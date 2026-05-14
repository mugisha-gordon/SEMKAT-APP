import { useState, lazy, Suspense } from 'react';
import { 
  X, MapPin, Phone, Mail, Calendar, Heart, Share2, 
  ChevronLeft, ChevronRight, Bed, Bath, Maximize, 
  FileCheck, Star, Move3D, Video, Eye
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Property } from '@/types/property';
import { formatPrice, getPropertyTypeLabel } from '@/data/mockData';
import MessageAgentButton from '@/components/messaging/MessageAgentButton';
import { useAuth } from '@/context/AuthContext';
import { deleteProperty } from '@/integrations/firebase/properties';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Lazy load the heavy 3D components
const KmlTourViewer = lazy(() => import('@/components/virtual-tour/KmlTourViewer'));

interface PropertyDetailModalProps {
  property: Property | null;
  open: boolean;
  onClose: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: (property: Property) => void;
  onDeleted?: (propertyId: string) => void;
}

const PropertyDetailModal = ({ property, open, onClose, isFavorite, onToggleFavorite, onDeleted }: PropertyDetailModalProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('photos');
  const { user, role } = useAuth();

  if (!property) return null;

  const images = (property.images && property.images.length > 0) ? property.images : [];

  const hasValidSize = !!property.size && Number.isFinite(property.size.value) && property.size.value > 0;
  const hasDescription = typeof property.description === 'string' && property.description.trim().length > 0;
  const hasFeatures = Array.isArray(property.features) && property.features.length > 0;
  const has3DTour = !!property.illustration3D;

  const canDelete =
    !!user &&
    (property.agent?.id === user.uid ||
      role === 'admin' ||
      user.email === 'adminsemkat@gmail.com');

  const handleDelete = async () => {
    if (!canDelete) return;
    const confirmed = window.confirm('Are you sure you want to delete this property? This action cannot be undone.');
    if (!confirmed) return;

    try {
      await deleteProperty(property.id);
      toast.success('Property deleted successfully');
      onDeleted?.(property.id);
      onClose();
    } catch (error: any) {
      console.error('Error deleting property', error);
      toast.error(error?.message || 'Failed to delete property');
    }
  };

  const nextImage = () => {
    if (images.length <= 1) return;
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    if (images.length <= 1) return;
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  // Check if property supports virtual tour
  const supportsVirtualTour = property.type === 'residential' || property.type === 'commercial' || property.type === 'rental' || property.type === 'land' || property.type === 'agricultural';
  const hasVirtualTour = !!property.illustration3D;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="w-[95vw] sm:w-auto max-w-[95vw] sm:max-w-3xl lg:max-w-5xl max-h-[min(90dvh,calc(100dvh-6rem))] overflow-y-auto p-0"
        style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Property details</DialogTitle>
          <DialogDescription>View details about this property.</DialogDescription>
        </DialogHeader>
        {/* View Mode Tabs */}
        <div className="sticky top-0 z-20 bg-background border-b">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-9 w-9"
            onClick={onClose}
            aria-label="Close"
            title="Close"
          >
            <X className="h-5 w-5" />
          </Button>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start rounded-none bg-transparent border-0 p-0 h-12">
              <TabsTrigger 
                value="photos" 
                className="gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <Eye className="h-4 w-4" />
                Photos
              </TabsTrigger>
              {property.illustration2D && (
                <TabsTrigger 
                  value="floor-plan"
                  className="gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  <FileCheck className="h-4 w-4" />
                  2D Floor Plan
                </TabsTrigger>
              )}
              {supportsVirtualTour && hasVirtualTour && (
                <TabsTrigger 
                  value="virtual-tour"
                  className="gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  <Move3D className="h-4 w-4" />
                  Virtual Tour
                </TabsTrigger>
              )}
              {property.kmlUrl && (
                <TabsTrigger
                  value="estate-tour"
                  className="gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  <MapPin className="h-4 w-4" />
                  Estate Tour
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>
        </div>

        {/* Photos Tab - with KML map next to photos when available */}
        {activeTab === 'photos' && (
          <div className={cn(
            "flex flex-col gap-4",
            property.kmlUrl ? "lg:flex-row lg:gap-4" : ""
          )}>
            {/* Photos section */}
            <div className={cn(
              "relative aspect-video flex-shrink-0",
              property.kmlUrl ? "lg:flex-1 lg:min-w-0" : ""
            )}>
              {images.length > 0 ? (
                <img
                  src={images[Math.min(currentImageIndex, images.length - 1)]}
                  alt={property.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <span className="text-sm text-muted-foreground">No images uploaded</span>
                </div>
              )}
              
              {/* Navigation arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}

              {/* Image indicators */}
              {images.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentImageIndex ? 'bg-primary' : 'bg-background/60'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Top actions */}
              <div className="absolute top-3 right-3 flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-9 w-9 rounded-full bg-background/80 backdrop-blur-sm",
                    isFavorite ? "text-semkat-orange" : ""
                  )}
                  onClick={() => onToggleFavorite?.(property)}
                  aria-label={isFavorite ? "Remove from favorites" : "Save to favorites"}
                >
                  <Heart
                    className={cn(
                      "h-4 w-4",
                      isFavorite ? "fill-semkat-orange text-semkat-orange" : ""
                    )}
                  />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-background/80 backdrop-blur-sm">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Badges */}
              <div className="absolute top-3 left-3 flex gap-2">
                {property.isFeatured && <Badge variant="featured">Featured</Badge>}
                <Badge variant="orange">{getPropertyTypeLabel(property.type)}</Badge>
              </div>

              {/* Virtual Tour Button Overlay */}
              {supportsVirtualTour && hasVirtualTour && (
                <button
                  onClick={() => setActiveTab('virtual-tour')}
                  className="absolute bottom-3 right-3 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full font-medium text-sm hover:bg-primary/90 transition-colors shadow-lg"
                >
                  <Move3D className="h-4 w-4" />
                  View 3D Tour
                </button>
              )}
            </div>

            {/* KML Map - shown next to photos when KML is attached */}
            {property.kmlUrl && (
              <div className={cn(
                "flex-shrink-0 rounded-xl overflow-hidden border border-border bg-muted",
                "lg:w-[min(400px,45%)] lg:flex-shrink-0 lg:min-h-[280px]"
              )}>
                <div className="h-[280px] sm:h-[320px] lg:h-[280px] min-h-[200px] w-full">
                  <Suspense fallback={
                    <div className="h-full w-full flex items-center justify-center">
                      <div className="text-center text-muted-foreground animate-pulse">
                        <MapPin className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-sm">Loading map...</p>
                      </div>
                    </div>
                  }>
                    <div className="h-full w-full">
                      <KmlTourViewer kmlUrl={property.kmlUrl} compact />
                    </div>
                  </Suspense>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'estate-tour' && property.kmlUrl && (
          <div className="p-4">
            <Suspense fallback={
              <div className="h-[420px] rounded-xl bg-muted animate-pulse flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3 animate-pulse" />
                  <p className="text-muted-foreground">Loading estate tour...</p>
                </div>
              </div>
            }>
              <KmlTourViewer kmlUrl={property.kmlUrl} />
            </Suspense>
          </div>
        )}

        {/* 2D Floor Plan Tab */}
        {activeTab === 'floor-plan' && property.illustration2D && (
          <div className="p-4">
            <div className="relative aspect-video rounded-xl overflow-hidden border border-border bg-muted">
              <img 
                src={property.illustration2D} 
                alt="2D Floor Plan" 
                className="w-full h-full object-contain"
              />
            </div>
            <p className="text-sm text-muted-foreground text-center mt-4">
              2D Floor Plan / Diagram
            </p>
          </div>
        )}

        {/* Virtual Tour Tab */}
        {activeTab === 'virtual-tour' && supportsVirtualTour && hasVirtualTour && (
          <div className="p-4">
            {/* If 3D illustration URL is provided, use it directly */}
            <div className="space-y-4">
              <div className="relative aspect-video rounded-xl overflow-hidden border border-border">
                {property.illustration3D.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <img 
                    src={property.illustration3D} 
                    alt="3D Panorama" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <iframe 
                    src={property.illustration3D} 
                    className="w-full h-full border-0"
                    title="3D Virtual Tour"
                    allowFullScreen
                  />
                )}
              </div>
              <p className="text-sm text-muted-foreground text-center">
                3D Virtual Tour / Panorama View
              </p>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header */}
              <div>
                <div className="flex flex-wrap items-baseline gap-3 mb-2 min-w-0">
                  <span className="font-heading text-3xl font-bold text-foreground break-words">
                    {formatPrice(property.price, property.currency)}
                  </span>
                  {property.type === 'rental' && (
                    <span className="text-muted-foreground">/month</span>
                  )}
                </div>
                <h2 className="font-heading text-xl font-semibold text-foreground mb-2 break-words">
                  {property.title}
                </h2>
                <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
                  <MapPin className="h-4 w-4" />
                  <span className="truncate">{property.location.address}, {property.location.district}</span>
                </div>
              </div>

              {/* Quick stats */}
              <div className="flex flex-wrap gap-4 p-4 bg-muted rounded-xl">
                {property.bedrooms && (
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center">
                      <Bed className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold">{property.bedrooms}</div>
                      <div className="text-xs text-muted-foreground">Bedrooms</div>
                    </div>
                  </div>
                )}
                {property.bathrooms && (
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center">
                      <Bath className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold">{property.bathrooms}</div>
                      <div className="text-xs text-muted-foreground">Bathrooms</div>
                    </div>
                  </div>
                )}
                {hasValidSize && (
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center">
                      <Maximize className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold">{property.size.value} {property.size.unit}</div>
                      <div className="text-xs text-muted-foreground">Size</div>
                    </div>
                  </div>
                )}
                {property.hasTitle && (
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-semkat-success/10 flex items-center justify-center">
                      <FileCheck className="h-5 w-5 text-semkat-success" />
                    </div>
                    <div>
                      <div className="font-semibold text-semkat-success">Titled</div>
                      <div className="text-xs text-muted-foreground">Documentation</div>
                    </div>
                  </div>
                )}
                {supportsVirtualTour && has3DTour && (
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-semkat-sky-light flex items-center justify-center">
                      <Move3D className="h-5 w-5 text-semkat-sky" />
                    </div>
                    <div>
                      <div className="font-semibold text-semkat-sky">3D Tour</div>
                      <div className="text-xs text-muted-foreground">Available</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              {hasDescription && (
                <div>
                  <h3 className="font-heading font-semibold text-lg mb-3">Description</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {property.description}
                  </p>
                </div>
              )}

              {/* Features */}
              {hasFeatures && (
                <div>
                  <h3 className="font-heading font-semibold text-lg mb-3">Features & Amenities</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {property.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2 text-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar - Agent card + owner actions */}
            <div className="lg:col-span-1">
              <div className="sticky top-16 p-5 border rounded-xl bg-card space-y-4">
                {property.agent && (
                  <>
                    <div className="flex items-center gap-3">
                      {property.agent.avatar ? (
                        <img
                          src={property.agent.avatar}
                          alt={property.agent.name}
                          className="w-14 h-14 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-muted" />
                      )}
                      <div>
                        <h4 className="font-heading font-semibold">{property.agent.name}</h4>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span>{property.agent.rating}</span>
                          <span>·</span>
                          <span>{property.agent.totalListings} listings</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <MessageAgentButton
                        agentId={property.agent.id}
                        agentName={property.agent.name}
                        label="Message Agent"
                        variant="hero"
                        className="w-full"
                      />
                      <Button variant="outline" className="w-full">
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule Visit
                      </Button>
                      {supportsVirtualTour && hasVirtualTour && activeTab !== 'virtual-tour' && (
                        <Button 
                          variant="sky" 
                          className="w-full"
                          onClick={() => setActiveTab('virtual-tour')}
                        >
                          <Move3D className="h-4 w-4 mr-2" />
                          View Virtual Tour
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="destructive"
                          className="w-full"
                          onClick={handleDelete}
                        >
                          Delete Property
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PropertyDetailModal;
