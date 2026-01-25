import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';

// material-ui
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import Alert from '@mui/material/Alert';

// project imports
import AnimateButton from 'ui-component/extended/AnimateButton';
import { forgotPassword } from 'api/iam/auth';
import { forgotPasswordSchema, ForgotPasswordRequest } from 'types/iam/auth.schema';

// ============================|| AUTH - FORGOT PASSWORD ||============================ //

export default function AuthForgotPassword() {
  const navigate = useNavigate();
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<ForgotPasswordRequest>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: ''
    }
  });

  const onSubmit = async (data: ForgotPasswordRequest) => {
    try {
      setSendError(null);
      await forgotPassword(data.email);
      setSent(true);
    } catch (err: any) {
      console.error(err);
      setSendError(err.response?.data?.message || 'Failed to send reset email.');
    }
  };

  if (sent) {
    return (
        <Box sx={{ mt: 3 }}>
            <Alert severity="success" sx={{ mb: 3 }}>
                Check your email for a reset link.
            </Alert>
             <AnimateButton>
                <Button
                  disableElevation
                  fullWidth
                  size="large"
                  type="button"
                  variant="outlined"
                  color="secondary"
                  onClick={() => navigate('/pages/login')}
                >
                  Back to Login
                </Button>
              </AnimateButton>
        </Box>
    );
  }

  return (
    <>
      <Grid container direction="column" justifyContent="center" spacing={2}>
        <Grid size={12}>
          <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)}>
            {sendError && (
              <Box sx={{ mb: 3 }}>
                <Alert severity="error">{sendError}</Alert>
              </Box>
            )}

            <FormControl fullWidth error={Boolean(errors.email)} sx={{ mb: 3 }}>
              <InputLabel htmlFor="outlined-adornment-email-forgot">Email Address</InputLabel>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <OutlinedInput
                    {...field}
                    id="outlined-adornment-email-forgot"
                    type="email"
                    label="Email Address"
                  />
                )}
              />
              {errors.email && (
                <FormHelperText error id="standard-weight-helper-text-email-forgot">
                  {errors.email.message}
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
                  Send Reset Link
                </Button>
              </AnimateButton>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </>
  );
}
