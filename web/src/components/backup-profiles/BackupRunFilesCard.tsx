import DownloadIcon from '@mui/icons-material/Download';
import FolderIcon from '@mui/icons-material/Folder';
import {
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
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
import type { BackupFile } from '../../types';
import { formatDate } from '../../utils/format';

interface BackupRunFilesCardProps {
  files: BackupFile[];
  formatSize: (bytes: number) => string;
  onDownload: (fileId: number, filePath: string) => void;
}

function BackupRunFilesCard({ files, formatSize, onDownload }: BackupRunFilesCardProps) {
  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <FolderIcon />
          <Typography variant="h6">
            Backed Up Files ({files.length})
          </Typography>
        </Box>

        {files.length === 0 ? (
          <Box textAlign="center" py={8}>
            <Typography color="text.secondary">
              No files recorded for this backup run
            </Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>File Path</TableCell>
                  <TableCell align="right">Size</TableCell>
                  <TableCell>Backed Up</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {files.map((file, index) => {
                  const isAvailable = file.available !== false;
                  return (
                    <TableRow key={index} hover sx={file.deleted ? { opacity: 0.6 } : {}}>
                      <TableCell>
                      <Typography
                        variant="body2"
                        fontFamily="monospace"
                        fontSize="0.875rem"
                        sx={file.deleted ? { textDecoration: 'line-through' } : {}}
                      >
                        {file.remote_path}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {formatSize(file.size_bytes ?? file.file_size ?? 0)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(file.created_at)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {file.deleted ? (
                        <Chip
                          label="Deleted"
                          color="error"
                          size="small"
                          variant="outlined"
                        />
                      ) : !isAvailable ? (
                        <Chip
                          label="Moved"
                          color="warning"
                          size="small"
                          variant="outlined"
                        />
                      ) : (
                        <Chip
                          label="Available"
                          color="success"
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                        {file.deleted || !isAvailable ? null :  (
                          <Tooltip title="Download file">
                            <IconButton
                              size="small"
                              onClick={() => onDownload(file.id, file.remote_path || '')}
                              aria-label={`Download ${file.remote_path || ''}`}
                            >
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
}

export default BackupRunFilesCard;
