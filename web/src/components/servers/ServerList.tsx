import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ComputerIcon from '@mui/icons-material/Computer';
import EditIcon from '@mui/icons-material/Edit';
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { Server } from '../../types';

interface ServerListProps {
  servers: Server[];
  testingConnection: number | null;
  onTestConnection: (serverId: number) => void;
  onDeleteServer: (serverId: number) => void;
  onEditServer: (server: Server) => void;
}

function ServerList({ servers, testingConnection, onTestConnection, onDeleteServer, onEditServer }: ServerListProps) {
  if (servers.length === 0) {
    return (
      <Paper data-testid="servers-table-container">
        <Box textAlign="center" py={8} data-testid="no-servers">
          <ComputerIcon sx={{ fontSize: 80, opacity: 0.5, mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No servers yet
          </Typography>
          <Typography color="text.secondary">
            Add a server to start managing backups
          </Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper data-testid="servers-table-container">
      <TableContainer>
        <Table data-testid="servers-table">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Host</TableCell>
              <TableCell>Username</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {servers.map((server) => (
              <TableRow key={server.id} hover data-testid={`server-row-${server.id}`}>
                <TableCell data-testid="server-name">{server.name}</TableCell>
                <TableCell data-testid="server-host">
                  {server.host}:{server.port}
                </TableCell>
                <TableCell data-testid="server-username">{server.username}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={testingConnection === server.id ? <CircularProgress size={16} /> : <CheckCircleIcon />}
                      onClick={() => onTestConnection(server.id)}
                      disabled={testingConnection === server.id}
                      data-testid={`test-connection-btn-${server.id}`}
                    >
                      Test
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => onEditServer(server)}
                      data-testid={`edit-server-btn-${server.id}`}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={() => onDeleteServer(server.id)}
                      data-testid={`delete-server-btn-${server.id}`}
                    >
                      Delete
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

export default ServerList;
