import React, { useRef, useState } from 'react';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Grow from '@mui/material/Grow';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import { SvgIconProps } from '@mui/material/SvgIcon';
import Box from '@mui/material/Box';

export interface ActionOption {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}

interface SplitActionButtonProps {
  options: ActionOption[];
  primaryLabel?: string;
  primaryAction?: () => void;
  primaryStartIcon?: React.ReactElement; // Icon for the main button
}

/**
 * A Split Button component that shows a primary action and a dropdown for secondary actions.
 * If no primaryAction is provided, the first option becomes the primary action (standard Split Button behavior),
 * or you can treat `options[0]` as the primary.
 * 
 * In this implementation:
 * - The main button triggers `options[0].onClick`
 * - The dropdown shows `options[1...]`
 * 
 * Or if you want a distinct Primary Action separate from the list:
 * - Provide `primaryAction` prop.
 */
const SplitActionButton = ({ options, primaryLabel, primaryAction, primaryStartIcon }: SplitActionButtonProps) => {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  const handleMenuItemClick = (
    event: React.MouseEvent<HTMLLIElement, MouseEvent>,
    index: number,
  ) => {
    options[index].onClick();
    setOpen(false);
  };

  const handleToggle = () => {
    setOpen((prevOpen) => !prevOpen);
  };

  const handleClose = (event: Event) => {
    if (anchorRef.current && anchorRef.current.contains(event.target as HTMLElement)) {
      return;
    }
    setOpen(false);
  };

  // If explicit primary action is given
  const mainAction = primaryAction || options[0]?.onClick;
  const mainLabel = primaryLabel || options[0]?.label;

  // If using options[0] as main, dropdown should show options[1...]
  // If using explicit primaryAction, dropdown should show all options
  const dropdownOptions = primaryAction ? options : options.slice(1);

  return (
    <React.Fragment>
      <ButtonGroup variant="contained" ref={anchorRef} aria-label="split button" sx={{ boxShadow: 2 }}>
        <Button onClick={mainAction} startIcon={primaryStartIcon}>
            {mainLabel}
        </Button>
        <Button
          size="small"
          aria-controls={open ? 'split-button-menu' : undefined}
          aria-expanded={open ? 'true' : undefined}
          aria-label="select merge strategy"
          aria-haspopup="menu"
          onClick={handleToggle}
        >
          <ArrowDropDownIcon />
        </Button>
      </ButtonGroup>
      <Popper
        sx={{
          zIndex: 1,
        }}
        open={open}
        anchorEl={anchorRef.current}
        role={undefined}
        transition
        disablePortal
      >
        {({ TransitionProps, placement }) => (
          <Grow
            {...TransitionProps}
            style={{
              transformOrigin:
                placement === 'bottom' ? 'center top' : 'center bottom',
            }}
          >
            <Paper>
              <ClickAwayListener onClickAway={handleClose}>
                <MenuList id="split-button-menu" autoFocusItem={open} >
                  {dropdownOptions.map((option, index) => (
                    <MenuItem
                      key={option.label}
                      onClick={(event) => handleMenuItemClick(event, primaryAction ? index : index + 1)}
                    >
                        {option.icon && (
                            <Box component="span" sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                                {option.icon}
                            </Box>
                        )}
                        {option.label}
                    </MenuItem>
                  ))}
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </React.Fragment>
  );
};

export default SplitActionButton;
