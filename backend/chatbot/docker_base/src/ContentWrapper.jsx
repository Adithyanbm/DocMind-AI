import React, { Suspense, lazy } from 'react';
import * as Lucide from 'lucide-react';
import * as Recharts from 'recharts';

// Expose these to the global window for the dynamic component if needed
window.React = React;
window.Lucide = Lucide;
window.Recharts = Recharts;

// Lazy load the user's code from the mounted volume
const UserComponent = lazy(() => import('./content/App.jsx').then(module => {
  // Try to find the component in the module exports
  if (module.default) return { default: module.default };
  if (module.App) return { default: module.App };
  if (module.Component) return { default: module.Component };
  
  // Try to find any capitalized export as a fallback
  const firstExport = Object.keys(module).find(key => /^[A-Z]/.test(key));
  if (firstExport) return { default: module[firstExport] };
  
  throw new Error("No exported component found. Please export your component as 'default', 'App', or 'Component'.");
}));

const ContentWrapper = () => {
  return (
    <div className="preview-container w-full h-full min-h-screen p-6">
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-slate-500 text-sm font-medium">Initialising preview...</div>}>
        <UserComponent />
      </Suspense>
    </div>
  );
};

export default ContentWrapper;
