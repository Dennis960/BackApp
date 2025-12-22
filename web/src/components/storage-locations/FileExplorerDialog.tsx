import { ArrowUpward as BackIcon, InsertDriveFile as FileIcon, Folder as FolderIcon } from '@mui/icons-material';
import {
  Box,
  Breadcrumbs,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { fileExplorerApi } from '../../api';
import type { FileSystemEntry } from '../../api/file-explorer';
import { localFileExplorerApi } from '../../api/local-file-explorer';

interface FileExplorerDialogProps {
  open: boolean;
  serverId?: number;
  onSelect: (path: string) => void;
  onClose: () => void;
  allowDirectories?: boolean;
  initialPath?: string;
  title?: string;
}

function FileExplorerDialog({
  open,
  serverId,
  onSelect,
  onClose,
  allowDirectories = true,
  initialPath = '/',
  title,
}: FileExplorerDialogProps) {
  const isLocal = serverId === undefined;
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [entries, setEntries] = useState<FileSystemEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadFiles(currentPath);
    }
  }, [open, serverId]);

  const loadFiles = async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const files = isLocal
        ? await localFileExplorerApi.listFiles(path)
        : await fileExplorerApi.listFiles(serverId!, path);
      setEntries(files);
      setCurrentPath(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (entry: FileSystemEntry) => {
    if (entry.is_dir) {
      loadFiles(entry.path);
    }
  };

  const handleSelect = (entry: FileSystemEntry) => {
    if (!entry.is_dir || allowDirectories) {
      onSelect(entry.path);
      onClose();
    }
  };

  const handleBreadcrumbClick = (path: string) => {
    loadFiles(path);
  };

  const handleGoBack = () => {
    if (currentPath !== '/') {
      const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/')) || '/';
      loadFiles(parentPath);
    }
  };

  const breadcrumbs = currentPath.split('/').filter(Boolean);
  const dialogTitle = title || (isLocal ? 'Select Local Directory' : 'Select File or Directory');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{dialogTitle}</DialogTitle>
      <DialogContent>
        {/* Breadcrumbs */}
        <Box mb={2} mt={1}>
          <Breadcrumbs sx={{ fontSize: '0.875rem' }}>
            <Link
              component="button"
              variant="body2"
              onClick={(e) => {
                e.preventDefault();
                handleBreadcrumbClick('/');
              }}
              underline="hover"
              sx={{ cursor: 'pointer' }}
            >
              /
            </Link>
            {breadcrumbs.map((crumb, index) => {
              const path = '/' + breadcrumbs.slice(0, index + 1).join('/');
              return (
                <Link
                  key={path}
                  component="button"
                  variant="body2"
                  onClick={(e) => {
                    e.preventDefault();
                    handleBreadcrumbClick(path);
                  }}
                  underline="hover"
                  sx={{ cursor: 'pointer' }}
                >
                  {crumb}
                </Link>
              );
            })}
          </Breadcrumbs>
        </Box>

        {/* Loading and Error States */}
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error" textAlign="center" py={2}>
            {error}
          </Typography>
        ) : entries.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" py={2}>
            Empty directory
          </Typography>
        ) : (
          <List sx={{ maxHeight: 400, overflow: 'auto' }}>
            {currentPath !== '/' && (
              <ListItem disablePadding>
                <ListItemButton onClick={handleGoBack}>
                  <ListItemIcon>
                    <BackIcon />
                  </ListItemIcon>
                  <ListItemText primary=".." />
                </ListItemButton>
              </ListItem>
            )}
            {entries.map((entry) => (
              <ListItem key={entry.path} disablePadding>
                <ListItemButton
                  onClick={() => {
                    if (entry.is_dir) {
                      handleNavigate(entry);
                    } else {
                      handleSelect(entry);
                    }
                  }}
                  onDoubleClick={() => handleNavigate(entry)}
                >
                  <ListItemIcon>
                    {entry.is_dir ? <FolderIcon /> : <FileIcon />}
                  </ListItemIcon>
                  <ListItemText primary={entry.name} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => {
            onSelect(currentPath);
            onClose();
          }}
          variant="contained"
        >
          Select Current Path
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default FileExplorerDialog;
