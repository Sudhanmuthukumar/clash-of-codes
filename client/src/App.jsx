import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import LandingPage from './pages/LandingPage';
import ParticipantLogin from './pages/ParticipantLogin';
import ParticipantRegister from './pages/ParticipantRegister';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/admin/Dashboard';
import TeamList from './pages/admin/TeamList';
import CreateTeam from './pages/admin/CreateTeam';
import AdminCodeScramble from './pages/admin/CodeScramble';
import AdminHiddenTech from './pages/admin/HiddenTech';
import Results from './pages/admin/Results';
import Settings from './pages/admin/Settings';
import ParticipantDashboard from './pages/participant/Dashboard';
import ParticipantCodeScramble from './pages/participant/CodeScramble';
import ParticipantHiddenTech from './pages/participant/HiddenTech';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <div className="min-h-screen bg-dark-950 flex flex-col font-sans">
          <Navbar />
          <main className="flex-grow flex flex-col">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<ParticipantLogin />} />
              <Route path="/register" element={<ParticipantRegister />} />
              <Route path="/admin/login" element={<AdminLogin />} />

              {/* Participant Routes */}
              <Route path="/participant/dashboard" element={<ProtectedRoute role="participant"><ParticipantDashboard /></ProtectedRoute>} />
              <Route path="/participant/code-scramble" element={<ProtectedRoute role="participant"><ParticipantCodeScramble /></ProtectedRoute>} />
              <Route path="/participant/hidden-tech" element={<ProtectedRoute role="participant"><ParticipantHiddenTech /></ProtectedRoute>} />

              {/* Admin Routes */}
              <Route path="/admin/dashboard" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/teams" element={<ProtectedRoute role="admin"><TeamList /></ProtectedRoute>} />
              <Route path="/admin/teams/create" element={<ProtectedRoute role="admin"><CreateTeam /></ProtectedRoute>} />
              <Route path="/admin/code-scramble" element={<ProtectedRoute role="admin"><AdminCodeScramble /></ProtectedRoute>} />
              <Route path="/admin/hidden-tech" element={<ProtectedRoute role="admin"><AdminHiddenTech /></ProtectedRoute>} />
              <Route path="/admin/results" element={<ProtectedRoute role="admin"><Results /></ProtectedRoute>} />
              <Route path="/admin/settings" element={<ProtectedRoute role="admin"><Settings /></ProtectedRoute>} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
