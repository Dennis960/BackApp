import { Close as CloseIcon, Storage as StorageIcon } from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import GenericTemplateWizard from '../templates/GenericTemplateWizard';

interface TemplateSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  onTemplateSelected: (templateType: 'scratch' | 'postgres-docker') => void;
  onSuccess: () => void;
}

type TemplateType = 'scratch' | null;

interface ServerTemplateItem {
  id: string;
  name: string;
  description?: string;
}

function TemplateSelectionDialog({
  open,
  onClose,
  onTemplateSelected,
  onSuccess,
}: TemplateSelectionDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>(null);
  const [templates, setTemplates] = useState<ServerTemplateItem[]>([]);
  const [showGenericTemplate, setShowGenericTemplate] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    // Load available templates from server
    (async () => {
      try {
        const res = await fetch('/api/v1/templates', { cache: 'no-cache' });
        const items = await res.json();
        setTemplates(Array.isArray(items) ? items : []);
      } catch (e) {
        console.error('Failed to load templates', e);
        setTemplates([]);
      }
    })();
  }, [open]);

  const handleTemplateSelect = (template: TemplateType) => {
    setSelectedTemplate(template);
    if (template === 'scratch') {
      onTemplateSelected('scratch');
      onClose();
    }
  };

  const handleServerTemplateClick = (id: string) => {
    setSelectedTemplateId(id);
    setShowGenericTemplate(true);
  };

  const handleClose = () => {
    setSelectedTemplate(null);
    setSelectedTemplateId(null);
    setShowGenericTemplate(false);
    onClose();
  };

  const handleGenericSuccess = () => {
    setShowGenericTemplate(false);
    onSuccess();
    handleClose();
  };

  return (
    <>
      <Dialog open={open && !showGenericTemplate} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            Create Backup Profile
            <IconButton onClick={handleClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} mb={3}>
              Choose how you want to create your backup profile
            </Typography>

            <Stack spacing={2}>
              {/* From Scratch */}
              <Card
                sx={{
                  border: '2px solid',
                  borderColor: selectedTemplate === 'scratch' ? 'primary.main' : 'divider',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: 'primary.main',
                    boxShadow: 1,
                  },
                }}
              >
                <CardActionArea onClick={() => handleTemplateSelect('scratch')}>
                  <CardContent>
                    <Typography variant="h6" fontWeight={600} mb={1}>
                      From Scratch
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Create a custom backup profile with your own commands and file rules
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>

              {/* Server-provided Templates */}
              {templates.map((t) => (
                <Card
                  key={t.id}
                  sx={{
                    border: '2px solid',
                    borderColor: 'divider',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: 'primary.main',
                      boxShadow: 1,
                    },
                  }}
                >
                  <CardActionArea onClick={() => handleServerTemplateClick(t.id)}>
                    <CardContent>
                      <Box display="flex" alignItems="flex-start" gap={2}>
                        <StorageIcon sx={{ fontSize: 32, color: 'primary.main', mt: 0.5 }} />
                        <Box flex={1}>
                          <Typography variant="h6" fontWeight={600} mb={0.5}>
                            {t.name}
                          </Typography>
                          {t.description && (
                            <Typography variant="body2" color="text.secondary">
                              {t.description}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              ))}
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {showGenericTemplate && selectedTemplateId && (
        <GenericTemplateWizard
          open={showGenericTemplate}
          onClose={() => setShowGenericTemplate(false)}
          onSuccess={handleGenericSuccess}
          templateUrl={`/api/v1/templates/${selectedTemplateId}`}
        />
      )}
    </>
  );
}

export default TemplateSelectionDialog;
