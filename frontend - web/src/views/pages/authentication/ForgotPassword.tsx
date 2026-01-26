import { Link } from 'react-router-dom';

// material-ui
import useMediaQuery from '@mui/material/useMediaQuery';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

// project imports
import AuthWrapper1 from './AuthWrapper1';
import AuthCardWrapper from './AuthCardWrapper';
import Logo from 'ui-component/Logo';
import AuthFooter from 'ui-component/cards/AuthFooter';
import AuthForgotPassword from '../auth-forms/AuthForgotPassword';

// ===============================|| AUTH - FORGOT PASSWORD ||=============================== //

export default function ForgotPassword() {
  const downMD = useMediaQuery((theme: any) => theme.breakpoints.down('md'));

  return (
    <AuthWrapper1>
      <Grid container direction="column" justifyContent="flex-end" sx={{ minHeight: '100vh' }}>
        <Grid size={12}>
          <Grid container justifyContent="center" alignItems="center" sx={{ minHeight: 'calc(100vh - 68px)' }}>
            <Grid sx={{ m: { xs: 1, sm: 3 }, mb: 0 }}>
              <AuthCardWrapper>
                <Grid container spacing={2} alignItems="center" justifyContent="center">
                  <Grid sx={{ mb: 3 }}>
                    <Link to="#" aria-label="logo">
                      <Logo />
                    </Link>
                  </Grid>
                  <Grid size={12}>
                    <Grid container alignItems="center" justifyContent="center" textAlign="center" spacing={2}>
                      <Grid size={12}>
                        <Typography variant={downMD ? 'h3' : 'h2'} sx={{ color: 'secondary.main' }}>
                          Forgot Password?
                        </Typography>
                      </Grid>
                      <Grid size={12}>
                        <Typography variant="caption" fontSize="16px" textAlign="center">
                          Enter your email address below and we&apos;ll send you password reset instructions.
                        </Typography>
                      </Grid>
                    </Grid>
                  </Grid>
                  <Grid size={12}>
                    <AuthForgotPassword />
                  </Grid>
                  <Grid size={12}>
                    <Divider />
                  </Grid>
                  <Grid size={12}>
                    <Grid container direction="column" alignItems="center" size={12}>
                      <Typography component={Link} to="/pages/login" variant="subtitle1" sx={{ textDecoration: 'none' }}>
                        Back to Login
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>
              </AuthCardWrapper>
            </Grid>
          </Grid>
        </Grid>
        <Grid size={12} sx={{ m: 3, mt: 1 }}>
          <AuthFooter />
        </Grid>
      </Grid>
    </AuthWrapper1>
  );
}

// Helper to avoid cluttering component with imports
import Divider from '@mui/material/Divider';
