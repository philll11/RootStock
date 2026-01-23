import { useRef, useState, useEffect } from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import Transitions from 'ui-component/extended/Transitions';
import useConfig from 'hooks/useConfig';
import { ThemeMode } from 'config';

// assets
import { IconMoon, IconSun, IconDeviceDesktop } from '@tabler/icons-react';

// ==============================|| THEME MODE TOGGLE ||============================== //

export default function ThemeModeSection() {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<any>(null);
  const {
    state: { mode },
    setField
  } = useConfig();

  const handleToggle = () => {
    setOpen((prev) => !prev);
  };

  const handleClose = (event: Event | React.SyntheticEvent) => {
    if (anchorRef.current && anchorRef.current.contains(event.target)) {
      return;
    }
    setOpen(false);
  };

  const handleModeChange = (newMode: ThemeMode) => {
    setField('mode', newMode);
    setOpen(false);
  };

  const prevOpen = useRef(open);
  useEffect(() => {
    if (prevOpen.current === true && open === false) {
      anchorRef.current.focus();
    }
    prevOpen.current = open;
  }, [open]);

  // Dynamic Icon based on current mode
  const ModeIcon = () => {
    if (mode === 'dark') return <IconMoon stroke={1.5} size="20px" />;
    if (mode === 'light') return <IconSun stroke={1.5} size="20px" />;
    return <IconDeviceDesktop stroke={1.5} size="20px" />;
  };

  return (
    <>
      <Box
        sx={{
          ml: 2,
          mr: 3,
          [theme.breakpoints.down('md')]: {
            mr: 2
          }
        }}
      >
        <Avatar
          variant="rounded"
          sx={{
            ...theme.typography.commonAvatar,
            ...theme.typography.mediumAvatar,
            transition: 'all .2s ease-in-out',
            background: theme.palette.mode === 'dark' ? theme.palette.dark[800] : theme.palette.secondary.light,
            color: theme.palette.mode === 'dark' ? theme.palette.warning.main : theme.palette.secondary.dark,
            '&:hover': {
              background: theme.palette.mode === 'dark' ? theme.palette.warning.dark : theme.palette.secondary.dark,
              color: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.secondary.light
            }
          }}
          ref={anchorRef}
          aria-controls={open ? 'menu-list-grow' : undefined}
          aria-haspopup="true"
          onClick={handleToggle}
          color="inherit"
        >
          <ModeIcon />
        </Avatar>
      </Box>
      <Popper
        placement="bottom-end"
        open={open}
        anchorEl={anchorRef.current}
        role={undefined}
        transition
        disablePortal
        modifiers={[
          {
            name: 'offset',
            options: {
              offset: [0, 14]
            }
          }
        ]}
      >
        {({ TransitionProps }) => (
          <ClickAwayListener onClickAway={handleClose}>
            <Transitions in={open} {...TransitionProps}>
              <Paper>
                {open && (
                  <MainCard border={false} elevation={16} content={false} boxShadow shadow={theme.shadows[16]}>
                    <List
                      component="nav"
                      sx={{
                        width: '100%',
                        maxWidth: 350,
                        minWidth: 200,
                        borderRadius: `${theme.shape.borderRadius}px`,
                        p: 0.5
                      }}
                    >
                      <ListItemButton
                        selected={mode === 'light'}
                        onClick={() => handleModeChange('light')}
                        sx={{ borderRadius: `${theme.shape.borderRadius}px` }}
                      >
                        <ListItemIcon>
                          <IconSun stroke={1.5} size="20px" />
                        </ListItemIcon>
                        <ListItemText primary={<Typography variant="body2">Light</Typography>} />
                      </ListItemButton>
                      <ListItemButton
                        selected={mode === 'dark'}
                        onClick={() => handleModeChange('dark')}
                        sx={{ borderRadius: `${theme.shape.borderRadius}px` }}
                      >
                        <ListItemIcon>
                          <IconMoon stroke={1.5} size="20px" />
                        </ListItemIcon>
                        <ListItemText primary={<Typography variant="body2">Dark</Typography>} />
                      </ListItemButton>
                      <ListItemButton
                        selected={mode === 'system'}
                        onClick={() => handleModeChange('system')}
                        sx={{ borderRadius: `${theme.shape.borderRadius}px` }}
                      >
                        <ListItemIcon>
                          <IconDeviceDesktop stroke={1.5} size="20px" />
                        </ListItemIcon>
                        <ListItemText primary={<Typography variant="body2">System</Typography>} />
                      </ListItemButton>
                    </List>
                  </MainCard>
                )}
              </Paper>
            </Transitions>
          </ClickAwayListener>
        )}
      </Popper>
    </>
  );
}
