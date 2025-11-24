import { useMutation } from '@tanstack/react-query';
import { AuthService } from './auth.service';
import { LoginCredentials, AuthResponse } from './auth.schema';

export const useLogin = () => {
  return useMutation<AuthResponse, Error, LoginCredentials>({
    mutationFn: (credentials) => AuthService.login(credentials),
    onSuccess: (data) => {
      // TODO: Store token
      console.log('Login successful', data);
    },
  });
};
