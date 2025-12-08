import { useMutation } from '@tanstack/react-query';
import { AuthService } from './auth.service';
import { LoginCredentials, AuthResponse } from './auth.schema';
import { setToken } from './auth.store';

export const useLogin = () => {
  return useMutation<AuthResponse, Error, LoginCredentials>({
    mutationFn: (credentials) => AuthService.login(credentials),
    onSuccess: async (data) => {
      await setToken(data.accessToken);
      console.log('Login successful', data);
    },
  });
};
