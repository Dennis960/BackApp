import type { Template } from './types';
import { dirname, filename } from './types';

interface PostgresDockerComposeValues {
  target: {
    dockerComposePath: string;
    serviceName: string;
    databaseUsername: string;
    databaseName: string;
    dumpPath: string;
  };
  profile: {
    profileName: string;
    storageLocationId: number;
    namingRuleId: number;
    scheduleCron: string;
  };
}

export const postgresDockerComposeTemplate: Template<PostgresDockerComposeValues> = {
  name: 'PostgreSQL via Docker Compose',
  description: 'Backup a PostgreSQL database running with Docker Compose; generates pg_dump, downloads it, then cleans up.',

  steps: [
    {
      id: 'target',
      title: 'Target',
      description: 'Choose the docker-compose service that is running the PostgreSQL database.',
      inputs: [
        {
          id: 'dockerComposePath',
          config: {
            type: 'path',
            pathLocation: 'remote',
            directories: true,
            title: 'Docker Compose Path',
            description: 'Absolute path to docker-compose.yml on the selected server.',
            placeholder: '/srv/app/docker-compose.yml',
            required: true,
          },
        },
        {
          id: 'serviceName',
          config: {
            type: 'string',
            title: 'Service Name',
            description: 'The name of the service that runs PostgreSQL in your docker-compose.yml.',
            placeholder: 'db',
            required: true,
          },
        },
        {
          id: 'databaseUsername',
          config: {
            type: 'string',
            title: 'Database User',
            description: 'User used by pg_dump.',
            required: true,
          },
        },
        {
          id: 'databaseName',
          config: {
            type: 'string',
            title: 'Database Name',
            description: 'The database name passed to pg_dump.',
            required: true,
          },
        },
        {
          id: 'dumpPath',
          config: {
            type: 'string',
            title: 'Temporary Dump File Path',
            description: 'Absolute path on the server and in the docker container where the SQL dump will be written.',
            default: '/tmp/db_backup.sql',
            required: true,
          },
        },
      ],
    },
    {
      id: 'profile',
      title: 'Profile',
      description: 'Choose storage and naming rule, and optionally configure a schedule.',
      inputs: [
        {
          id: 'profileName',
          config: {
            type: 'string',
            title: 'Profile Name',
            description: 'A descriptive name for this backup profile.',
            required: true,
          },
        },
        {
          id: 'storageLocationId',
          config: {
            type: 'storage_location',
            title: 'Storage Location',
            description: 'Select the storage location for this profile.',
            required: true,
          },
        },
        {
          id: 'namingRuleId',
          config: {
            type: 'naming_rule',
            title: 'Naming Rule',
            description: 'Select how backup files should be named.',
            required: true,
          },
        },
        {
          id: 'scheduleCron',
          config: {
            type: 'cron',
            title: 'Schedule (Cron Expression)',
            description: 'If set, the backup will run automatically based on this cron expression.',
          },
        },
      ],
    },
  ],

  buildResult: (ctx) => {
    const { dockerComposePath, serviceName, databaseUsername, databaseName } = ctx.values.target;
    const { profileName, storageLocationId, namingRuleId, scheduleCron } = ctx.values.profile;

    const dockerComposeFolder = dirname(dockerComposePath);
    const dockerComposeFilename = filename(dockerComposePath);

    return {
      profile: {
        name: profileName,
        server_id: ctx.server.id,
        storage_location_id: storageLocationId,
        naming_rule_id: namingRuleId,
        schedule_cron: scheduleCron,
        enabled: false,
      },
      commands: [
        {
          run_stage: 'pre',
          command: `docker compose -f ${dockerComposeFilename} exec -T ${serviceName} pg_dump -U ${databaseUsername} -d ${databaseName} -f ${ctx.values.target.dumpPath}`,
          working_directory: dockerComposeFolder,
        },
        {
          run_stage: 'pre',
          command: `docker cp $(docker compose -f ${dockerComposeFilename} ps -q ${serviceName}):${ctx.values.target.dumpPath} ${ctx.values.target.dumpPath}`,
          working_directory: dockerComposeFolder,
        },
        {
          run_stage: 'pre',
          command: `docker compose -f ${dockerComposeFilename} exec -T ${serviceName} rm -f ${ctx.values.target.dumpPath}`,
          working_directory: dockerComposeFolder,
        },
        {
          run_stage: 'post',
          command: `rm -f ${ctx.values.target.dumpPath}`,
        },
      ],
      fileRules: [
        {
          remote_path: ctx.values.target.dumpPath,
          recursive: false,
        },
      ],
    };
  },
};
