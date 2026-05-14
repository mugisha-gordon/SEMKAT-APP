import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import PropertyCard from "@/components/property/PropertyCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Sparkles, LogIn } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { subscribeToFavoriteProperties, type FavoritePropertyDocument, removeFavoriteProperty } from "@/integrations/firebase/favorites";

const Favorites = () => {
  const { user, loading } = useAuth();

  const [favoriteDocs, setFavoriteDocs] = useState<FavoritePropertyDocument[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!user) {
      setFavoriteDocs([]);
      setFavoritesLoading(false);
      setError(null);
      return;
    }

    setFavoritesLoading(true);
    setError(null);
    const unsub = subscribeToFavoriteProperties(
      user.uid,
      (items) => {
        setFavoriteDocs(items);
        setFavoritesLoading(false);
      },
      undefined,
      (err) => {
        setFavoritesLoading(false);
        setError(err?.message || "Failed to load favorites");
      }
    );

    return () => {
      unsub();
    };
  }, [user, refreshKey]);

  const favoriteProperties = useMemo(() => favoriteDocs.map((d) => d.property), [favoriteDocs]);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 pb-12">
        <section className="relative overflow-hidden py-10 sm:py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--semkat-orange)/0.18),transparent_35%),radial-gradient(circle_at_80%_10%,hsl(var(--semkat-sky)/0.2),transparent_35%)]" />
          <div className="container relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-semkat-orange-light backdrop-blur flex items-center justify-center border border-semkat-orange/20">
                <Heart className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Your saved properties</p>
                <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">Favorites</h1>
              </div>
            </div>
            {user && (
              <Button
                type="button"
                variant="outline"
                onClick={handleRefresh}
                disabled={favoritesLoading}
                className="self-start sm:self-auto"
              >
                Refresh
              </Button>
            )}
          </div>
        </section>

        <section className="container pb-10 space-y-6">
          {/* Show login prompt if not authenticated */}
          {!loading && !user ? (
            <Card className="bg-card border p-10 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-semkat-orange-light">
                <LogIn className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-heading text-2xl font-semibold text-foreground">Sign in to view favorites</h3>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Create an account or sign in to save properties and access them from any device.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <Button variant="hero" asChild>
                  <Link to="/auth">Sign In</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/properties">Browse Properties</Link>
                </Button>
              </div>
            </Card>
          ) : favoritesLoading ? (
            <Card className="bg-card border p-10 text-center space-y-4">
              <div className="mx-auto w-12 h-12 border-4 border-semkat-orange border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground">Loading favorites...</p>
            </Card>
          ) : error ? (
            <Card className="bg-card border p-10 text-center space-y-4">
              <p className="text-muted-foreground mb-2">{error}</p>
              <Button variant="hero" onClick={handleRefresh}>
                Try again
              </Button>
            </Card>
          ) : favoriteProperties.length > 0 ? (
            <>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {favoriteProperties.map((property, index) => (
                  <div
                    key={property.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <PropertyCard
                      property={property}
                      isFavorite
                      onToggleFavorite={async () => {
                        if (!user) return;
                        try {
                          await removeFavoriteProperty(user.uid, property.id);
                        } catch (err) {
                          console.error("Failed to remove favorite", err);
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
              <Card className="bg-card border p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-heading text-xl font-semibold text-foreground">Get alerts when similar properties appear</h3>
                  <p className="text-muted-foreground text-sm">Save a search to receive instant notifications.</p>
                </div>
                <Button variant="hero" className="sm:shrink-0">Create saved search</Button>
              </Card>
            </>
          ) : (
            <Card className="bg-card border p-10 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-semkat-sky-light">
                <Sparkles className="h-8 w-8 text-secondary" />
              </div>
              <h3 className="font-heading text-2xl font-semibold text-foreground">No favorites yet</h3>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Tap the heart icon on any property to keep it here.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <Button variant="hero" asChild>
                  <Link to="/properties">Browse properties</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/properties?type=rental">Explore rentals</Link>
                </Button>
              </div>
            </Card>
          )}
        </section>
      </main>
    </div>
  );
};

export default Favorites;

