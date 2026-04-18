import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { addCollection } from '@iconify/react';
import solarIcons from '@iconify-json/solar/icons.json';
import App from './App.tsx';
import './index.css';

// Pre-register Solar icon set offline — avoids CSP/CDN dependency
addCollection(solarIcons as any);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
