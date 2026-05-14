export type PropertyType = 'land' | 'residential' | 'rental' | 'commercial' | 'agricultural';

export type PropertyStatus = 'available' | 'sold' | 'under-offer' | 'rented';

export interface Property {
  id: string;
  title: string;
  type: PropertyType;
  status: PropertyStatus;
  price: number;
  currency: string;
  postedByRole?: 'agent' | 'admin';
  location: {
    region: string;
    district: string;
    address: string;
    coordinates?: { lat: number; lng: number };
  };
  size: {
    value: number;
    unit: 'acres' | 'sqft' | 'sqm' | 'hectares';
  };
  images: string[];
  illustration2D?: string; // URL for 2D floor plan/diagram
  illustration3D?: string; // URL for 3D virtual tour/panorama
  kmlUrl?: string; // URL for estate tour boundaries/paths
  description: string;
  features: string[];
  hasTitle: boolean;
  isFeatured?: boolean;
  agent?: Agent;
  createdAt: string;
  bedrooms?: number;
  bathrooms?: number;
  installmentPayment?: {
    enabled: boolean;
    depositPercentage?: number;
    numberOfInstallments?: number;
    installmentAmount?: number;
    terms?: string;
  };
}

export interface Agent {
  id: string;
  name: string;
  avatar: string;
  phone: string;
  email: string;
  rating: number;
  totalListings: number;
}

export interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  href: string;
}
