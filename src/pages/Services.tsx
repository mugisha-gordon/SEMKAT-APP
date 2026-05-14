import { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { 
  FileText, HardHat, CreditCard, Car, CheckCircle, 
  ArrowRight, Phone, MessageCircle, Wallet 
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const services = [
  {
    id: 'documentation',
    icon: FileText,
    title: 'Land Documentation',
    subtitle: 'Secure Your Investment',
    description: 'Professional land title processing, verification, and transfer services. We handle all legal documentation to ensure your property investment is secure.',
    features: [
      'Title deed processing',
      'Land verification & survey',
      'Transfer of ownership',
      'Legal representation',
      'Documentation review',
      'Dispute resolution',
    ],
    color: 'bg-blue-100 text-blue-600',
    gradient: 'from-blue-500 to-blue-600',
  },
  {
    id: 'construction',
    icon: HardHat,
    title: 'Construction Services',
    subtitle: 'Build Your Dream',
    description: 'End-to-end construction services from architectural design to final handover. We bring your property vision to life with quality craftsmanship.',
    features: [
      'Architectural design',
      'Project management',
      'Residential construction',
      'Commercial buildings',
      'Renovations & additions',
      'Quality assurance',
    ],
    color: 'bg-orange-100 text-orange-600',
    gradient: 'from-orange-500 to-orange-600',
  },
  {
    id: 'financing',
    icon: CreditCard,
    title: 'Property Financing',
    subtitle: 'Flexible Payment Solutions',
    description: 'Access flexible financing options for your property investment. We partner with leading financial institutions to offer competitive rates.',
    features: [
      'Mortgage facilitation',
      'Investment financing',
      'Developer partnerships',
      'Financial advisory',
      'Quick approvals',
      'Flexible terms',
    ],
    color: 'bg-teal-100 text-teal-600',
    gradient: 'from-teal-500 to-teal-600',
  },
  {
    id: 'installments',
    icon: Wallet,
    title: 'Payment in Instalments',
    subtitle: 'Affordable Ownership',
    description: 'Own your dream property without the financial strain. Our instalment payment plans make property ownership accessible to everyone.',
    features: [
      'Flexible payment schedules',
      'Low down payments',
      'No hidden fees',
      'Customized plans',
      '6-24 month terms',
      'Easy application',
    ],
    color: 'bg-emerald-100 text-emerald-600',
    gradient: 'from-emerald-500 to-emerald-600',
  },
  {
    id: 'vehicles',
    icon: Car,
    title: 'Cars Sold',
    subtitle: 'Quality Vehicles',
    description: 'Browse our curated selection of quality vehicles. From personal cars to commercial vehicles, find reliable transportation solutions with financing options.',
    features: [
      'Quality inspected vehicles',
      'Financing available',
      'Trade-in options',
      'After-sales support',
      'Registration assistance',
      'Insurance facilitation',
    ],
    color: 'bg-purple-100 text-purple-600',
    gradient: 'from-purple-500 to-purple-600',
  },
];

const Services = () => {
  const { serviceId } = useParams();
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    if (serviceId && sectionRefs.current[serviceId]) {
      sectionRefs.current[serviceId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [serviceId]);
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-sky py-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1920')] bg-cover bg-center mix-blend-overlay opacity-10" />
          <div className="container relative">
            <Badge variant="sky" className="mb-4">Beyond Real Estate</Badge>
            <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-secondary-foreground mb-4">
              Comprehensive Services
            </h1>
            <p className="text-secondary-foreground/80 text-lg max-w-2xl">
              From documentation to construction, financing to vehicles — Semkat provides complete solutions for all your investment needs.
            </p>
          </div>
        </section>

        {/* Services grid */}
        <section className="py-20">
          <div className="container">
            <div className="space-y-16">
              {services.map((service, index) => {
                const Icon = service.icon;
                const isEven = index % 2 === 0;
                
                return (
                  <div
                    key={service.id}
                    ref={(el) => { sectionRefs.current[service.id] = el; }}
                    className={`grid lg:grid-cols-2 gap-8 items-center ${
                      isEven ? '' : 'lg:grid-flow-dense'
                    }`}
                  >
                    {/* Content */}
                    <div className={isEven ? '' : 'lg:col-start-2'}>
                      <div className={`w-14 h-14 rounded-2xl ${service.color} flex items-center justify-center mb-6`}>
                        <Icon className="h-7 w-7" />
                      </div>
                      <Badge variant="outline" className="mb-3">{service.subtitle}</Badge>
                      <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground mb-4">
                        {service.title}
                      </h2>
                      <p className="text-muted-foreground text-lg mb-6">
                        {service.description}
                      </p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                        {service.features.map((feature) => (
                          <div key={feature} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-semkat-success flex-shrink-0" />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <Link to="/about">
                          <Button variant="hero">
                            Learn More
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </Link>
                        <a href="tel:+256772336754">
                          <Button variant="outline">
                            <Phone className="h-4 w-4 mr-2" />
                            Contact Us
                          </Button>
                        </a>
                      </div>
                    </div>

                    {/* Visual card */}
                    <Card 
                      variant="elevated" 
                      className={`p-8 bg-gradient-to-br ${service.gradient} text-white min-h-[300px] flex items-center justify-center ${
                        isEven ? '' : 'lg:col-start-1'
                      }`}
                    >
                      <div className="text-center">
                        <Icon className="h-20 w-20 mx-auto mb-4 opacity-90" />
                        <h3 className="font-heading text-2xl font-bold mb-2">{service.title}</h3>
                        <p className="opacity-80">{service.subtitle}</p>
                      </div>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-muted/50">
          <div className="container">
            <Card variant="elevated" className="p-8 md:p-12 text-center">
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground mb-4">
                Need Help Choosing the Right Service?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                Our expert team is ready to guide you through the best options for your specific needs.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/agents">
                  <Button variant="hero" size="lg">
                    <MessageCircle className="h-5 w-5 mr-2" />
                    Message an Agent
                  </Button>
                </Link>
                <a href="tel:+256772336754">
                  <Button variant="outline" size="lg">
                    <Phone className="h-5 w-5 mr-2" />
                    Call +256 772336754
                  </Button>
                </a>
              </div>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Services;
