import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import DriveFileMoveIcon from '@mui/icons-material/DriveFileMove';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  Box,
  Button,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import FolderIcon from '@mui/icons-material/Folder';
import StorageIcon from '@mui/icons-material/Storage';
import BackupIcon from '@mui/icons-material/Backup';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { useState } from 'react';

export interface DestructiveAction {
  type: 'delete' | 'move';
  label: string;
  details?: string;
}

export interface DestructiveActionDialogProps {
  open: boolean;
  title: string;
  description?: string;
  actionType: 'delete' | 'move';
  impact: {
    backupProfiles?: number;
    backupRuns?: number;
    backupFiles?: number;
    totalSizeBytes?: number;
    filePaths?: string[];
    oldPath?: string;
    newPath?: string;
  };
  actions: DestructiveAction[];
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
}

function formatSize(bytes: number): string {
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

export function DestructiveActionDialog({
  open,
  title,
  description,
  actionType,
  impact,
  actions,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  loading = false,
}: DestructiveActionDialogProps) {
  const [showFilePaths, setShowFilePaths] = useState(false);

  const hasImpact = (impact.backupProfiles ?? 0) > 0 ||
    (impact.backupRuns ?? 0) > 0 ||
    (impact.backupFiles ?? 0) > 0;

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {actionType === 'delete' ? (
          <DeleteForeverIcon color="error" />
        ) : (
          <DriveFileMoveIcon color="warning" />
        )}
        {title}
      </DialogTitle>
      <DialogContent>
        {description && (
          <Typography variant="body1" sx={{ mb: 2 }}>
            {description}
          </Typography>
        )}

        {hasImpact && (
          <Box
            sx={{
              p: 2,
              borderRadius: 1,
              bgcolor: actionType === 'delete' ? 'error.light' : 'warning.light',
              color: actionType === 'delete' ? 'error.contrastText' : 'warning.contrastText',
              mb: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <WarningAmberIcon />
              <Typography variant="subtitle1" fontWeight="bold">
                This action will affect:
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
              {(impact.backupProfiles ?? 0) > 0 && (
                <Chip
                  data-testid="impact-profiles"
                  icon={<StorageIcon />}
                  label={`${impact.backupProfiles} Backup Profile${impact.backupProfiles !== 1 ? 's' : ''}`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}
                />
              )}
              {(impact.backupRuns ?? 0) > 0 && (
                <Chip
                  data-testid="impact-runs"
                  icon={<BackupIcon />}
                  label={`${impact.backupRuns} Backup Run${impact.backupRuns !== 1 ? 's' : ''}`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}
                />
              )}
              {(impact.backupFiles ?? 0) > 0 && (
                <Chip
                  data-testid="impact-files"
                  icon={<InsertDriveFileIcon />}
                  label={`${impact.backupFiles} File${impact.backupFiles !== 1 ? 's' : ''}`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}
                />
              )}
            </Box>

            {(impact.totalSizeBytes ?? 0) > 0 && (
              <Typography variant="body2">
                Total size: <strong>{formatSize(impact.totalSizeBytes ?? 0)}</strong>
              </Typography>
            )}
          </Box>
        )}

        {impact.oldPath && impact.newPath && (
          <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Path Change:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FolderIcon color="action" fontSize="small" />
              <Typography
                variant="body2"
                fontFamily="monospace"
                sx={{ textDecoration: 'line-through', color: 'text.secondary' }}
              >
                {impact.oldPath}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FolderIcon color="primary" fontSize="small" />
              <Typography variant="body2" fontFamily="monospace" color="primary">
                {impact.newPath}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Empty parent directories at the old path will be automatically deleted.
            </Typography>
          </Box>
        )}

        {actions.length > 0 && (
          <>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              The following actions will be performed:
            </Typography>
            <List dense sx={{ bgcolor: 'grey.50', borderRadius: 1 }}>
              {actions.map((action, index) => (
                <ListItem key={index}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {action.type === 'delete' ? (
                      <DeleteForeverIcon color="error" fontSize="small" />
                    ) : (
                      <DriveFileMoveIcon color="warning" fontSize="small" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={action.label}
                    secondary={action.details}
                    primaryTypographyProps={{ variant: 'body2' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
              ))}
            </List>
          </>
        )}

        {impact.filePaths && impact.filePaths.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
              }}
              onClick={() => setShowFilePaths(!showFilePaths)}
            >
              <IconButton size="small">
                {showFilePaths ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
              <Typography variant="body2" color="text.secondary">
                {showFilePaths ? 'Hide' : 'Show'} affected file paths ({impact.filePaths.length})
              </Typography>
            </Box>
            <Collapse in={showFilePaths}>
              <Box
                sx={{
                  maxHeight: 200,
                  overflow: 'auto',
                  bgcolor: 'grey.100',
                  borderRadius: 1,
                  p: 1,
                  mt: 1,
                }}
              >
                {impact.filePaths.slice(0, 50).map((path, index) => (
                  <Typography
                    key={index}
                    variant="caption"
                    fontFamily="monospace"
                    component="div"
                    sx={{ wordBreak: 'break-all' }}
                  >
                    {path}
                  </Typography>
                ))}
                {impact.filePaths.length > 50 && (
                  <Typography variant="caption" color="text.secondary">
                    ... and {impact.filePaths.length - 50} more files
                  </Typography>
                )}
              </Box>
            </Collapse>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        <Typography variant="body2" color="text.secondary">
          This action cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={loading}>
          {cancelText}
        </Button>
        <Button
          onClick={onConfirm}
          color={actionType === 'delete' ? 'error' : 'warning'}
          variant="contained"
          disabled={loading}
        >
          {loading ? 'Processing...' : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default DestructiveActionDialog;
