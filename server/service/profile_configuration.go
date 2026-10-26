package service

import (
	"fmt"
	"sort"
	"strings"

	"backapp-server/entity"

	"gopkg.in/yaml.v3"
)

const profileConfigurationVersion = 1

type profileConfigurationYAML struct {
	SchemaVersion int                   `yaml:"schema_version"`
	BeforeBackup  []profileCommandYAML  `yaml:"before_backup,omitempty"`
	AfterBackup   []profileCommandYAML  `yaml:"after_backup,omitempty"`
	Transfers     []profileTransferYAML `yaml:"transfers,omitempty"`
}

type profileCommandYAML struct {
	Command          string `yaml:"command"`
	WorkingDirectory string `yaml:"working_directory"`
}

type profileTransferYAML struct {
	Source    string   `yaml:"source"`
	Recursive bool     `yaml:"recursive"`
	Exclude   []string `yaml:"exclude,omitempty"`
}

func emptyProfileConfigurationYAML() string {
	data, _ := yaml.Marshal(profileConfigurationYAML{
		SchemaVersion: profileConfigurationVersion,
		BeforeBackup: []profileCommandYAML{
			{Command: `echo "Starting backup"`, WorkingDirectory: "/tmp"},
		},
		AfterBackup: []profileCommandYAML{
			{Command: `echo "Backup finished"`, WorkingDirectory: "/tmp"},
		},
		Transfers: []profileTransferYAML{
			{Source: "/path/to/file", Recursive: false},
			{Source: "/path/to/directory", Recursive: true, Exclude: []string{"*.tmp", "*.log"}},
		},
	})
	return string(data)
}

func profileConfigurationFromEntities(commands []entity.Command, fileRules []entity.FileRule) string {
	configuration := profileConfigurationYAML{SchemaVersion: profileConfigurationVersion}
	sortedCommands := append([]entity.Command(nil), commands...)
	sort.SliceStable(sortedCommands, func(i, j int) bool {
		if sortedCommands[i].RunStage != sortedCommands[j].RunStage {
			return sortedCommands[i].RunStage < sortedCommands[j].RunStage
		}
		return sortedCommands[i].RunOrder < sortedCommands[j].RunOrder
	})
	for _, command := range sortedCommands {
		target := &configuration.BeforeBackup
		if command.RunStage == "post" {
			target = &configuration.AfterBackup
		}
		*target = append(*target, profileCommandYAML{
			Command:          command.Command,
			WorkingDirectory: command.WorkingDirectory,
		})
	}

	for _, rule := range fileRules {
		var exclude []string
		for _, pattern := range strings.Split(rule.ExcludePattern, ",") {
			if pattern = strings.TrimSpace(pattern); pattern != "" {
				exclude = append(exclude, pattern)
			}
		}
		configuration.Transfers = append(configuration.Transfers, profileTransferYAML{
			Source:    rule.RemotePath,
			Recursive: rule.Recursive,
			Exclude:   exclude,
		})
	}
	data, _ := yaml.Marshal(configuration)
	return string(data)
}

func parseProfileConfiguration(raw string) (*profileConfigurationYAML, error) {
	if strings.TrimSpace(raw) == "" {
		raw = emptyProfileConfigurationYAML()
	}
	var configuration profileConfigurationYAML
	decoder := yaml.NewDecoder(strings.NewReader(raw))
	decoder.KnownFields(true)
	if err := decoder.Decode(&configuration); err != nil {
		return nil, fmt.Errorf("invalid profile YAML: %w", err)
	}
	if configuration.SchemaVersion != profileConfigurationVersion {
		return nil, fmt.Errorf("unsupported profile YAML schema version %d", configuration.SchemaVersion)
	}
	commands := append(append([]profileCommandYAML{}, configuration.BeforeBackup...), configuration.AfterBackup...)
	for index, command := range commands {
		if strings.TrimSpace(command.Command) == "" {
			return nil, fmt.Errorf("backup command %d must not be empty", index)
		}
	}
	for index, transfer := range configuration.Transfers {
		if strings.TrimSpace(transfer.Source) == "" {
			return nil, fmt.Errorf("transfers[%d].source must not be empty", index)
		}
	}
	return &configuration, nil
}

func ServiceMigrateProfilesToYAML() error {
	if !DB.Migrator().HasTable("commands") || !DB.Migrator().HasTable("file_rules") {
		return nil
	}
	var profiles []entity.BackupProfile
	if err := DB.Find(&profiles).Error; err != nil {
		return err
	}
	for _, profile := range profiles {
		if strings.TrimSpace(profile.ConfigurationYAML) != "" {
			continue
		}
		var commands []entity.Command
		if err := DB.Where("backup_profile_id = ?", profile.ID).Order("run_stage, run_order").Find(&commands).Error; err != nil {
			return fmt.Errorf("failed to load legacy commands for profile %q: %w", profile.Name, err)
		}
		var fileRules []entity.FileRule
		if err := DB.Where("backup_profile_id = ?", profile.ID).Find(&fileRules).Error; err != nil {
			return fmt.Errorf("failed to load legacy file rules for profile %q: %w", profile.Name, err)
		}
		configuration := profileConfigurationFromEntities(commands, fileRules)
		if err := DB.Model(&profile).Update("configuration_yaml", configuration).Error; err != nil {
			return fmt.Errorf("failed to migrate profile %q: %w", profile.Name, err)
		}
	}
	if err := DB.Migrator().DropTable("file_rules", "commands"); err != nil {
		return fmt.Errorf("failed to remove legacy profile configuration tables: %w", err)
	}
	return nil
}
