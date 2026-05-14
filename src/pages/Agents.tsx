import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, MapPin, Building } from 'lucide-react';
import Header from '@/components/layout/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getApprovedAgents } from '@/integrations/firebase/users';
import { getProperties } from '@/integrations/firebase/properties';
import type { Agent } from '@/types/property';
import MessageAgentButton from '@/components/messaging/MessageAgentButton';

const Agents = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const [approvedAgents, allProps] = await Promise.all([
          getApprovedAgents(200),
          getProperties({ limit: 600 }),
        ]);

        const approvedAgentIds = new Set(approvedAgents.map((a) => a.userId));
        const props = allProps.filter((p) => approvedAgentIds.has(p.agentId));

        const listingCounts = props.reduce<Record<string, number>>((acc, p) => {
          acc[p.agentId] = (acc[p.agentId] || 0) + 1;
          return acc;
        }, {});

        const mapped = approvedAgents.map((u) => ({
          id: u.userId,
          name: u.profile?.fullName || u.email || 'Agent',
          avatar:
            u.profile?.avatarUrl ||
            (u as any)?.avatarUrl ||
            '',
          phone: u.profile?.phone || '',
          email: u.email,
          rating: 4.5,
          totalListings: listingCounts[u.userId] || 0,
        }));

        setAgents(mapped);
      } catch (error) {
        console.error('Error fetching agents:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-hero py-10 sm:py-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1920')] bg-cover bg-center mix-blend-overlay opacity-10" />
          <div className="container relative">
            <Badge variant="featured" className="mb-4">Meet Our Team</Badge>
            <h1 className="font-heading text-2xl xs:text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-foreground mb-3 sm:mb-4">
              Expert Real Estate Agents
            </h1>
            <p className="text-primary-foreground/80 text-sm xs:text-base sm:text-lg max-w-2xl">
              Connect with experienced professionals dedicated to helping you find your perfect property investment.
            </p>
          </div>
        </section>

        {/* Stats */}
        <section className="py-8 sm:py-12 bg-card border-b">
          <div className="container">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-center">
              {[
                { value: '50+', label: 'Expert Agents' },
                { value: '1,200+', label: 'Properties Sold' },
                { value: '4.8', label: 'Average Rating' },
                { value: '10+', label: 'Years Experience' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="font-heading text-2xl xs:text-3xl font-bold text-primary">{stat.value}</div>
                  <div className="text-xs xs:text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Agents grid */}
        <section className="py-10 sm:py-16 bg-muted/30">
          <div className="container">
            {loading ? (
              <div className="text-center py-16">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {agents.map((agent, index) => (
                  <Card 
                    key={agent.id} 
                    variant="elevated" 
                    className="overflow-hidden"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {/* Header with avatar */}
                    <div className="relative h-32 bg-gradient-hero">
                      <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
                        <Link to={`/profile/${agent.id}`} className="block">
                          {agent.avatar ? (
                            <img
                              src={agent.avatar}
                              alt={agent.name}
                              className="w-20 h-20 xs:w-24 xs:h-24 rounded-full object-cover ring-4 ring-background shadow-lg"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-20 h-20 xs:w-24 xs:h-24 rounded-full ring-4 ring-background shadow-lg bg-muted" />
                          )}
                        </Link>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="pt-14 pb-6 px-4 sm:px-6 text-center">
                      <Link to={`/profile/${agent.id}`} className="inline-block">
                        <h3 className="font-heading text-base xs:text-lg font-semibold text-foreground mb-1 hover:underline">
                          {agent.name}
                        </h3>
                      </Link>
                      <p className="text-xs xs:text-sm text-muted-foreground mb-3">Real Estate Consultant</p>
                      
                      {/* Rating */}
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                              key={i} 
                              className={`h-4 w-4 ${
                                i < Math.floor(agent.rating) 
                                  ? 'fill-amber-400 text-amber-400' 
                                  : 'text-muted'
                              }`} 
                            />
                          ))}
                        </div>
                        <span className="text-xs xs:text-sm font-medium">{agent.rating}</span>
                      </div>

                      {/* Stats */}
                      <div className="flex justify-center gap-4 mb-4 text-xs xs:text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Building className="h-4 w-4" />
                          <span>{agent.totalListings} listings</span>
                        </div>
                      </div>

                      <MessageAgentButton
                        agentId={agent.id}
                        agentName={agent.name}
                        label="Message Agent"
                        variant="hero"
                        className="w-full"
                      />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Office locations */}
        <section className="py-16">
          <div className="container">
            <div className="text-center mb-10">
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground mb-3">
                Our Offices
              </h2>
              <p className="text-muted-foreground">Visit us at any of our locations across Uganda</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  city: 'Wakiso District, Kayunga (HQ)',
                  address: 'Hoima Road, Kayunga',
                  phone: '+256 772336754/ +256 200 999 599',
                },
                
              ].map((office) => (
                <Card key={office.city} variant="elevated" className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-semkat-orange-light flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-heading font-semibold text-foreground mb-1">
                        {office.city}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">{office.address}</p>
                      <a 
                        href={`tel:${office.phone}`} 
                        className="text-sm text-primary hover:underline"
                      >
                        {office.phone}
                      </a>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Agents;
