import { FormErrors } from '@mantine/form';
import { z } from 'zod';

export function zodResolver(schema: z.Schema<any>) {
  return (values: unknown): FormErrors => {
    const result = schema.safeParse(values);

    if (result.success) {
      return {};
    }

    const errors: FormErrors = {};

    result.error.issues.forEach((issue) => {
      const path = issue.path.join('.');
      if (!errors[path]) {
        errors[path] = issue.message;
      }
    });

    return errors;
  };
}
