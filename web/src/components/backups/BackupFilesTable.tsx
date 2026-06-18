import DownloadIcon from '@mui/icons-material/Download';
import ArchiveIcon from '@mui/icons-material/Archive';
import FolderIcon from '@mui/icons-material/Folder';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Collapse,
  IconButton,
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { backupRunDownloadApi } from '../../api/backup-runs';
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
  groupByRun?: boolean;
  initialLimit?: number;
}

export function formatFileSize(bytes?: number): string {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
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

  return Array.from(groups.values()).sort((a, b) => b.runId - a.runId);
}

function RunGroupRow({
  group,
  onDownload,
  onDownloadZip,
}: {
  group: RunGroup;
  onDownload: (fileId: number, filePath: string) => void;
  onDownloadZip: (runId: number) => void;
}) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(group.files.length === 1);
  const hasMultipleFiles = group.files.length > 1;

  return (
    <>
      <TableRow
        hover
        sx={{
          cursor: hasMultipleFiles ? 'pointer' : 'default',
          '& > *': { borderBottom: expanded && hasMultipleFiles ? 'unset' : undefined },
        }}
        onClick={() => hasMultipleFiles && setExpanded((current) => !current)}
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
        <TableCell align="right">
          {hasMultipleFiles ? (
            <Tooltip title="Download ZIP">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onDownloadZip(group.runId);
                }}
              >
                <ArchiveIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title="Download file">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload(group.files[0].id, group.files[0].remote_path || group.files[0].local_path);
                }}
              >
                <DownloadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </TableCell>
      </TableRow>
      {hasMultipleFiles && (
        <TableRow>
          <TableCell colSpan={6} sx={{ p: 0, borderBottom: expanded ? undefined : 'none' }}>
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
                        <TableCell align="right" sx={{ border: 'none', py: 0.5, width: 40 }}>
                          <Tooltip title="Download file">
                            <IconButton size="small" onClick={() => onDownload(file.id, file.remote_path || file.local_path)}>
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
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
  groupByRun = false,
  initialLimit = 0,
}: BackupFilesTableProps) {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(initialLimit > 0 ? initialLimit : 10);

  useEffect(() => {
    setPage(0);
  }, [files, groupByRun]);

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

  const handleDownloadZip = (runId: number) => {
    const downloadUrl = backupRunDownloadApi.getZipDownloadUrl(runId);
    const link = document.createElement('a');
    link.href = downloadUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const runGroups = useMemo(() => groupFilesByRun(files), [files]);
  const displayedGroups = useMemo(() => {
    const start = page * rowsPerPage;
    return runGroups.slice(start, start + rowsPerPage);
  }, [page, rowsPerPage, runGroups]);
  const displayedFiles = useMemo(() => {
    const start = page * rowsPerPage;
    return files.slice(start, start + rowsPerPage);
  }, [page, rowsPerPage, files]);

  const totalCount = groupByRun ? runGroups.length : files.length;

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
                      <TableCell align="right" sx={{ width: 60 }}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {displayedGroups.map((group) => (
                      <RunGroupRow
                        key={group.runId}
                        group={group}
                        onDownload={handleDownloadFile}
                        onDownloadZip={handleDownloadZip}
                      />
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={totalCount}
                page={page}
                onPageChange={(_, nextPage) => setPage(nextPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(event) => {
                  setRowsPerPage(parseInt(event.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[5, 10, 25]}
              />
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
                      <TableCell align="right">
                        <Tooltip title="Download file">
                          <IconButton size="small" onClick={() => handleDownloadFile(file.id, file.remote_path || file.local_path)}>
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={totalCount}
              page={page}
              onPageChange={(_, nextPage) => setPage(nextPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(parseInt(event.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25]}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default BackupFilesTable;
