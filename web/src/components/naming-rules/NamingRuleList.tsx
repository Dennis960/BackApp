import EditIcon from '@mui/icons-material/Edit';
import {
  Box,
  Button,
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
import type { NamingRule } from '../../types';

interface NamingRuleListProps {
  rules: NamingRule[];
  onDelete: (id: number) => void;
  onEdit: (rule: NamingRule) => void;
}

function NamingRuleList({ rules, onDelete, onEdit }: NamingRuleListProps) {
  if (rules.length === 0) {
    return (
      <Box textAlign="center" py={12}>
        <Typography variant="h1" sx={{ opacity: 0.5, mb: 2 }}>
          📝
        </Typography>
        <Typography variant="h6" gutterBottom>
          No naming rules yet
        </Typography>
        <Typography color="text.secondary">
          Create rules to organize your backup files
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Pattern</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rules.map((rule) => (
            <TableRow key={rule.id} hover>
              <TableCell>
                <Typography fontWeight="medium">{rule.name}</Typography>
              </TableCell>
              <TableCell>
                <Box
                  component="code"
                  sx={{
                    bgcolor: 'grey.100',
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    fontSize: '0.875rem',
                  }}
                >
                  {rule.pattern}
                </Box>
              </TableCell>
              <TableCell>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => onEdit(rule)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={() => onDelete(rule.id)}
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
  );
}

export default NamingRuleList;
