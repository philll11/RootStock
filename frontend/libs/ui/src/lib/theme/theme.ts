import { createTheme, MantineThemeOverride } from '@mantine/core';

const errorGlowStyles = {
  input: {
    '&[data-invalid]': {
      boxShadow: '0 0 8px 1px var(--mantine-color-red-4)',
    },
  },
};

export const theme: MantineThemeOverride = createTheme({
  components: {
    TextInput: { styles: errorGlowStyles },
    PasswordInput: { styles: errorGlowStyles },
    Select: { styles: errorGlowStyles },
    NumberInput: { styles: errorGlowStyles },
    Textarea: { styles: errorGlowStyles },
    MultiSelect: { styles: errorGlowStyles },
  },
});
