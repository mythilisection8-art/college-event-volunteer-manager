import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

// Layouts
import { MainLayout } from './components/layout/MainLayout';
import { DashboardLayout } from './components/layout/DashboardLayout';

// Guards
import { ProtectedRoute } from './components/routing/ProtectedRoute';
import { RoleRoute } from './components/routing/RoleRoute';

// Public Pages
import { HomePage } from './pages/public/HomePage';
import { EventsListPage } from './pages/public/EventsListPage';
import { EventDetailsPage } from './pages/public/EventDetailsPage';
import { LoginPage } from './pages/public/LoginPage';
import { RegisterPage } from './pages/public/RegisterPage';
import { UnauthorizedPage } from './pages/public/UnauthorizedPage';
import { NotFoundPage } from './pages/public/NotFoundPage';
import { PublicPassVerificationPage } from './pages/public/PublicPassVerificationPage';

// Student Pages
import { StudentDashboard } from './pages/student/StudentDashboard';
import { MyRegistrationsPage } from './pages/student/MyRegistrationsPage';
import { ProfilePage } from './pages/student/ProfilePage';

// Organizer Pages
import { OrganizerDashboard } from './pages/organizer/OrganizerDashboard';
import { ManageEventsPage } from './pages/organizer/ManageEventsPage';
import { EventVolunteersPage } from './pages/organizer/EventVolunteersPage';
import { EventAttendeesPage } from './pages/organizer/EventAttendeesPage';
import { QRScannerPage } from './pages/organizer/QRScannerPage';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { UserManagementPage } from './pages/admin/UserManagementPage';
import { EventManagementPage } from './pages/admin/EventManagementPage';
import { CreateEditEventPage } from './pages/admin/CreateEditEventPage';
import { RegistrationManagementPage } from './pages/admin/RegistrationManagementPage';
import { SystemStatsPage } from './pages/admin/SystemStatsPage';

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* Public Layout Routes */}
            <Route element={<MainLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/events" element={<EventsListPage />} />
              <Route path="/events/:id" element={<EventDetailsPage />} />
              <Route path="/verify-pass" element={<PublicPassVerificationPage />} />
              <Route path="/verify/:type/:id" element={<PublicPassVerificationPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />
              <Route path="/404" element={<NotFoundPage />} />
            </Route>

            {/* Student Protected Routes */}
            <Route
              path="/student"
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['student', 'organizer', 'admin']}>
                    <DashboardLayout />
                  </RoleRoute>
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<StudentDashboard />} />
              <Route path="registrations" element={<MyRegistrationsPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            {/* Organizer Protected Routes */}
            <Route
              path="/organizer"
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['organizer', 'admin']}>
                    <DashboardLayout />
                  </RoleRoute>
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<OrganizerDashboard />} />
              <Route path="scan" element={<QRScannerPage />} />
              <Route path="events" element={<ManageEventsPage />} />
              <Route path="events/:id/volunteers" element={<EventVolunteersPage />} />
              <Route path="events/:id/attendees" element={<EventAttendeesPage />} />
            </Route>

            {/* Admin Protected Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['admin']}>
                    <DashboardLayout />
                  </RoleRoute>
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="scan" element={<QRScannerPage />} />
              <Route path="users" element={<UserManagementPage />} />
              <Route path="events" element={<EventManagementPage />} />
              <Route path="events/create" element={<CreateEditEventPage />} />
              <Route path="events/edit/:id" element={<CreateEditEventPage />} />
              <Route path="registrations" element={<RegistrationManagementPage />} />
              <Route path="stats" element={<SystemStatsPage />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
