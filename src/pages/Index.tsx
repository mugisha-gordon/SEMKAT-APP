import Header from '@/components/layout/Header';
import HeroSection from '@/components/home/HeroSection';
import CategorySection from '@/components/home/CategorySection';
import FeaturedProperties from '@/components/home/FeaturedProperties';
import AgentsSection from '@/components/home/AgentsSection';
import CTASection from '@/components/home/CTASection';


const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <CategorySection />
        <FeaturedProperties />
        <AgentsSection />
        <CTASection />
      </main>
    </div>
  );
};

export default Index;
