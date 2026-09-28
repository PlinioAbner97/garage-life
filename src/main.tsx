import { createRoot } from 'react-dom/client';
import App from './ui/App';
import { hydrate } from './core/store';
import './ui/styles.css';
hydrate().then(() => createRoot(document.getElementById('root')!).render(<App />));
