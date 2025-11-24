import { Route, Routes, Link } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@mantine/core/styles.css';
import { LoginPage } from './pages/login-page';

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <Routes>
          <Route
            path="/"
            element={
              <div>
                <h1>Welcome to RootStock</h1>
                <Link to="/login">Go to Login</Link>
              </div>
            }
          />
          <Route
            path="/login"
            element={<LoginPage />}
          />
        </Routes>
      </MantineProvider>
    </QueryClientProvider>
  );
}

export default App;
