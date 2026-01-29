// material-ui
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';

// project imports
import LogoSection from '../LogoSection';
import SearchSection from './SearchSection';
import ProfileSection from './ProfileSection';
import NotificationSection from './NotificationSection';
import ThemeModeSection from './ThemeModeSection';

import { useMenu } from 'contexts/MenuContext';

// assets
import { IconMenu2 } from '@tabler/icons-react';

// ==============================|| MAIN NAVBAR / HEADER ||============================== //

export default function Header() {
  const theme = useTheme();
  const downMD = useMediaQuery(theme.breakpoints.down('md'));

  const { isDashboardDrawerOpened, toggleDashboardDrawer } = useMenu();
  const drawerOpen = isDashboardDrawerOpened;

  return (
    <>
      {/* logo & toggler button */}
      <Box sx={{ width: downMD ? 'auto' : 228, display: 'flex' }}>
        <Box component="span" sx={{ display: { xs: 'none', md: 'block' }, flexGrow: 1 }}>
          <LogoSection />
        </Box>
        <Avatar
          variant="rounded"
          sx={{
            ...theme.typography.commonAvatar,
            ...theme.typography.mediumAvatar,
            overflow: 'hidden',
            transition: 'all .2s ease-in-out',
            color: (theme.vars || theme).palette.secondary.dark,
            background: (theme.vars || theme).palette.secondary.light,
            '&:hover': {
              color: (theme.vars || theme).palette.secondary.light,
              background: (theme.vars || theme).palette.secondary.dark
            }
          }}
          onClick={toggleDashboardDrawer}
        >
          <IconMenu2 stroke={1.5} size="20px" />
        </Avatar>
      </Box>

      {/* header search */}
      <SearchSection />
      <Box sx={{ flexGrow: 1 }} />
      <Box sx={{ flexGrow: 1 }} />

      {/* theme mode */}
      <ThemeModeSection />

      {/* notification */}
      <NotificationSection />

      {/* profile */}
      <ProfileSection />
    </>
  );
}
