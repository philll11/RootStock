import React from 'react';
import { styled } from '@mui/material/styles';
import {
    DataGrid,
    GridColDef,
    GridRowParams,
    Toolbar,
    ExportCsv,
    QuickFilterTrigger,
    QuickFilter,
    ToolbarButton,
    QuickFilterControl,
    QuickFilterClear,
    ColumnsPanelTrigger,
    FilterPanelTrigger,
    ExportPrint,
} from '@mui/x-data-grid';
import { Box, Divider, InputAdornment, Tooltip } from '@mui/material';
import TextField from '@mui/material/TextField';
import { useTheme, SxProps, Theme } from '@mui/material/styles';
import MainCard from 'ui-component/cards/MainCard';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import CancelIcon from '@mui/icons-material/Cancel';
import SearchIcon from '@mui/icons-material/Search';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import Badge from '@mui/material/Badge';
import FilterListIcon from '@mui/icons-material/FilterList';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

interface DataGridWrapperProps {
    rows: any[];
    columns: GridColDef[];
    loading?: boolean;
    title?: string;
    onRowClick?: (params: GridRowParams) => void;
    toolbarActions?: React.ReactNode;
    getRowId?: (row: any) => string | number;
    checkboxSelection?: boolean;
    sx?: SxProps<Theme>;
}

type OwnerState = {
    expanded: boolean;
};

const StyledQuickFilter = styled(QuickFilter)({
    display: 'grid',
    alignItems: 'center',
    marginLeft: 'auto',
});

const StyledToolbarButton = styled(ToolbarButton)<{ ownerState: OwnerState }>(
    ({ theme, ownerState }) => ({
        gridArea: '1 / 1',
        width: 'min-content',
        height: 'min-content',
        zIndex: 1,
        opacity: ownerState.expanded ? 0 : 1,
        pointerEvents: ownerState.expanded ? 'none' : 'auto',
        transition: theme.transitions.create(['opacity']),
    }),
);

const StyledTextField = styled(TextField)<{ ownerState: OwnerState; }>(
    ({ theme, ownerState }) => ({
        gridArea: '1 / 1',
        overflowX: 'clip',
        width: ownerState.expanded ? 260 : 'var(--trigger-width)',
        opacity: ownerState.expanded ? 1 : 0,
        transition: theme.transitions.create(['width', 'opacity']),
    })
);


function CustomToolbar() {
    const [exportMenuOpen, setExportMenuOpen] = React.useState(false);
    const exportMenuTriggerRef = React.useRef<HTMLButtonElement>(null);

    return (
        <Toolbar>
            <StyledQuickFilter expanded sx={{ padding: 2 }}>
                <QuickFilterTrigger
                    render={(triggerProps, state) => (
                        <Tooltip title="Search" enterDelay={0}>
                            <StyledToolbarButton
                                {...triggerProps}
                                ownerState={{ expanded: state.expanded }}
                                color="default"
                                aria-disabled={state.expanded}
                            >
                                <SearchIcon fontSize="small" />
                            </StyledToolbarButton>
                        </Tooltip>
                    )}
                />
                <QuickFilterControl
                    render={({ ref, ...controlProps }, state) => (
                        <StyledTextField
                            {...controlProps}
                            ownerState={{ expanded: state.expanded }}
                            inputRef={ref}
                            aria-label="Search"
                            placeholder="Search..."
                            size="small"
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" />
                                        </InputAdornment>
                                    ),
                                    endAdornment: state.value ? (
                                        <InputAdornment position="end">
                                            <QuickFilterClear
                                                edge="end"
                                                size="small"
                                                aria-label="Clear search"
                                                material={{ sx: { marginRight: -0.75 } }}
                                            >
                                                <CancelIcon fontSize="small" />
                                            </QuickFilterClear>
                                        </InputAdornment>
                                    ) : null,
                                    ...controlProps.slotProps?.input,
                                },
                                ...controlProps.slotProps,
                            }}
                        />
                    )}
                />
            </StyledQuickFilter>

            <Box sx={{ flexGrow: 1 }} />

            <Tooltip title="Columns">
                <ColumnsPanelTrigger render={<ToolbarButton />}>
                    <ViewColumnIcon fontSize="small" />
                </ColumnsPanelTrigger>
            </Tooltip>

            <Tooltip title="Filters">
                <FilterPanelTrigger
                    render={(props, state) => (
                        <ToolbarButton {...props} color="default">
                            <Badge badgeContent={state.filterCount} color="primary" variant="dot">
                                <FilterListIcon fontSize="small" />
                            </Badge>
                        </ToolbarButton>
                    )}
                />
            </Tooltip>

            <Divider orientation="vertical" variant="middle" flexItem sx={{ mx: 0.5 }} />

            <Tooltip title="Export">
                <ToolbarButton
                    ref={exportMenuTriggerRef}
                    id="export-menu-trigger"
                    aria-controls="export-menu"
                    aria-haspopup="true"
                    aria-expanded={exportMenuOpen ? 'true' : undefined}
                    onClick={() => setExportMenuOpen(true)}
                >
                    <FileDownloadIcon fontSize="small" />
                </ToolbarButton>
            </Tooltip>

            <Menu
                id="export-menu"
                anchorEl={exportMenuTriggerRef.current}
                open={exportMenuOpen}
                onClose={() => setExportMenuOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{
                    list: {
                        'aria-labelledby': 'export-menu-trigger',
                    },
                }}
            >
                <ExportPrint render={<MenuItem />} onClick={() => setExportMenuOpen(false)}>
                    Print
                </ExportPrint>
                <ExportCsv render={<MenuItem />} onClick={() => setExportMenuOpen(false)}>
                    Download as CSV
                </ExportCsv>
            </Menu>
        </Toolbar>
    );
}

const DataGridWrapper: React.FC<DataGridWrapperProps> = ({
    rows,
    columns,
    loading = false,
    onRowClick,
    getRowId,
    checkboxSelection = true,
}) => {
    const theme = useTheme();

    return (
        <Box sx={{ width: '100%', minHeight: 400 }}>
            <DataGrid
                rows={rows}
                columns={columns}
                loading={loading}
                getRowId={getRowId || ((row) => row._id || row.id)}
                checkboxSelection={checkboxSelection}
                disableRowSelectionOnClick
                disableColumnMenu
                autoHeight={rows.length > 0 && rows.length <= 10}

                slots={{ toolbar: CustomToolbar }}
                showToolbar

                initialState={{
                    pagination: {
                        paginationModel: { pageSize: 10, page: 0 },
                    },
                    filter: {
                        filterModel: {
                            items: [],
                            quickFilterValues: [],
                        },
                    },
                    density: 'comfortable'
                }}
                pageSizeOptions={[5, 10, 25, 50]}

                sx={{
                    border: 0,

                    '& .MuiDataGrid-columnHeaders': {
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        backgroundColor: 'transparent',
                        color: theme.palette.text.primary,
                        fontSize: '0.875rem',
                        fontWeight: 600,
                    },
                    '& .MuiDataGrid-columnHeaderTitle': {
                        fontWeight: 600,
                    },
                    '& .MuiDataGrid-toolbarContainer': {
                        padding: 2,
                    },
                    '& .MuiDataGrid-cell': {
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        '&:focus': {
                            outline: 'none',
                        },
                    },
                    '& .MuiDataGrid-cell:focus-within': {
                        outline: 'none',
                    },
                    '& .MuiDataGrid-row': {
                        '&:hover': {
                            cursor: onRowClick ? 'pointer' : 'default',
                            backgroundColor: theme.palette.mode === 'dark' ? theme.palette.dark[800] : theme.palette.primary.light + '20',
                        }
                    },
                    '& .MuiCheckbox-root': {
                        color: theme.palette.secondary.main,
                    },
                    '& .MuiDataGrid-footerContainer': {
                        borderTop: `1px solid ${theme.palette.divider}`,
                    }
                }}

                onRowClick={onRowClick}
            />
        </Box>
    );
};

export default DataGridWrapper;
