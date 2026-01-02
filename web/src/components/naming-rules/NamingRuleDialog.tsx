import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { useEffect, useState } from 'react';
import { namingRuleApi } from '../../api';
import type { NamingRule } from '../../types';

const AVAILABLE_TOKENS = [
  { category: 'Date/Time', tokens: ['{YYYY}', '{YY}', '{MM}', '{DD}', '{HH}', '{mm}', '{SS}'] },
  { category: 'Special', tokens: ['{TIMESTAMP}', '{date}', '{time}'] },
  { category: 'Server/Database', tokens: ['{SERVER_NAME}', '{SERVER_HOST}', '{profile}'] },
];

interface NamingRuleFormProps {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onCancel: () => void;
  initialData?: NamingRule;
  open?: boolean;
}

function NamingRuleDialog({ onSubmit, onCancel, initialData, open = true }: NamingRuleFormProps) {
  const [preview, setPreview] = useState('backup-2025-12-22_14-30-00');
  const [pattern, setPattern] = useState(initialData?.pattern || '');

  useEffect(() => {
    if (initialData?.pattern) {
      setPattern(initialData.pattern);
      updatePreview(initialData.pattern);
    }
  }, [initialData]);

  const updatePreview = async (pat: string) => {
    try {
      const translated = await namingRuleApi.translate(pat);
      setPreview(translated);
    } catch (error) {
      console.error('Error translating pattern:', error);
      setPreview('(Invalid pattern)');
    }
  };

  const handlePatternChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPattern = e.target.value;
    setPattern(newPattern);
    if (newPattern) {
      updatePreview(newPattern);
    } else {
      setPreview('');
    }
  };

  const insertToken = (token: string) => {
    const newPattern = pattern + token;
    setPattern(newPattern);
    updatePreview(newPattern);
  };

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth data-testid="naming-rule-dialog">
      <DialogTitle>{initialData ? 'Edit Naming Rule' : 'New Naming Rule'}</DialogTitle>
      <form onSubmit={onSubmit}>
        <DialogContent>
          <Stack spacing={2.5}>
            <TextField
              name="name"
              label="Name"
              required
              fullWidth
              placeholder="Date + Profile"
              defaultValue={initialData?.name || ''}
              data-testid="input-name"
            />

            <TextField
              name="pattern"
              label="Pattern"
              required
              fullWidth
              placeholder="backup-{YYYY}-{MM}-{DD}_{HH}-{mm}-{SS}"
              value={pattern}
              onChange={handlePatternChange}
              multiline
              rows={2}
              data-testid="input-pattern"
            />

            {preview && (
              <Alert severity="info">
                <Typography variant="body2" fontWeight="bold">
                  Preview
                </Typography>
                <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
                  {preview}
                </Typography>
              </Alert>
            )}

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                Available Tokens
              </Typography>
              <Stack spacing={1.5}>
                {AVAILABLE_TOKENS.map((group) => (
                  <Box key={group.category}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                      {group.category}
                    </Typography>
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                      {group.tokens.map((token) => (
                        <Chip
                          key={token}
                          label={token}
                          size="small"
                          onClick={() => insertToken(token)}
                          variant="outlined"
                          sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
                        />
                      ))}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" data-testid="save-naming-rule-btn">
            {initialData ? 'Update Rule' : 'Save Rule'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default NamingRuleDialog;
