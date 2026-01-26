import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// material-ui
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import Alert from '@mui/material/Alert';

// project imports
import AnimateButton from 'ui-component/extended/AnimateButton';
import { useAuth } from 'contexts/AuthContext';
import { loginSchema, LoginCredentials } from 'types/iam/auth.schema';

// assets
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

// ===============================|| JWT - LOGIN ||=============================== //

export default function AuthLogin() {
  const { login } = useAuth();
  const [checked, setChecked] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: ''
    }
  });

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const onSubmit = async (data: LoginCredentials) => {
    try {
      setLoginError(null);
      await login(data);
      // Navigation is handled by GuestGuard which listens to isAuthenticated state
    } catch (err: any) {
      console.error(err);
      setLoginError(err.response?.data?.message || 'Failed to login. Please check your credentials.');
    }
  };

  return (
    <>
      <Grid container direction="column" justifyContent="center" spacing={2}>
        <Grid size={12}>
          <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)}>
            {loginError && (
              <Box sx={{ mb: 3 }}>
                <Alert severity="error">{loginError}</Alert>
              </Box>
            )}

            <FormControl fullWidth error={Boolean(errors.username)} sx={{ mb: 3 }}>
              <InputLabel htmlFor="outlined-adornment-email-login">Username</InputLabel>
              <Controller
                name="username"
                control={control}
                render={({ field }) => (
                  <OutlinedInput
                    {...field}
                    id="outlined-adornment-email-login"
                    type="text"
                    label="Username"
                  />
                )}
              />
              {errors.username && (
                <FormHelperText error id="standard-weight-helper-text-email-login">
                  {errors.username.message}
                </FormHelperText>
              )}
            </FormControl>

            <FormControl fullWidth error={Boolean(errors.password)} sx={{ mb: 3 }}>
              <InputLabel htmlFor="outlined-adornment-password-login">Password</InputLabel>
              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <OutlinedInput
                    {...field}
                    id="outlined-adornment-password-login"
                    type={showPassword ? 'text' : 'password'}
                    endAdornment={
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={handleClickShowPassword}
                          onMouseDown={handleMouseDownPassword}
                          edge="end"
                          size="large"
                        >
                          {showPassword ? <Visibility /> : <VisibilityOff />}
                        </IconButton>
                      </InputAdornment>
                    }
                    label="Password"
                  />
                )}
              />
              {errors.password && (
                <FormHelperText error id="standard-weight-helper-text-password-login">
                  {errors.password.message}
                </FormHelperText>
              )}
            </FormControl>

            <Grid container sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Grid>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={checked}
                      onChange={(event) => setChecked(event.target.checked)}
                      name="checked"
                      color="primary"
                    />
                  }
                  label="Keep me logged in"
                />
              </Grid>
              <Grid>
                <Typography
                  variant="subtitle1"
                  component={Link}
                  to="/pages/forgot-password"
                  sx={{ textDecoration: 'none', color: 'secondary.main' }}
                >
                  Forgot Password?
                </Typography>
              </Grid>
            </Grid>

            <Box sx={{ mt: 2 }}>
              <AnimateButton>
                <Button
                  disableElevation
                  disabled={isSubmitting}
                  fullWidth
                  size="large"
                  type="submit"
                  variant="contained"
                  color="secondary"
                >
                  Sign In
                </Button>
              </AnimateButton>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </>
  );
}
