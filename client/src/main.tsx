import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './routes/HomePage.js';
import { GamePage } from './routes/GamePage.js';
import { LobbyPage } from './routes/LobbyPage.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/game/online" element={<ErrorBoundary><GamePage /></ErrorBoundary>} />
        <Route path="/lobby" element={<LobbyPage />} />
        <Route path="/lobby/:roomId" element={<LobbyPage />} />
      </Routes>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Global unhandled error logging
window.addEventListener('error', (e) => {
  console.error('[GLOBAL] Uncaught error:', e.error?.message || e.message);
  console.error('[GLOBAL] Stack:', e.error?.stack);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[GLOBAL] Unhandled promise rejection:', e.reason?.message || e.reason);
  console.error('[GLOBAL] Stack:', e.reason?.stack);
});
