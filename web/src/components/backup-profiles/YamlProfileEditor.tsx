import Editor, { type OnMount } from '@monaco-editor/react';
import { Alert, Box, Paper, Stack, Typography } from '@mui/material';
import type * as Monaco from 'monaco-editor';
import { useRef } from 'react';

const yamlDocumentation = (
  <>
    <Typography variant="subtitle2" gutterBottom>
      Profile YAML
    </Typography>
    <Typography variant="body2" color="text.secondary">
      Commands in each section run from top to bottom. Transfers use paths on the remote server.
    </Typography>
    <Typography variant="body2" sx={{ mt: 1 }}>
      <strong>schema_version</strong> is required and must be <code>1</code>.
    </Typography>
    <Typography variant="body2" sx={{ mt: 1 }}>
      <strong>before_backup</strong> and <strong>after_backup</strong> are lists of commands.
      Each command supports:
    </Typography>
    <Box component="ul" sx={{ mt: 0.5, mb: 0, pl: 2.5, fontSize: 13 }}>
      <li><strong>command</strong>: required shell command to run on the remote server.</li>
      <li><strong>working_directory</strong>: optional remote directory in which the command runs.</li>
    </Box>
    <Typography variant="body2" sx={{ mt: 1 }}>
      <strong>transfers</strong> is a list of remote files or directories to copy. Each transfer supports:
    </Typography>
    <Box component="ul" sx={{ mt: 0.5, mb: 0, pl: 2.5, fontSize: 13 }}>
      <li><strong>source</strong>: required remote file or directory path.</li>
      <li><strong>recursive</strong>: required boolean. Set to <code>true</code> for directories.</li>
      <li><strong>exclude</strong>: optional list of patterns to omit, such as <code>*.log</code> or <code>cache/**</code>.</li>
    </Box>
    <Box component="pre" sx={{ mt: 1, mb: 0, fontSize: 12, overflow: 'auto' }}>
{`schema_version: 1
before_backup:
  - command: "pg_dump mydb > /var/backups/mydb.sql"
    working_directory: "/opt/myapp"
after_backup: []
transfers:
  - source: "/var/lib/myapp"
    recursive: true
    exclude:
      - "*.tmp"`}
    </Box>
    <Typography variant="caption" color="text.secondary">
      Use quotes for values containing special YAML characters. Leave out optional lists when they are not needed.
    </Typography>
  </>
);

interface YamlProfileEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  error?: string | null;
  height?: string;
}

function YamlProfileEditor({ value, onChange, readOnly = false, error, height = '420px' }: YamlProfileEditorProps) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monaco.languages.registerCompletionItemProvider('yaml', {
      triggerCharacters: [':', ' ', '-'],
      provideCompletionItems: (_model: Monaco.editor.ITextModel, _position: Monaco.Position) => {
        const suggestions = [
          ['schema_version', 'The profile configuration schema version. Use 1.'],
          ['before_backup', 'Commands executed before transfers.'],
          ['after_backup', 'Commands executed after transfers.'],
          ['transfers', 'Remote files and directories to transfer.'],
          ['command', 'Shell command to execute.'],
          ['working_directory', 'Optional remote working directory.'],
          ['source', 'Remote file or directory path.'],
          ['recursive', 'Whether directories are copied recursively.'],
          ['exclude', 'Optional exclusion pattern.'],
        ].map(([label, documentation]) => ({
          label,
          kind: monaco.languages.CompletionItemKind.Property,
          insertText: `${label}: `,
          documentation,
        }));
        return { suggestions };
      },
    });
  };

  return (
    <Stack spacing={1.5}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'stretch', flexDirection: { xs: 'column', lg: 'row' } }}>
        <Paper variant="outlined" sx={{ flex: 1, overflow: 'hidden' }}>
          <Editor
            height={height}
            language="yaml"
            theme="vs-light"
            value={value}
            onChange={(nextValue) => onChange(nextValue ?? '')}
            onMount={handleMount}
            options={{
              minimap: { enabled: false },
              tabSize: 2,
              wordWrap: 'on',
              readOnly,
              automaticLayout: true,
            }}
          />
        </Paper>
        <Paper variant="outlined" sx={{ width: { xs: 'auto', lg: 300 }, p: 2 }}>
          {yamlDocumentation}
        </Paper>
      </Box>
      {error && <Alert severity="error">{error}</Alert>}
    </Stack>
  );
}

export default YamlProfileEditor;
