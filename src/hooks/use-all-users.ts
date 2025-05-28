
"use client";

// This hook is no longer used as the admin user role management feature
// that listed all users has been simplified.
// This file can be deleted.

export function useAllUsers_DEPRECATED() {
  return { allUsers: [], loading: false, error: null };
}
