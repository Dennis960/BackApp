import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FolderIcon from '@mui/icons-material/Folder';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  IconButton,
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { BackupFile } from '../../types';
import { formatDate } from '../../utils/format';

export interface BackupFileRow extends BackupFile {
  runId: number;
  runStatus?: string;
  runStartedAt?: string;
  runFinishedAt?: string;
}

interface BackupFilesTableProps {
  files: BackupFileRow[];
  title?: string;
  showRunColumn?: boolean;
  emptyMessage?: string;
  showStatus?: boolean;
  onDeleteFile?: (fileId: number) => void;
  /** Group files by run and collapse runs with multiple files */
  groupByRun?: boolean;
  /** Maximum number of files/runs to show initially (0 = show all) */
  initialLimit?: number;
}

export function formatFileSize(bytes?: number): string {
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

interface RunGroup {
  runId: number;
  runStatus?: string;
  runStartedAt?: string;
  files: BackupFileRow[];
  totalSize: number;
}

function groupFilesByRun(files: BackupFileRow[]): RunGroup[] {
  const groups = new Map<number, RunGroup>();
  
  for (const file of files) {
    if (!groups.has(file.runId)) {
      groups.set(file.runId, {
        runId: file.runId,
        runStatus: file.runStatus,
        runStartedAt: file.runStartedAt,
        files: [],
        totalSize: 0,
      });
    }
    const group = groups.get(file.runId)!;
    group.files.push(file);
    group.totalSize += file.size_bytes || file.file_size || 0;
  }
  
  // Sort by runId descending (most recent first)
  return Array.from(groups.values()).sort((a, b) => b.runId - a.runId);
}

function RunGroupRow({
  group,
  onDownload,
  onDeleteFile,
  showStatus,
}: {
  group: RunGroup;
  onDownload: (fileId: number, filePath: string) => void;
  onDeleteFile?: (fileId: number) => void;
  showStatus?: boolean;
}) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(group.files.length === 1);
  const hasMultipleFiles = group.files.length > 1;
  const singleFile = group.files[0];
  const isSingleAvailable = singleFile?.available !== false;
  const isSingleDeleted = singleFile?.deleted;

  return (
    <>
      <TableRow
        hover
        sx={{ 
          cursor: hasMultipleFiles ? 'pointer' : 'default',
          '& > *': { borderBottom: expanded && hasMultipleFiles ? 'unset' : undefined },
        }}
        onClick={() => hasMultipleFiles && setExpanded(!expanded)}
      >
        <TableCell sx={{ width: 40, p: 0.5 }}>
          {hasMultipleFiles && (
            <IconButton size="small">
              {expanded ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
            </IconButton>
          )}
        </TableCell>
        <TableCell>
          <Link
            component="button"
            variant="body2"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/backup-runs/${group.runId}`);
            }}
            sx={{ fontWeight: 500 }}
          >
            Run #{group.runId}
          </Link>
          <Typography variant="caption" color="text.secondary" display="block">
            {group.runStatus} • {group.files.length} file{group.files.length !== 1 ? 's' : ''}
          </Typography>
        </TableCell>
        <TableCell>
          {hasMultipleFiles ? (
            <Typography variant="body2" color="text.secondary" fontStyle="italic">
              {group.files.length} files
            </Typography>
          ) : (
            <Typography variant="body2" sx={{ wordBreak: 'break-all' }} fontFamily="monospace" fontSize="0.8rem">
              {group.files[0].remote_path}
            </Typography>
          )}
        </TableCell>
        <TableCell align="right">{formatFileSize(group.totalSize)}</TableCell>
        <TableCell>{formatDate(group.runStartedAt)}</TableCell>
        {showStatus && (
          <TableCell>
            {!hasMultipleFiles && (
              isSingleDeleted ? (
                <Chip label="Deleted" color="error" size="small" variant="outlined" />
              ) : !isSingleAvailable ? (
                <Chip label="Missing" color="warning" size="small" variant="outlined" />
              ) : (
                <Chip label="Available" color="success" size="small" variant="outlined" />
              )
            )}
          </TableCell>
        )}
        <TableCell align="right">
          {!hasMultipleFiles && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
              {isSingleDeleted ? (
                <Tooltip title="File has been deleted">
                  <span>
                    <IconButton size="small" disabled aria-label="File deleted">
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              ) : !isSingleAvailable ? (
                onDeleteFile ? (
                  <Tooltip title="Delete missing file">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteFile(singleFile.id);
                      }}
                      aria-label={`Delete ${singleFile.remote_path || ''}`}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                ) : (
                  <Tooltip title="File missing on storage">
                    <span>
                      <IconButton size="small" disabled aria-label="File missing">
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                )
              ) : (
                <Tooltip title="Download file">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownload(singleFile.id, singleFile.remote_path || singleFile.local_path);
                    }}
                  >
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {onDeleteFile && !isSingleDeleted && isSingleAvailable && (
                <Tooltip title="Delete file">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteFile(singleFile.id);
                    }}
                    aria-label={`Delete ${singleFile.remote_path || ''}`}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          )}
        </TableCell>
      </TableRow>
      {hasMultipleFiles && (
        <TableRow>
          <TableCell colSpan={showStatus ? 7 : 6} sx={{ p: 0, borderBottom: expanded ? undefined : 'none' }}>
            <Collapse in={expanded} timeout="auto" unmountOnExit>
              <Box sx={{ pl: 6, pr: 2, py: 1, bgcolor: 'action.hover' }}>
                <Table size="small">
                  <TableBody>
                    {group.files.map((file) => (
                      <TableRow key={file.id} hover>
                        <TableCell sx={{ border: 'none', py: 0.5 }}>
                          <Typography variant="body2" sx={{ wordBreak: 'break-all' }} fontFamily="monospace" fontSize="0.8rem">
                            {file.remote_path}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ border: 'none', py: 0.5, width: 80 }}>
                          {formatFileSize(file.size_bytes || file.file_size)}
                        </TableCell>
                        {showStatus && (
                          <TableCell sx={{ border: 'none', py: 0.5, width: 110 }}>
                            {file.deleted ? (
                              <Chip label="Deleted" color="error" size="small" variant="outlined" />
                            ) : file.available === false ? (
                              <Chip label="Missing" color="warning" size="small" variant="outlined" />
                            ) : (
                              <Chip label="Available" color="success" size="small" variant="outlined" />
                            )}
                          </TableCell>
                        )}
                        <TableCell align="right" sx={{ border: 'none', py: 0.5, width: 40 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                            {file.deleted ? (
                              <Tooltip title="File has been deleted">
                                <span>
                                  <IconButton size="small" disabled aria-label="File deleted">
                                    <DownloadIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            ) : file.available === false ? (
                              onDeleteFile ? (
                                <Tooltip title="Delete missing file">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => onDeleteFile(file.id)}
                                    aria-label={`Delete ${file.remote_path || ''}`}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              ) : (
                                <Tooltip title="File missing on storage">
                                  <span>
                                    <IconButton size="small" disabled aria-label="File missing">
                                      <DownloadIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              )
                            ) : (
                              <Tooltip title="Download file">
                                <IconButton
                                  size="small"
                                  onClick={() => onDownload(file.id, file.remote_path || file.local_path)}
                                >
                                  <DownloadIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {onDeleteFile && !file.deleted && file.available !== false && (
                              <Tooltip title="Delete file">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => onDeleteFile(file.id)}
                                  aria-label={`Delete ${file.remote_path || ''}`}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function BackupFilesTable({
  files,
  title = 'Backup Files',
  showRunColumn = true,
  emptyMessage = 'No backup files found.',
  showStatus = false,
  onDeleteFile,
  groupByRun = false,
  initialLimit = 0,
}: BackupFilesTableProps) {
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);

  const handleDownloadFile = (fileId: number, filePath: string) => {
    const downloadUrl = `/api/v1/backup-files/${fileId}/download`;
    const fileName = filePath.split('/').pop() || 'download';
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const runGroups = useMemo(() => groupFilesByRun(files), [files]);
  
  // Apply limit based on groupByRun mode
  const displayedGroups = useMemo(() => {
    if (showAll || initialLimit === 0) return runGroups;
    return runGroups.slice(0, initialLimit);
  }, [runGroups, showAll, initialLimit]);

  const displayedFiles = useMemo(() => {
    if (showAll || initialLimit === 0) return files;
    return files.slice(0, initialLimit);
  }, [files, showAll, initialLimit]);

  const hiddenCount = groupByRun
    ? runGroups.length - displayedGroups.length
    : files.length - displayedFiles.length;

  if (groupByRun) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <FolderIcon color="action" />
            <Typography variant="h6" fontWeight={600}>
              {title}
            </Typography>
          </Box>

          {files.length === 0 ? (
            <Alert severity="info">{emptyMessage}</Alert>
          ) : (
            <>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 40 }} />
                    <TableCell>Run</TableCell>
                    <TableCell>Path</TableCell>
                    <TableCell align="right">Size</TableCell>
                    <TableCell>Date</TableCell>
                    {showStatus && <TableCell>Status</TableCell>}
                    <TableCell align="right" sx={{ width: 60 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayedGroups.map((group) => (
                    <RunGroupRow
                      key={group.runId}
                      group={group}
                      onDownload={handleDownloadFile}
                      onDeleteFile={onDeleteFile}
                      showStatus={showStatus}
                    />
                  ))}
                </TableBody>
                </Table>
              </TableContainer>
              {hiddenCount > 0 && (
                <Box display="flex" justifyContent="center" mt={2}>
                  <Button
                    size="small"
                    startIcon={<ExpandMoreIcon />}
                    onClick={() => setShowAll(true)}
                  >
                    Show {hiddenCount} more run{hiddenCount !== 1 ? 's' : ''}
                  </Button>
                </Box>
              )}
              {showAll && initialLimit > 0 && runGroups.length > initialLimit && (
                <Box display="flex" justifyContent="center" mt={2}>
                  <Button size="small" onClick={() => setShowAll(false)}>
                    Show less
                  </Button>
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <FolderIcon color="action" />
          <Typography variant="h6" fontWeight={600}>
            {title}
          </Typography>
        </Box>

        {files.length === 0 ? (
          <Alert severity="info">{emptyMessage}</Alert>
        ) : (
          <>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {showRunColumn && <TableCell>Run</TableCell>}
                    <TableCell>Remote Path</TableCell>
                    <TableCell>Local Path</TableCell>
                    <TableCell align="right">Size</TableCell>
                    <TableCell>Created</TableCell>
                    {showStatus && <TableCell>Status</TableCell>}
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayedFiles.map((file) => (
                    <TableRow key={file.id} hover>
                      {showRunColumn && (
                        <TableCell>
                          <Button size="small" onClick={() => navigate(`/backup-runs/${file.runId}`)}>
                            #{file.runId}
                          </Button>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {file.runStatus}
                          </Typography>
                        </TableCell>
                      )}
                      <TableCell>
                        <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                          {file.remote_path}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                          {file.local_path}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{formatFileSize(file.size_bytes || file.file_size)}</TableCell>
                      <TableCell>{formatDate(file.created_at)}</TableCell>
                      {showStatus && (
                        <TableCell>
                          {file.deleted ? (
                            <Chip label="Deleted" color="error" size="small" variant="outlined" />
                          ) : file.available === false ? (
                            <Chip label="Missing" color="warning" size="small" variant="outlined" />
                          ) : (
                            <Chip label="Available" color="success" size="small" variant="outlined" />
                          )}
                        </TableCell>
                      )}
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                          {file.deleted ? (
                            <Tooltip title="File has been deleted">
                              <span>
                                <IconButton size="small" disabled aria-label="File deleted">
                                  <DownloadIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          ) : file.available === false ? (
                            onDeleteFile ? (
                              <Tooltip title="Delete missing file">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => onDeleteFile(file.id)}
                                  aria-label={`Delete ${file.remote_path || ''}`}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            ) : (
                              <Tooltip title="File missing on storage">
                                <span>
                                  <IconButton size="small" disabled aria-label="File missing">
                                    <DownloadIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            )
                          ) : (
                            <Tooltip title="Download file">
                              <IconButton size="small" onClick={() => handleDownloadFile(file.id, file.remote_path || file.local_path)}>
                                <DownloadIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {onDeleteFile && !file.deleted && file.available !== false && (
                            <Tooltip title="Delete file">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => onDeleteFile(file.id)}
                                aria-label={`Delete ${file.remote_path || ''}`}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {hiddenCount > 0 && (
              <Box display="flex" justifyContent="center" mt={2}>
                <Button
                  size="small"
                  startIcon={<ExpandMoreIcon />}
                  onClick={() => setShowAll(true)}
                >
                  Show {hiddenCount} more file{hiddenCount !== 1 ? 's' : ''}
                </Button>
              </Box>
            )}
            {showAll && initialLimit > 0 && files.length > initialLimit && (
              <Box display="flex" justifyContent="center" mt={2}>
                <Button size="small" onClick={() => setShowAll(false)}>
                  Show less
                </Button>
              </Box>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default BackupFilesTable;
