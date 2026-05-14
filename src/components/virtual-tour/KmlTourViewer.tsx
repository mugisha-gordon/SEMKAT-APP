import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { ref, getBlob } from 'firebase/storage';
import { storage } from '@/integrations/firebase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ZoomIn, ZoomOut, LocateFixed } from 'lucide-react';
import { cn } from '@/lib/utils';

type LatLng = { lat: number; lng: number };

/** Matches Firebase Storage download URLs - use SDK getBlob to bypass CORS */
const FIREBASE_STORAGE_URL = /^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[^/]+\/o\/[^?]+\?alt=media/;

function parseKmlCoordinates(raw: string): LatLng[] {
  return raw
    .trim()
    .split(/\s+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [lngStr, latStr] = chunk.split(',');
      const lat = Number(latStr);
      const lng = Number(lngStr);
      return { lat, lng };
    })
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
}

function extractKmlPaths(kmlText: string): LatLng[][] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(kmlText, 'text/xml');

  const coordsNodes = Array.from(doc.getElementsByTagName('coordinates'));
  const paths: LatLng[][] = [];

  for (const node of coordsNodes) {
    const txt = node.textContent || '';
    const pts = parseKmlCoordinates(txt);
    if (pts.length > 0) paths.push(pts);
  }

  return paths;
}

function boundsFromPaths(paths: LatLng[][]): L.LatLngBoundsExpression | null {
  if (paths.length === 0) return null;
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const path of paths) {
    for (const p of path) {
      minLat = Math.min(minLat, p.lat);
      maxLat = Math.max(maxLat, p.lat);
      minLng = Math.min(minLng, p.lng);
      maxLng = Math.max(maxLng, p.lng);
    }
  }
  return [[minLat, minLng], [maxLat, maxLng]] as L.LatLngBoundsExpression;
}

function toLeafletLatLng(p: LatLng): L.LatLngTuple {
  return [p.lat, p.lng];
}

interface KmlTourViewerProps {
  kmlUrl: string;
  compact?: boolean;
}

const KmlTourViewer = ({ kmlUrl, compact }: KmlTourViewerProps) => {
  const normalizedUrl = (kmlUrl || '').trim();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.Layer[]>([]);

  const [kmlText, setKmlText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch KML - use Firebase Storage SDK for Storage URLs (bypasses CORS)
  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      setKmlText(null);
      try {
        let txt: string;
        if (FIREBASE_STORAGE_URL.test(normalizedUrl)) {
          const storageRef = ref(storage, normalizedUrl);
          const blob = await getBlob(storageRef);
          txt = await blob.text();
        } else {
          const res = await fetch(normalizedUrl);
          if (!res.ok) throw new Error(`Failed to load KML (${res.status})`);
          txt = await res.text();
        }
        if (!mounted) return;
        setKmlText(txt);
      } catch (e: unknown) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : 'Failed to load KML');
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    if (normalizedUrl) run();
    return () => { mounted = false; };
  }, [normalizedUrl]);

  const paths = useMemo(() => {
    if (!kmlText) return [];
    return extractKmlPaths(kmlText);
  }, [kmlText]);

  const bounds = useMemo(() => boundsFromPaths(paths), [paths]);

  // Initialize map and draw boundaries when paths are ready
  useEffect(() => {
    if (!mapRef.current || !paths.length || !bounds) return;

    // Clear previous layers
    layersRef.current.forEach((l) => l.remove());
    layersRef.current = [];

    const map = L.map(mapRef.current, {
      scrollWheelZoom: true,
      doubleClickZoom: true,
    }).fitBounds(bounds, { padding: [24, 24], maxZoom: 18 });

    // OpenStreetMap tiles as background
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Draw KML boundaries on top of map
    const orangeStroke = 'hsl(24, 95%, 53%)';
    const skyStroke = 'hsl(199, 89%, 48%)';

    paths.forEach((path) => {
      const latlngs = path.map(toLeafletLatLng);
      const first = path[0];
      const last = path[path.length - 1];
      const isClosed = first && last &&
        Math.abs(first.lat - last.lat) < 1e-6 &&
        Math.abs(first.lng - last.lng) < 1e-6;

      if (isClosed) {
        const poly = L.polygon(latlngs, {
          fillColor: skyStroke,
          fillOpacity: 0.25,
          color: skyStroke,
          weight: 2,
        });
        poly.addTo(map);
        layersRef.current.push(poly);
      } else {
        const line = L.polyline(latlngs, {
          color: orangeStroke,
          weight: 3,
        });
        line.addTo(map);
        layersRef.current.push(line);
      }
    });

    mapInstanceRef.current = map;
    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [paths, bounds]);

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleFitBounds = () => bounds && mapInstanceRef.current?.fitBounds(bounds, { padding: [24, 24] });

  return (
    <div className={compact ? "h-full flex flex-col" : "space-y-4"}>
      {!compact && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="font-semibold">Estate Tour</div>
            <div className="text-sm text-muted-foreground">Property boundaries on map</div>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="icon" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" onClick={handleFitBounds}>
              <LocateFixed className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Card className={cn("overflow-hidden border flex-1 min-h-0 relative", compact && "border-0 shadow-none")}>
        <div className={cn("bg-muted flex items-center justify-center relative", compact ? "h-full min-h-[180px]" : "h-[420px]")}>
          {compact && (
            <div className="absolute top-2 right-2 flex items-center gap-1 z-[1000]">
              <Button type="button" variant="outline" size="icon" className="h-7 w-7 bg-background/90" onClick={handleZoomOut}>
                <ZoomOut className="h-3 w-3" />
              </Button>
              <Button type="button" variant="outline" size="icon" className="h-7 w-7 bg-background/90" onClick={handleZoomIn}>
                <ZoomIn className="h-3 w-3" />
              </Button>
            </div>
          )}
          {!normalizedUrl ? (
            <div className="text-muted-foreground">No tour attached.</div>
          ) : loading ? (
            <div className="text-muted-foreground">Loading map...</div>
          ) : error ? (
            <div className="text-destructive text-center px-4">{error}</div>
          ) : !paths.length ? (
            <div className="text-muted-foreground">No boundary data in this KML.</div>
          ) : (
            <div ref={mapRef} className="w-full h-full z-0" />
          )}
        </div>
      </Card>

      {!compact && (
        <div className="text-xs text-muted-foreground">
          Boundaries shown on OpenStreetMap. Drag to pan, scroll to zoom.
        </div>
      )}
    </div>
  );
};

export default KmlTourViewer;
