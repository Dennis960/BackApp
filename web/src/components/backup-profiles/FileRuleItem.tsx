import {
  Close as CloseIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  InfoOutlined as InfoOutlinedIcon,
  InsertDriveFile as FileIcon,
  Folder as FolderIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import {
  Box,
  Checkbox,
  Chip,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { fileRuleApi } from '../../api';
import type { FileRule } from '../../types';
import PathPickerField from '../common/PathPickerField';

interface FileRuleItemProps {
  fileRule: FileRule;
  profileId?: number;
  onFileRuleChanged?: () => void;
  serverId?: number;
}

function FileRuleItem({ fileRule, profileId, onFileRuleChanged, serverId }: FileRuleItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPath, setEditedPath] = useState('');
  const [editedRecursive, setEditedRecursive] = useState(false);
  const [editedCompress, setEditedCompress] = useState(false);
  const [editedFormat, setEditedFormat] = useState('7z');
  const [editedPassword, setEditedPassword] = useState('');
  const [editedPattern, setEditedPattern] = useState('');

  const handleEdit = () => {
    setIsEditing(true);
    setEditedPath(fileRule.remote_path);
    setEditedRecursive(fileRule.recursive);
    setEditedCompress(fileRule.compress === true);
    setEditedFormat(fileRule.compress_format || '7z');
    setEditedPassword(fileRule.compress_password || '');
    setEditedPattern(fileRule.exclude_pattern || '');
  };

  const handleSave = async () => {
    const trimmedPath = editedPath.trim();
    if (!trimmedPath) return;
    try {
      await fileRuleApi.update(fileRule.id, {
        remote_path: trimmedPath,
        recursive: editedRecursive,
        compress: editedCompress,
        compress_format: editedCompress ? editedFormat : undefined,
        compress_password: editedCompress && editedFormat !== 'zip' ? (editedPassword.trim() || undefined) : undefined,
        exclude_pattern: editedPattern.trim() || undefined,
      });
      setIsEditing(false);
      onFileRuleChanged?.();
    } catch (error) {
      console.error('Failed to update file rule:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this file rule?')) return;
    try {
      await fileRuleApi.delete(fileRule.id);
      onFileRuleChanged?.();
    } catch (error) {
      console.error('Failed to delete file rule:', error);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: isEditing ? 'flex-start' : 'center',
        gap: 1.5,
        p: 1.5,
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: '#f5f5f5',
      }}
    >
      {!isEditing && (
        <Box flexShrink={0}>
          {fileRule.recursive ? (
            <FolderIcon fontSize="small" color="primary" />
          ) : (
            <FileIcon fontSize="small" color="action" />
          )}
        </Box>
      )}
      <Box flex={1} minWidth={0}>
        {isEditing ? (
          <Stack spacing={1}>
              <PathPickerField
                label="Remote Path"
                value={editedPath}
                onChange={setEditedPath}
                serverId={serverId}
                allowDirectories={true}
                initialPath={editedPath || '/'}
              />
            <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={editedRecursive}
                    onChange={(e) => setEditedRecursive(e.target.checked)}
                  />
                }
                label="Recursive"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={editedCompress}
                    onChange={(e) => setEditedCompress(e.target.checked)}
                  />
                }
                label={(
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <span>Compress</span>
                    <Tooltip title="For SFTP storage, compression runs locally on the BackApp instance.">
                      <InfoOutlinedIcon fontSize="small" />
                    </Tooltip>
                  </Box>
                )}
              />
            </Box>
            {editedCompress && (
              <FormControl size="small" sx={{ maxWidth: 220 }}>
                <InputLabel>Format</InputLabel>
                <Select
                  label="Format"
                  value={editedFormat}
                  onChange={(e) => {
                    setEditedFormat(e.target.value);
                    if (e.target.value === 'zip') {
                      setEditedPassword('');
                    }
                  }}
                >
                  <MenuItem value="7z">7z (with encryption)</MenuItem>
                  <MenuItem value="zip">zip (no encryption)</MenuItem>
                </Select>
              </FormControl>
            )}
            {editedCompress && editedFormat !== 'zip' && (
              <TextField
                fullWidth
                size="small"
                label="7z Password"
                type="password"
                value={editedPassword}
                onChange={(e) => setEditedPassword(e.target.value)}
                placeholder="Optional"
                variant="outlined"
              />
            )}
            <TextField
              fullWidth
              size="small"
              label="Exclude Pattern"
              value={editedPattern}
              onChange={(e) => setEditedPattern(e.target.value)}
              placeholder="*.tmp,*.cache (optional)"
              variant="outlined"
            />
          </Stack>
        ) : (
          <>
            <Typography
              variant="body2"
              fontFamily="monospace"
              fontWeight={600}
              sx={{ wordBreak: 'break-all', mb: 0.5 }}
            >
              {fileRule.remote_path}
            </Typography>
            <Box display="flex" gap={0.5} flexWrap="wrap">
              <Chip
                label={fileRule.remote_path?.trim().endsWith('/') ? 'Directory' : 'File'}
                size="small"
                color={fileRule.remote_path?.trim().endsWith('/') ? 'primary' : 'default'}
                variant="outlined"
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
              {fileRule.compress && (
                <Chip
                  label={`Compress with ${fileRule.compress_format === 'zip' ? 'zip' : '7z'}`}
                  size="small"
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              )}
              {fileRule.compress && fileRule.compress_format !== 'zip' && fileRule.compress_password && (
                <Chip
                  label="Encrypted"
                  size="small"
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              )}
              {fileRule.exclude_pattern && (
                <Chip
                  label={`Exclude: ${fileRule.exclude_pattern}`}
                  size="small"
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              )}
            </Box>
          </>
        )}
      </Box>
      {profileId && (
        <Box display="flex" gap={0.5} flexShrink={0}>
          {isEditing ? (
            <>
              <Tooltip title="Save">
                <IconButton
                  size="small"
                  onClick={handleSave}
                  color="success"
                  disabled={editedCompress && editedPath.trim().endsWith('/')}
                >
                  <SaveIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Cancel">
                <IconButton
                  size="small"
                  onClick={() => setIsEditing(false)}
                  color="default"
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          ) : (
            <>
              <Tooltip title="Edit">
                <IconButton
                  size="small"
                  onClick={handleEdit}
                  color="primary"
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton
                  size="small"
                  onClick={handleDelete}
                  color="error"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      )}
    </Box>
  );
}

export default FileRuleItem;
