import { auth } from '$lib/auth/store';

export const load = async () => {
  await auth.initialize();

  return {
    isAuthenticated: false,
  };
};
