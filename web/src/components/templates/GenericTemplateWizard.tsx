import { Close as CloseIcon } from '@mui/icons-material';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, Step, StepLabel, Stepper, TextField, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { backupProfileApi, commandApi, namingRuleApi, serverApi, storageLocationApi, fileRuleApi } from '../../api';
import type { NamingRule, Server, StorageLocation } from '../../types';
import { interpolate, computeDerived } from '../../templates/templateEngine';
import PathPickerField from '../common/PathPickerField';
import { NamingRuleSelector, StorageLocationSelector, CronTextField, ProfileNameTextField } from '../forms';

interface GenericTemplateWizardProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  templateUrl: string; // e.g., "/templates/postgres-docker-compose.json"
}

interface TemplateConfig {
  id: string;
  name: string;
  steps: any[];
  result: {
    profile: Record<string, any>;
    commands?: Array<{ run_stage: 'pre' | 'post'; command: string }>;
    file_rules?: Array<{ remote_path: string; recursive?: boolean; exclude_pattern?: string }>;
  };
  computed?: Record<string, string>;
}

export default function GenericTemplateWizard({ open, onClose, onSuccess, templateUrl }: GenericTemplateWizardProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [template, setTemplate] = useState<TemplateConfig | null>(null);

  const [servers, setServers] = useState<Server[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  const [namingRules, setNamingRules] = useState<NamingRule[]>([]);

  // Collected variables across steps
  const [vars, setVars] = useState<Record<string, any>>({});

  const steps = useMemo(() => template?.steps?.map((s) => s.title) || [], [template]);

  useEffect(() => {
    if (open) {
      loadTemplate();
      loadRefs();
    }
  }, [open]);

  const loadTemplate = async () => {
    try {
      const res = await fetch(templateUrl, { cache: 'no-cache' });
      const json = await res.json();
      setTemplate(json);
      setActiveStep(0);
      setVars({});
      setError(null);
    } catch (e) {
      console.error('Failed to load template', e);
      setError('Failed to load template');
    }
  };

  const loadRefs = async () => {
    try {
      const [serversData, storageData, namingData] = await Promise.all([
        serverApi.list(),
        storageLocationApi.list(),
        namingRuleApi.list(),
      ]);
      setServers(serversData || []);
      setStorageLocations(storageData || []);
      setNamingRules(namingData || []);
    } catch (e) {
      console.error('Failed to load refs', e);
    }
  };

  const setVar = (key: string, value: any) => setVars((v) => ({ ...v, [key]: value }));

  const currentStep = template?.steps?.[activeStep];

  const canNext = () => {
    if (!currentStep) return false;
    if (currentStep.type === 'selectServerRemotePath') {
      return !!vars.server && !!vars.dockerComposePath;
    }
    if (currentStep.type === 'form') {
      return true; // basic checks handled by UI
    }
    if (currentStep.type === 'profileDetails') {
      return !!vars.profileName && !!vars.storageLocationId && !!vars.namingRuleId && !!vars.server;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!template) return;
    setLoading(true);
    setError(null);
    try {
      let allVars = { ...vars };
      if (template.computed) {
        allVars = { ...allVars, ...computeDerived(allVars, template.computed) };
      }

      // Create profile
      const profilePayload = JSON.parse(interpolate(JSON.stringify(template.result.profile), allVars));
      // Coerce numeric IDs to numbers for backend schema
      for (const key of ['server_id', 'storage_location_id', 'naming_rule_id']) {
        const v = (profilePayload as any)[key];
        if (typeof v === 'string') {
          const num = parseInt(v, 10);
          if (!Number.isNaN(num)) {
            (profilePayload as any)[key] = num;
          }
        }
      }
      const newProfile = await backupProfileApi.create(profilePayload);

      // Commands
      const cmds = template.result.commands || [];
      let orderMap: Record<'pre' | 'post', number> = { pre: 0, post: 0 };
      for (const c of cmds) {
        const cmdStr = interpolate(c.command, allVars);
        orderMap[c.run_stage] += 1;
        await commandApi.create(newProfile.id, {
          command: cmdStr,
          run_stage: c.run_stage,
          run_order: orderMap[c.run_stage],
        });
      }

      // File rules
      for (const fr of template.result.file_rules || []) {
        const remote_path = interpolate(fr.remote_path, allVars);
        await fileRuleApi.create(newProfile.id, {
          remote_path,
          recursive: fr.recursive ?? false,
          exclude_pattern: fr.exclude_pattern ? interpolate(fr.exclude_pattern, allVars) : undefined,
        });
      }

      onSuccess();
      onClose();
    } catch (e) {
      console.error('Template execution failed', e);
      setError('Failed to create backup profile from template');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          {template?.name || 'Template Wizard'}
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          <Stepper activeStep={activeStep} sx={{ mb: 2 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && <Alert severity="error">{error}</Alert>}

          {currentStep?.type === 'selectServerRemotePath' && (
            <>
              <Typography variant="subtitle1" fontWeight={600}>Server</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {servers.map((s) => (
                  <Button
                    key={s.id}
                    variant={vars.server?.id === s.id ? 'contained' : 'outlined'}
                    onClick={() => setVar('server', s)}
                    size="small"
                  >
                    {s.name}
                  </Button>
                ))}
              </Stack>
              <Typography variant="subtitle1" fontWeight={600}>Docker Compose Path</Typography>
              <PathPickerField
                label="Path"
                value={vars.dockerComposePath || ''}
                onChange={(v) => setVar('dockerComposePath', v)}
                serverId={vars.server?.id}
                allowDirectories={false}
              />
            </>
          )}

          {currentStep?.type === 'form' && (
            <>
              {(currentStep.fields || []).map((f: any) => (
                <TextField
                  key={f.name}
                  label={f.label}
                  type={f.type || 'text'}
                  required={!!f.required}
                  value={vars[f.name] ?? f.default ?? ''}
                  onChange={(e) => setVar(f.name, e.target.value)}
                  fullWidth
                />
              ))}
            </>
          )}

          {currentStep?.type === 'profileDetails' && (
            <>
              <ProfileNameTextField value={vars.profileName || ''} onChange={(v) => setVar('profileName', v)} />
              <StorageLocationSelector
                value={vars.storageLocationId}
                onChange={(v) => setVar('storageLocationId', v)}
                storageLocations={storageLocations}
                showPath
              />
              <NamingRuleSelector
                value={vars.namingRuleId}
                onChange={(v) => setVar('namingRuleId', v)}
                namingRules={namingRules}
                showPattern
                showPreview
              />
              <CronTextField value={vars.scheduleCron || ''} onChange={(v) => setVar('scheduleCron', v)} />
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        {activeStep > 0 && (
          <Button onClick={() => setActiveStep(activeStep - 1)} disabled={loading}>Back</Button>
        )}
        {activeStep < (template?.steps?.length || 0) - 1 && (
          <Button onClick={() => setActiveStep(activeStep + 1)} variant="contained" disabled={!canNext() || loading}>Next</Button>
        )}
        {activeStep === (template?.steps?.length || 0) - 1 && (
          <Button onClick={handleSubmit} variant="contained" disabled={loading || !canNext()}>
            {loading ? <CircularProgress size={24} /> : 'Create Profile'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
