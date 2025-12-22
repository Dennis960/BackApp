import ArticleIcon from '@mui/icons-material/Article';
import { Box, Card, CardContent, Chip, Paper, Typography } from '@mui/material';
import type { BackupRunLog } from '../../types';

interface BackupRunLogsCardProps {
  logs: BackupRunLog[];
  isRunning: boolean;
}

function BackupRunLogsCard({ logs, isRunning }: BackupRunLogsCardProps) {
  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR':
        return '#f44336';
      case 'WARNING':
        return '#ff9800';
      case 'INFO':
        return '#2196f3';
      case 'DEBUG':
        return '#9e9e9e';
      default:
        return '#000';
    }
  };

  const formatLogTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const time = date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const ms = date.getMilliseconds().toString().padStart(3, '0');
    return `${time}.${ms}`;
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <ArticleIcon />
          <Typography variant="h6">
            Backup Logs ({logs.length})
          </Typography>
          {isRunning && (
            <Chip
              label="Live"
              color="success"
              size="small"
              sx={{ ml: 1 }}
            />
          )}
        </Box>

        {logs.length === 0 ? (
          <Box textAlign="center" py={4}>
            <Typography color="text.secondary">
              {isRunning
                ? 'Waiting for logs...'
                : 'No logs available for this backup run'}
            </Typography>
          </Box>
        ) : (
          <Paper
            variant="outlined"
            sx={{
              bgcolor: '#1e1e1e',
              color: '#d4d4d4',
              maxHeight: 500,
              overflow: 'auto',
              fontFamily: 'monospace',
              fontSize: '0.8125rem',
            }}
          >
            <Box p={2}>
              {logs.map((log) => (
                <Box
                  key={log.id}
                  display="flex"
                  gap={2}
                  py={0.5}
                  sx={{
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.05)',
                    },
                  }}
                >
                  <Typography
                    component="span"
                    sx={{
                      color: '#858585',
                      minWidth: 100,
                      flexShrink: 0,
                    }}
                  >
                    {formatLogTimestamp(log.timestamp)}
                  </Typography>
                  <Typography
                    component="span"
                    sx={{
                      color: getLogLevelColor(log.level),
                      fontWeight: 'bold',
                      minWidth: 70,
                      flexShrink: 0,
                    }}
                  >
                    [{log.level}]
                  </Typography>
                  <Typography
                    component="span"
                    sx={{ flex: 1, wordBreak: 'break-word' }}
                  >
                    {log.message}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        )}
      </CardContent>
    </Card>
  );
}

export default BackupRunLogsCard;
