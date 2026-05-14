import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Home, Building, TreePine, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const propertyTypes = [
  { id: 'all', label: 'All', icon: Search },
  { id: 'land', label: 'Land', icon: TreePine },
  { id: 'residential', label: 'Houses', icon: Home },
  { id: 'rental', label: 'Rentals', icon: Key },
  { id: 'commercial', label: 'Commercial', icon: Building },
];

const HeroSection = () => {
  const navigate = useNavigate();
  const [activeType, setActiveType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('location', searchQuery);
    if (activeType !== 'all') params.set('type', activeType);
    navigate(`/properties?${params.toString()}`);
  };

  const handleLocationClick = (location: string) => {
    navigate(`/properties?location=${encodeURIComponent(location)}`);
  };

  return (
    <section className="relative min-h-[600px] lg:min-h-[700px] overflow-hidden">
      {/* Background with gradient overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1920&h=1080&fit=crop)',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/90 via-foreground/70 to-foreground/50" />
      </div>

      {/* Decorative elements */}
      <div className="absolute top-20 right-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />

      <div className="container relative z-10 flex flex-col justify-center min-h-[600px] lg:min-h-[700px] py-12">
        <div className="max-w-3xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30 text-primary-foreground text-sm font-medium mb-6 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Uganda's Trusted Real Estate Partner
          </div>

          {/* Headline */}
          <h1 className="font-heading text-3xl xs:text-4xl sm:text-5xl lg:text-6xl font-bold text-background leading-tight mb-6 animate-slide-up break-words">
            Invest in Your Future with{' '}
            <span className="text-gradient bg-gradient-hero break-words">Semkat Group Uganda Limited</span>
          </h1>

          <p className="text-base xs:text-lg sm:text-xl text-background/80 max-w-2xl mb-10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Discover verified land, premium properties, and investment opportunities across Uganda. From land sales to construction — we've got you covered.
          </p>

          {/* Search Box */}
          <div className="bg-background rounded-2xl p-4 sm:p-6 shadow-2xl animate-slide-up" style={{ animationDelay: '0.2s' }}>
            {/* Property type tabs */}
            <div className="flex flex-wrap gap-2 mb-4">
              {propertyTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => setActiveType(type.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-normal transition-all",
                      activeType === type.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {type.label}
                  </button>
                );
              })}
            </div>

            {/* Search inputs */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by location, district, or address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-12 pl-12 pr-4 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
              <Button variant="hero" size="lg" className="h-12 px-8" onClick={handleSearch}>
                <Search className="h-5 w-5 mr-2" />
                Search
              </Button>
            </div>

            {/* Quick filters */}
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="text-xs text-muted-foreground">Popular:</span>
              {['Kampala', 'Entebbe', 'Mukono', 'Wakiso', 'Jinja'].map((location) => (
                <button
                  key={location}
                  onClick={() => handleLocationClick(location)}
                  className="text-xs px-3 py-1 rounded-full bg-muted hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                >
                  {location}
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 xs:grid-cols-3 gap-4 sm:gap-6 mt-10 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            {[
              { value: '500+', label: 'Properties Listed' },
              { value: '1,200+', label: 'Happy Clients' },
              { value: '50+', label: 'Expert Agents' },
            ].map((stat) => (
              <div key={stat.label} className="text-center sm:text-left">
                <div className="font-heading text-2xl sm:text-3xl font-bold text-background">{stat.value}</div>
                <div className="text-sm text-background/60">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
