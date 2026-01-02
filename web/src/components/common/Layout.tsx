import BackupIcon from '@mui/icons-material/Backup';
import ComputerIcon from '@mui/icons-material/Computer';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LabelIcon from '@mui/icons-material/Label';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StorageIcon from '@mui/icons-material/Storage';
import {
  AppBar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const drawerWidth = 240;

interface LayoutProps {
  children: ReactNode;
}

function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { path: '/servers', label: 'Servers', icon: <ComputerIcon /> },
    { path: '/backup-profiles', label: 'Backup Profiles', icon: <BackupIcon /> },
    { path: '/backup-runs', label: 'Backup Runs', icon: <PlayArrowIcon /> },
    { path: '/backups', label: 'Backups', icon: <StorageIcon /> },
  ];

  const configItems = [
    { path: '/storage-locations', label: 'Storage Locations', icon: <StorageIcon /> },
    { path: '/naming-rules', label: 'Naming Rules', icon: <LabelIcon /> },
    { path: '/notifications', label: 'Notifications', icon: <NotificationsIcon /> },
  ];

  const getPageTitle = () => {
    const routes: Record<string, string> = {
      '/dashboard': 'Dashboard',
      '/servers': 'Servers',
      '/backup-profiles': 'Backup Profiles',
      '/backup-runs': 'Backup Runs',
      '/backups': 'Backups',
      '/storage-locations': 'Storage Locations',
      '/naming-rules': 'Naming Rules',
      '/notifications': 'Notifications',
    };

    if (location.pathname.startsWith('/backup-profiles/')) {
      return 'Backup Profile Detail';
    }

    if (location.pathname.startsWith('/backup-runs/')) {
      return 'Backup Run Detail';
    }

    return routes[location.pathname] ?? 'BackApp';
  };

  const drawerContent = (
    <>
      <Box sx={{ p: 2 }}>
        <Typography variant="h5" component="h1" fontWeight="bold">
          BackApp
        </Typography>
      </Box>
      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.12)' }} />
      <List>
        {navItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              component={Link}
              to={item.path}
              selected={location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)}
              onClick={() => isMobile && setMobileOpen(false)}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                },
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                },
              }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.12)', my: 1 }} />
      <Box sx={{ px: 2, py: 1 }}>
        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
          CONFIGURATION
        </Typography>
      </Box>
      <List>
        {configItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              component={Link}
              to={item.path}
              selected={location.pathname === item.path}
              onClick={() => isMobile && setMobileOpen(false)}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                },
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                },
              }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          backgroundColor: 'white',
          color: 'text.primary',
          boxShadow: 1,
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" noWrap component="div">
            {getPageTitle()}
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Mobile drawer (temporary) */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            backgroundColor: '#1a1a1a',
            color: 'white',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop drawer (permanent) */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            backgroundColor: '#1a1a1a',
            color: 'white',
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          p: { xs: 1.5, sm: 2, md: 3 },
          mt: { xs: 7, sm: 8 },
          width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          overflow: 'auto',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

export default Layout;
