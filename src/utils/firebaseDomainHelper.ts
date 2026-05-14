/**
 * Firebase Domain Helper
 * Utility functions to handle Firebase domain authorization issues
 */

export const getCurrentDomain = () => {
  return window.location.hostname + (window.location.port ? ':' + window.location.port : '');
};

export const isDevelopmentDomain = (domain: string) => {
  return domain.includes('localhost') || 
         domain.includes('127.0.0.1') || 
         domain.includes('0.0.0.0') ||
         domain.includes('192.168.') ||
         domain.includes('10.') ||
         domain.includes('172.');
};

export const getCommonDevelopmentDomains = () => {
  const hostname = window.location.hostname;
  const port = window.location.port;
  
  return [
    `${hostname}:${port || '3000'}`,
    `${hostname}:${port || '8080'}`,
    `${hostname}:${port || '8081'}`,
    `${hostname}:${port || '5173'}`,
    `${hostname}:${port || '4173'}`,
    `${hostname}:${port || '3001'}`,
    `${hostname}:${port || '8000'}`,
    `${hostname}:${port || '9000'}`,
    hostname, // without port
  ];
};

export const getFirebaseDomainInstructions = (currentDomain: string) => {
  const isDev = isDevelopmentDomain(currentDomain);
  const commonDomains = getCommonDevelopmentDomains();
  
  if (isDev) {
    return {
      title: "Development Domain Authorization Required",
      message: `This development domain needs to be added to Firebase Authentication settings.`,
      steps: [
        "1. Go to Firebase Console: https://console.firebase.google.com",
        "2. Select your project",
        "3. Go to Authentication > Settings",
        "4. Scroll down to 'Authorized domains'",
        "5. Click 'Add domain'",
        `6. Add: ${currentDomain}`,
        "7. Also consider adding these common development domains:",
        ...commonDomains.map(domain => `   - ${domain}`),
        "8. Click 'Save'",
        "9. Refresh this page and try again"
      ],
      quickFix: `Add "${currentDomain}" to Firebase Authorized domains`
    };
  } else {
    return {
      title: "Domain Not Authorized",
      message: `This domain is not authorized for Firebase Authentication.`,
      steps: [
        "1. Contact your system administrator",
        "2. Provide them with this domain name",
        "3. Ask them to add it to Firebase Authentication settings",
        "4. Once added, refresh this page and try again"
      ],
      quickFix: `Contact admin to authorize "${currentDomain}" in Firebase`
    };
  }
};

export const handleUnauthorizedDomainError = (error: any) => {
  const currentDomain = getCurrentDomain();
  const instructions = getFirebaseDomainInstructions(currentDomain);
  
  console.error('Firebase unauthorized domain error:', {
    domain: currentDomain,
    error: error?.message || error,
    isDevelopment: isDevelopmentDomain(currentDomain)
  });
  
  return instructions;
};
