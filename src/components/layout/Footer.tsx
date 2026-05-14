import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';

const Footer = () => {
  const quickLinks = [
    { label: "Properties", to: "/properties" },
    { label: "Land Sales", to: "/properties?type=land" },
    { label: "Rentals", to: "/properties?type=rent" },
    { label: "Commercial", to: "/properties?type=commercial" },
    { label: "Agents", to: "/agents" },
  ];

  const serviceLinks = [
    { label: "Land Documentation", to: "/services" },
    { label: "Construction", to: "/services" },
    { label: "Property Financing", to: "/services" },
    { label: "Property Management", to: "/services" },
    { label: "Valuation", to: "/services" },
  ];

  return (
    <footer className="bg-background text-foreground">
      <div className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">

          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
            <div className="flex items-center justify-center h-12 w-12 sm:h-14 sm:w-14 rounded-2xl glass glass-border shadow-md">
              <img 
                src="/semkat-logo.png" 
                alt="Semkat Group Uganda Limited" 
                className="h-10 w-10 object-contain"
                onError={(e) => {
                  // Fallback if image doesn't load
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
              <span className="font-heading text-xl font-bold">Semkat Group Uganda Ltd</span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Your trusted partner for real estate, land investments, construction, and financial services across Uganda.
            </p>
            <div className="flex items-center gap-3">
              <a href="https://www.facebook.com/" target="_blank" rel="noreferrer" className="h-9 w-9 rounded-full bg-background/10 flex items-center justify-center hover:bg-primary transition-colors">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="https://x.com/" target="_blank" rel="noreferrer" className="h-9 w-9 rounded-full bg-background/10 flex items-center justify-center hover:bg-primary transition-colors">
                <Twitter className="h-4 w-4" />
              </a>
              <a href="https://www.instagram.com/" target="_blank" rel="noreferrer" className="h-9 w-9 rounded-full bg-background/10 flex items-center justify-center hover:bg-primary transition-colors">
                <Instagram className="h-4 w-4" />
              </a>
              <a href="https://www.linkedin.com/" target="_blank" rel="noreferrer" className="h-9 w-9 rounded-full bg-background/10 flex items-center justify-center hover:bg-primary transition-colors">
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-heading font-semibold text-lg mb-4">Quick Links</h4>
            <ul className="space-y-3">
              {quickLinks.map((item) => (
                <li key={item.label}>
                  <Link to={item.to} className="text-muted-foreground text-sm hover:text-primary transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-heading font-semibold text-lg mb-4">Services</h4>
            <ul className="space-y-3">
              {serviceLinks.map((item) => (
                <li key={item.label}>
                  <Link to={item.to} className="text-muted-foreground text-sm hover:text-primary transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-heading font-semibold text-lg mb-4">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-muted-foreground text-sm">
                <MapPin className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                <span>Hoima Road<br />Kayunga, Wakiso Uganda</span>
              </li>
              <li>
                <a href="tel:+256772336754" className="flex items-center gap-3 text-muted-foreground text-sm hover:text-primary transition-colors">
                  <Phone className="h-4 w-4 text-primary" />
                  +256 772336754
                </a>
              </li>
              <li>
                <a href="mailto:semkatgroupuganda@gmail.com" className="flex items-center gap-3 text-muted-foreground text-sm hover:text-primary transition-colors">
                  <Mail className="h-4 w-4 text-primary" />
                  semkatgroupuganda@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-background/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-muted-foreground text-sm">
            © 2026 Semkat Group Uganda Ltd. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/privacy" className="hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-primary transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
      
    </footer>
  );
};

export default Footer;
