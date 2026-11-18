import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import React, { Suspense, lazy } from 'react';

import AuthProvider from '@/context/AuthContext';
import { ChatProvider } from '@/context/ChatContext';
import { ConfirmationProvider } from '@/context/ConfirmationContext';
import PrivateRoute from '@/routes/PrivateRoute';
import PublicRoute from '@/routes/PublicRoute';
import AdminRoute from '@/routes/AdminRoute';
import Loader from '@/components/Loader';
import { GuideRuntimeProvider } from '@/lib/guide-runtime/GuideRuntimeProvider';
import { WorkspaceProvider } from '@/features/workspaces';

const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const AdminPage = lazy(() => import('@/features/admin/AdminPage').then((m) => ({ default: m.AdminPage })));
const AdminLoginPage = lazy(() => import('@/features/admin/AdminLoginPage').then((m) => ({ default: m.AdminLoginPage })));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));
const LandingPage = lazy(() => import('@/pages/LandingPage'));
const GuidePage = lazy(() => import('@/pages/GuidePage'));
const AcceptInvitationPage = lazy(() => import('@/pages/AcceptInvitationPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

import { LoadingProvider } from '@/context/LoadingContext';
import GlobalLoadingSpinner from '@/components/GlobalLoadingSpinner';
import { SessionBlockedNotice } from '@/components/SessionBlockedNotice';
import { ToastProvider } from '@/context/ToastContext';
import { TooltipLayer } from '@/components/ui';

function App(): JSX.Element {
  return (
    <ToastProvider>
      <LoadingProvider>
        <AuthProvider>
          <WorkspaceProvider>
            <ChatProvider>
            <ConfirmationProvider>
              <BrowserRouter>
                <GuideRuntimeProvider>
                  <Suspense fallback={<Loader center />}>
                  <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/guide" element={<GuidePage />} />
                    <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
                    <Route
                      path="/login"
                      element={
                        <PublicRoute redirectTo="/dashboard">
                          <LoginPage />
                        </PublicRoute>
                      }
                    />
                    <Route
                      path="/register"
                      element={
                        <PublicRoute redirectTo="/dashboard">
                          <RegisterPage />
                        </PublicRoute>
                      }
                    />
                    <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                    <Route path="/intelligence" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                    {/* The names people type from the menu labels. */}
                    <Route path="/prompt-library" element={<Navigate replace to="/prompts" />} />
                    <Route path="/prompt-playground" element={<Navigate replace to="/playground" />} />
                    <Route path="/agent-governance" element={<Navigate replace to="/agents" />} />
                    <Route path="/prompts" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                    <Route path="/playground" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                    <Route path="/event-tracking" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                    <Route path="/activity" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                    <Route path="/telemetry" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                    <Route path="/admin/login" element={<AdminLoginPage />} />
                    <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
                    <Route path="/admin/:section" element={<AdminRoute><AdminPage /></AdminRoute>} />
                    <Route path="/insights" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                    <Route path="/ai-governance" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                    <Route path="/ai-governance/:tab" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                    <Route path="/ai-governance/use-cases/:useCaseId" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                    <Route path="/insights/:tab" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                    <Route path="/telemetry/:tab" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                    <Route path="/engagement" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                    <Route path="/sdk-integrations" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                    <Route path="/sdk-integrations/:integrationId" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                    <Route path="/sdk-integrations/:integrationId/:tab" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                    <Route path="/sdk-docs" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                    <Route path="/settings" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                    <Route path="/agents" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                    <Route path="/agents/:tab" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                    <Route path="/projects" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                    <Route path="/projects/:projectId" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                    <Route path="/projects/:projectId/epics/:epicId" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </Suspense>
                </GuideRuntimeProvider>
              </BrowserRouter>
              <GlobalLoadingSpinner />
              <SessionBlockedNotice />
              <TooltipLayer />
            </ConfirmationProvider>
          </ChatProvider>
          </WorkspaceProvider>
        </AuthProvider>
      </LoadingProvider>
    </ToastProvider>
  );
}

export default App;
