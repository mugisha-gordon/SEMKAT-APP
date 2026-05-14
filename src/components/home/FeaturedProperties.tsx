import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PropertyCard from '@/components/property/PropertyCard';
import PropertyDetailModal from '@/components/property/PropertyDetailModal';
import { subscribeToProperties } from '@/integrations/firebase/properties';
import type { PropertyDocument } from '@/integrations/firebase/properties';
import { getApprovedAgents } from '@/integrations/firebase/users';
import { Property } from '@/types/property';
import type { Agent } from '@/types/property';

const FeaturedProperties = () => {
  const shuffleSeedRef = useMemo(() => {
    const raw = sessionStorage.getItem('semkat_home_featured_properties_shuffle_seed');
    if (raw) {
      const n = Number(raw);
      if (!Number.isNaN(n)) return n;
    }
    const seed = Date.now();
    sessionStorage.setItem('semkat_home_featured_properties_shuffle_seed', String(seed));
    return seed;
  }, []);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [firestoreProperties, setFirestoreProperties] = useState<PropertyDocument[]>([]);
  const [agentData, setAgentData] = useState<{ [agentId: string]: Agent }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let cancelled = false;

    const init = async () => {
      try {
        const approvedAgents = await getApprovedAgents(50);
        if (cancelled) return;

        const approvedAgentIds = new Set(approvedAgents.map((a) => a.userId));

        const agents: { [agentId: string]: Agent } = {};
        for (const u of approvedAgents) {
          agents[u.userId] = {
            id: u.userId,
            name: u.profile.fullName || 'Agent',
            avatar: u.profile.avatarUrl || '',
            phone: u.profile.phone || '',
            email: u.email,
            rating: 4.5,
            totalListings: 0,
          };
        }

        setAgentData(agents);

        unsub = subscribeToProperties({ limit: 60 }, (allProps) => {
          const props = allProps.filter((p: any) => approvedAgentIds.has(p.agentId) || p.postedByRole === 'admin');
          const listingCounts = props.reduce<Record<string, number>>((acc, p) => {
            acc[p.agentId] = (acc[p.agentId] || 0) + 1;
            return acc;
          }, {});

          setAgentData((prev) => {
            const next: { [agentId: string]: Agent } = { ...prev };
            for (const id of Object.keys(next)) {
              next[id] = { ...next[id], totalListings: listingCounts[id] || 0 };
            }

            // Synthetic admin agent profile (no fake photo)
            for (const p of props as any[]) {
              if (p?.postedByRole === 'admin' && !next[p.agentId]) {
                next[p.agentId] = {
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

            return next;
          });

          setFirestoreProperties(props);
          setLoading(false);
        });
      } catch (error) {
        console.error('Error fetching featured properties:', error);
        setLoading(false);
      }
    };

    init();

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, []);

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
      .map((prop) => ({
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
        installmentPayment: prop.installmentPayment,
        agent: agentData[prop.agentId],
        createdAt: prop.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
      }))
      .filter((p) => !!p.agent)
      .sort((a, b) => rankForId(a.id) - rankForId(b.id));
  }, [firestoreProperties, agentData, shuffleSeedRef]);

  const featuredProperties = useMemo(() => {
    const featured = convertedProperties.filter((p) => p.isFeatured);
    return (featured.length > 0 ? featured : convertedProperties).slice(0, 3);
  }, [convertedProperties]);

  return (
    <section className="py-20">
      <div className="container">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <div>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-2">
              Featured <span className="text-primary">Properties</span>
            </h2>
            <p className="text-muted-foreground">
              Handpicked premium listings for serious investors
            </p>
          </div>
          <Link to="/properties">
            <Button variant="outline-primary" className="group">
              Show More
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProperties.map((property, index) => (
              <div
                key={property.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <PropertyCard property={property} onSelect={setSelectedProperty} />
              </div>
            ))}
          </div>
        )}
      </div>

      <PropertyDetailModal
        property={selectedProperty}
        open={!!selectedProperty}
        onClose={() => setSelectedProperty(null)}
      />
    </section>
  );
};

export default FeaturedProperties;
