import GenericTemplateWizard from '../GenericTemplateWizard';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function PostgresDockerComposeWizard({ open, onClose, onSuccess }: Props) {
  return (
    <GenericTemplateWizard
      open={open}
      onClose={onClose}
      onSuccess={onSuccess}
      templateUrl="/api/v1/templates/postgres-docker-compose"
    />
  );
}

export default PostgresDockerComposeWizard;
