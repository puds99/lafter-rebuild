import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { MainLayout } from './components/layout/MainLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { SessionPage } from './pages/SessionPage';
import { SettingsPage } from './pages/SettingsPage';

import { useEffect } from 'react';
import { AutoCurator } from './services/curation/AutoCurator';

function App() {
  // Run Auto-Curation on startup
  useEffect(() => {
    AutoCurator.getInstance().runAutoCuration()
      .then(count => {
        if (count > 0) console.log(`✨ Auto-approved ${count} new laughs!`);
      })
      .catch(err => console.error('Auto-curation failed:', err));
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <SettingsProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="session" element={<SessionPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Routes>
          </SettingsProvider>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
