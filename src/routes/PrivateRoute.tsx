import React from 'react';
import { Navigate } from 'react-router-dom';
import { Center, Loader } from '@mantine/core';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../types/roles';
import AccessDeniedPage from '../pages/AccessDeniedPage';

// ============================================================================
// TYPES
// ============================================================================

interface PrivateRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function PrivateRoute({
  children,
  allowedRoles,
}: PrivateRouteProps): React.ReactNode {
  const { user, userData, loading } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <Center style={{ height: '100vh' }}>
        <Loader size="lg" />
      </Center>
    );
  }

  // No authenticated user, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check role-based access control — deny when userData is missing or role not allowed
  if (allowedRoles && (!userData || !allowedRoles.includes(userData.role))) {
    return <AccessDeniedPage />;
  }

  // All checks passed, render children
  return children;
}
