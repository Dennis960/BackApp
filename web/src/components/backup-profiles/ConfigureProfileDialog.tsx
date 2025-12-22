import { Add, Close, Delete } from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { commandApi, fileRuleApi } from '../../api';
import type { Command, FileRule } from '../../types';
import { TabPanel } from '../common';

interface ConfigureProfileDialogProps {
  open: boolean;
  profileId: number;
  onClose: () => void;
}

function ConfigureProfileDialog({ open, profileId, onClose }: ConfigureProfileDialogProps) {
  const [tab, setTab] = useState(0);
  const [commands, setCommands] = useState<Command[]>([]);
  const [fileRules, setFileRules] = useState<FileRule[]>([]);
  const [showCommandForm, setShowCommandForm] = useState(false);
  const [showFileRuleForm, setShowFileRuleForm] = useState(false);

  useEffect(() => {
    if (open) {
      loadCommands();
      loadFileRules();
    }
  }, [open, profileId]);

  const loadCommands = async () => {
    try {
      const data = await commandApi.listByProfile(profileId);
      setCommands(data || []);
    } catch (error) {
      console.error('Error loading commands:', error);
    }
  };

  const loadFileRules = async () => {
    try {
      const data = await fileRuleApi.listByProfile(profileId);
      setFileRules(data || []);
    } catch (error) {
      console.error('Error loading file rules:', error);
    }
  };

  const handleAddCommand = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      command: formData.get('command') as string,
      run_stage: formData.get('run_stage') as 'pre' | 'post',
      run_order: parseInt(formData.get('run_order') as string),
    };

    try {
      await commandApi.create(profileId, data);
      setShowCommandForm(false);
      loadCommands();
      e.currentTarget.reset();
    } catch (error) {
      console.error('Error creating command:', error);
    }
  };

  const handleDeleteCommand = async (id: number) => {
    if (!confirm('Delete this command?')) return;
    try {
      await commandApi.delete(id);
      loadCommands();
    } catch (error) {
      console.error('Error deleting command:', error);
    }
  };

  const handleAddFileRule = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      remote_path: formData.get('remote_path') as string,
      recursive: formData.get('recursive') === 'on',
      exclude_pattern: formData.get('exclude_pattern') as string || undefined,
    };

    try {
      await fileRuleApi.create(profileId, data);
      setShowFileRuleForm(false);
      loadFileRules();
      e.currentTarget.reset();
    } catch (error) {
      console.error('Error creating file rule:', error);
    }
  };

  const handleDeleteFileRule = async (id: number) => {
    if (!confirm('Delete this file rule?')) return;
    try {
      await fileRuleApi.delete(id);
      loadFileRules();
    } catch (error) {
      console.error('Error deleting file rule:', error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          Configure Backup Profile
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Tabs value={tab} onChange={(_, newValue) => setTab(newValue)}>
          <Tab label="Commands" />
          <Tab label="File Rules" />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="body2" color="text.secondary">
              Commands run before (pre) and after (post) file transfer
            </Typography>
            <Button
              size="small"
              startIcon={<Add />}
              onClick={() => setShowCommandForm(!showCommandForm)}
            >
              Add Command
            </Button>
          </Box>

          {showCommandForm && (
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <form onSubmit={handleAddCommand}>
                  <Stack spacing={2}>
                    <TextField
                      name="command"
                      label="Command"
                      required
                      fullWidth
                      placeholder="pg_dump mydb > /tmp/backup.sql"
                    />
                    <TextField
                      name="run_stage"
                      label="Stage"
                      select
                      required
                      defaultValue="pre"
                    >
                      <MenuItem value="pre">Pre-backup</MenuItem>
                      <MenuItem value="post">Post-backup</MenuItem>
                    </TextField>
                    <TextField
                      name="run_order"
                      label="Order"
                      type="number"
                      required
                      defaultValue={1}
                      helperText="Execution order (lower numbers run first)"
                    />
                    <Box display="flex" gap={1}>
                      <Button type="submit" variant="contained" size="small">
                        Add
                      </Button>
                      <Button size="small" onClick={() => setShowCommandForm(false)}>
                        Cancel
                      </Button>
                    </Box>
                  </Stack>
                </form>
              </CardContent>
            </Card>
          )}

          <Stack spacing={1}>
            {commands.length === 0 ? (
              <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                No commands configured
              </Typography>
            ) : (
              commands.map((cmd) => (
                <Card key={cmd.id} variant="outlined">
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                      <Box flex={1}>
                        <Box display="flex" gap={1} mb={1}>
                          <Chip
                            label={cmd.run_stage.toUpperCase()}
                            size="small"
                            color={cmd.run_stage === 'pre' ? 'primary' : 'secondary'}
                          />
                          <Chip label={`Order: ${cmd.run_order}`} size="small" variant="outlined" />
                        </Box>
                        <Typography
                          variant="body2"
                          fontFamily="monospace"
                          sx={{ bgcolor: 'grey.100', p: 1, borderRadius: 1 }}
                        >
                          {cmd.command}
                        </Typography>
                      </Box>
                      <IconButton size="small" color="error" onClick={() => handleDeleteCommand(cmd.id)}>
                        <Delete />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              ))
            )}
          </Stack>
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="body2" color="text.secondary">
              Define which files and directories to backup
            </Typography>
            <Button
              size="small"
              startIcon={<Add />}
              onClick={() => setShowFileRuleForm(!showFileRuleForm)}
            >
              Add File Rule
            </Button>
          </Box>

          {showFileRuleForm && (
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <form onSubmit={handleAddFileRule}>
                  <Stack spacing={2}>
                    <TextField
                      name="remote_path"
                      label="Remote Path"
                      required
                      fullWidth
                      placeholder="/var/www/myapp"
                    />
                    <FormControlLabel
                      control={<Checkbox name="recursive" defaultChecked />}
                      label="Recursive (include subdirectories)"
                    />
                    <TextField
                      name="exclude_pattern"
                      label="Exclude Pattern"
                      fullWidth
                      placeholder="*.log,node_modules,*.tmp"
                      helperText="Comma-separated patterns to exclude"
                    />
                    <Box display="flex" gap={1}>
                      <Button type="submit" variant="contained" size="small">
                        Add
                      </Button>
                      <Button size="small" onClick={() => setShowFileRuleForm(false)}>
                        Cancel
                      </Button>
                    </Box>
                  </Stack>
                </form>
              </CardContent>
            </Card>
          )}

          <Stack spacing={1}>
            {fileRules.length === 0 ? (
              <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                No file rules configured
              </Typography>
            ) : (
              fileRules.map((rule) => (
                <Card key={rule.id} variant="outlined">
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                      <Box flex={1}>
                        <Typography
                          variant="body1"
                          fontFamily="monospace"
                          fontWeight="medium"
                        >
                          {rule.remote_path}
                        </Typography>
                        <Box display="flex" gap={1} mt={1}>
                          <Chip
                            label={rule.recursive ? 'Recursive' : 'Non-recursive'}
                            size="small"
                            variant="outlined"
                          />
                          {rule.exclude_pattern && (
                            <Chip
                              label={`Exclude: ${rule.exclude_pattern}`}
                              size="small"
                              color="warning"
                            />
                          )}
                        </Box>
                      </Box>
                      <IconButton size="small" color="error" onClick={() => handleDeleteFileRule(rule.id)}>
                        <Delete />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              ))
            )}
          </Stack>
        </TabPanel>
      </DialogContent>
    </Dialog>
  );
}

export default ConfigureProfileDialog;
