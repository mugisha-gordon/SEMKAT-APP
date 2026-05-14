import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getApprovedAgents } from '@/integrations/firebase/users';
import { getAgentPropertyCounts } from '@/integrations/firebase/properties';
import type { Agent } from '@/types/property';
import MessageAgentButton from '@/components/messaging/MessageAgentButton';

const AgentsSection = () => {
  const shuffleSeedRef = useMemo(() => {
    const raw = sessionStorage.getItem('semkat_home_agents_shuffle_seed');
    if (raw) {
      const n = Number(raw);
      if (!Number.isNaN(n)) return n;
    }
    const seed = Date.now();
    sessionStorage.setItem('semkat_home_agents_shuffle_seed', String(seed));
    return seed;
  }, []);
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const approvedAgents = await getApprovedAgents(60);

        const countsByAgent = await Promise.all(
          approvedAgents.map(async (a) => {
            try {
              const counts = await getAgentPropertyCounts(a.userId);
              return [a.userId, counts.totalListings] as const;
            } catch {
              return [a.userId, 0] as const;
            }
          })
        );

        const listingCounts = countsByAgent.reduce<Record<string, number>>((acc, [agentId, total]) => {
          acc[agentId] = total;
          return acc;
        }, {});

        const rankForId = (id: string) => {
          let h = 2166136261;
          const s = `${shuffleSeedRef}:${id}`;
          for (let i = 0; i < s.length; i++) {
            h ^= s.charCodeAt(i);
            h = Math.imul(h, 16777619);
          }
          return h >>> 0;
        };

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

        setAgents(mapped.sort((a, b) => rankForId(a.id) - rankForId(b.id)).slice(0, 3));
      } catch (error) {
        console.error('Error fetching agents:', error);
      }
    };

    fetchAgents();
  }, [shuffleSeedRef]);

  return (
    <section className="py-20 bg-muted/30">
      <div className="container">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <div>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-2">
              Meet Our <span className="text-secondary">Expert Agents</span>
            </h2>
            <p className="text-muted-foreground">
              Professional real estate consultants ready to help you
            </p>
          </div>
          <Link to="/agents">
            <Button variant="outline-sky" className="group">
              Show More
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent, index) => (
            <Card 
              key={agent.id} 
              variant="elevated" 
              className="p-6 text-center group"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="relative mx-auto w-24 h-24 mb-4">
                <Link to={`/profile/${agent.id}`} className="block">
                  {agent.avatar ? (
                    <img
                      src={agent.avatar}
                      alt={agent.name}
                      className="w-full h-full rounded-full object-cover ring-4 ring-background shadow-lg group-hover:ring-primary/20 transition-all"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full rounded-full ring-4 ring-background shadow-lg bg-muted group-hover:ring-primary/20 transition-all" />
                  )}
                </Link>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-semkat-sky flex items-center justify-center text-secondary-foreground text-xs font-bold shadow">
                  {agent.rating}
                </div>
              </div>
              
              <Link to={`/profile/${agent.id}`} className="inline-block">
                <h3 className="font-heading font-semibold text-foreground mb-1 hover:underline">
                  {agent.name}
                </h3>
              </Link>
              
              <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-3">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span>{agent.rating} rating</span>
                <span>·</span>
                <span>{agent.totalListings} listings</span>
              </div>

              <MessageAgentButton
                agentId={agent.id}
                agentName={agent.name}
                label="Message Agent"
                variant="outline"
                className="w-full"
              />
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AgentsSection;
