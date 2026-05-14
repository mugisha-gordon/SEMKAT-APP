import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ExternalLink, Copy, Check } from 'lucide-react';

interface FirebaseDomainInstructions {
  title: string;
  message: string;
  steps: string[];
  quickFix: string;
}

const FirebaseDomainError = () => {
  const [instructions, setInstructions] = useState<FirebaseDomainInstructions | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('firebase_domain_error');
      if (stored) {
        setInstructions(JSON.parse(stored));
      }
    } catch (e) {
      // ignore storage errors
    }
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const openFirebaseConsole = () => {
    window.open('https://console.firebase.google.com', '_blank');
  };

  if (!instructions) return null;

  return (
    <Card className="bg-orange-50 border-orange-200 p-6 mb-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-semibold text-orange-900 mb-2">{instructions.title}</h3>
          <p className="text-orange-800 mb-4">{instructions.message}</p>
          
          <div className="bg-white rounded-lg p-4 mb-4">
            <h4 className="font-medium text-gray-900 mb-3">Quick Fix Steps:</h4>
            <ol className="space-y-2 text-sm text-gray-700">
              {instructions.steps.map((step, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="font-medium text-orange-600">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={openFirebaseConsole}
              className="gap-2 bg-orange-600 hover:bg-orange-700"
            >
              <ExternalLink className="h-4 w-4" />
              Open Firebase Console
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => copyToClipboard(instructions.quickFix)}
              className="gap-2 border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Domain
                </>
              )}
            </Button>
            
            <Button 
              variant="ghost"
              onClick={() => window.location.reload()}
              className="text-orange-700 hover:bg-orange-50"
            >
              Refresh Page
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default FirebaseDomainError;
