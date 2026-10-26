export const defaultProfileConfigurationYAML = `schema_version: 1
before_backup:
  - command: "echo \\"Starting backup\\""
    working_directory: "/tmp"
after_backup:
  - command: "echo \\"Backup finished\\""
    working_directory: "/tmp"
transfers:
  - source: "/path/to/file"
    recursive: false
  - source: "/path/to/directory"
    recursive: true
    exclude:
      - "*.tmp"
      - "*.log"
`;
