export function getErrorMessage(error: any, defaultMessage = 'An unexpected error occurred.'): string {
  const message = 
    error?.response?.data?.message || 
    error?.message || 
    defaultMessage;
  
  return Array.isArray(message) ? message.join(', ') : message;
}
