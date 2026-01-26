import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';

// material-ui
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import Alert from '@mui/material/Alert';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';

// project imports
import AnimateButton from 'ui-component/extended/AnimateButton';
import { resetPassword } from 'api/iam/auth';
import { resetPasswordSchema } from 'types/iam/auth.schema';

// assets
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

// ============================|| AUTH - RESET PASSWORD ||============================ //

export default function AuthResetPassword() {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const [resetError, setResetError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // const token = searchParams.get('token');

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<{ password: string; confirmPassword: string }>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: ''
    }
  });

  const onSubmit = async (data: { password: string; confirmPassword: string }) => {
    if (!token) {
      setResetError('Invalid or missing reset token.');
      return;
    }

    try {
      setResetError(null);
      await resetPassword({
        token,
        password: data.password,
        confirmPassword: data.confirmPassword
      });
      navigate('/pages/login', { replace: true, state: { message: 'Password reset successful. Please login.' } });
    } catch (err: any) {
      console.error(err);
      setResetError(err.response?.data?.message || 'Failed to reset password.');
    }
  };

  const handleClickShowPassword = () => setShowPassword(!showPassword);
  const handleClickShowConfirmPassword = () => setShowConfirmPassword(!showConfirmPassword);
  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => event.preventDefault();

  if (!token) {
    return (
      <Box sx={{ mt: 3 }}>
        <Alert severity="error">Missing reset token in URL.</Alert>
      </Box>
    );
  }

  return (
    <>
      <Grid container direction="column" justifyContent="center" spacing={2}>
        <Grid size={12}>
          <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)}>
            {resetError && (
              <Box sx={{ mb: 3 }}>
                <Alert severity="error">{resetError}</Alert>
              </Box>
            )}

            <FormControl fullWidth error={Boolean(errors.password)} sx={{ mb: 3 }}>
              <InputLabel htmlFor="outlined-adornment-password-reset">New Password</InputLabel>
              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <OutlinedInput
                    {...field}
                    id="outlined-adornment-password-reset"
                    type={showPassword ? 'text' : 'password'}
                    label="New Password"
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
                  />
                )}
              />
              {errors.password && (
                <FormHelperText error id="standard-weight-helper-text-password-reset">
                  {errors.password.message}
                </FormHelperText>
              )}
            </FormControl>

            <FormControl fullWidth error={Boolean(errors.confirmPassword)} sx={{ mb: 3 }}>
              <InputLabel htmlFor="outlined-adornment-confirm-password-reset">Confirm Password</InputLabel>
              <Controller
                name="confirmPassword"
                control={control}
                render={({ field }) => (
                  <OutlinedInput
                    {...field}
                    id="outlined-adornment-confirm-password-reset"
                    type={showConfirmPassword ? 'text' : 'password'}
                    label="Confirm Password"
                    endAdornment={
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={handleClickShowConfirmPassword}
                          onMouseDown={handleMouseDownPassword}
                          edge="end"
                          size="large"
                        >
                          {showConfirmPassword ? <Visibility /> : <VisibilityOff />}
                        </IconButton>
                      </InputAdornment>
                    }
                  />
                )}
              />
              {errors.confirmPassword && (
                <FormHelperText error id="standard-weight-helper-text-confirm-password-reset">
                  {errors.confirmPassword.message}
                </FormHelperText>
              )}
            </FormControl>

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
                  Reset Password
                </Button>
              </AnimateButton>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </>
  );
}
