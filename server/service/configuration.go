package service

import (
	"fmt"
	"strings"

	"backapp-server/entity"

	"gorm.io/gorm"
)

const configurationVersion = 1

type ConfigurationExport struct {
	Version          int                      `json:"version"`
	Servers          []entity.Server          `json:"servers"`
	StorageLocations []entity.StorageLocation `json:"storage_locations"`
	NamingRules      []entity.NamingRule      `json:"naming_rules"`
	Profiles         []entity.BackupProfile   `json:"profiles"`
}

type ConfigurationImportResult struct {
	Servers          int `json:"servers"`
	StorageLocations int `json:"storage_locations"`
	NamingRules      int `json:"naming_rules"`
	Profiles         int `json:"profiles"`
}

type ConfigurationImportImpact struct {
	Servers          int      `json:"servers"`
	StorageLocations int      `json:"storage_locations"`
	NamingRules      int      `json:"naming_rules"`
	BackupProfiles   int      `json:"backup_profiles"`
	BackupRuns       int      `json:"backup_runs"`
	BackupFiles      int      `json:"backup_files"`
	TotalSizeBytes   int64    `json:"total_size_bytes"`
	FilePaths        []string `json:"file_paths,omitempty"`
}

type ConfigurationImportMode string

const (
	ConfigurationImportOverwrite ConfigurationImportMode = "overwrite"
	ConfigurationImportAdd       ConfigurationImportMode = "add"
)

func ServiceGetConfigurationImportImpact(input *ConfigurationExport, mode ConfigurationImportMode) (*ConfigurationImportImpact, error) {
	if input == nil || input.Version != configurationVersion {
		return nil, fmt.Errorf("unsupported or missing configuration version")
	}
	if mode == ConfigurationImportAdd {
		return &ConfigurationImportImpact{FilePaths: []string{}}, nil
	}
	if mode != ConfigurationImportOverwrite {
		return nil, fmt.Errorf("unsupported configuration import mode")
	}

	impact := &ConfigurationImportImpact{FilePaths: []string{}}
	affectedProfiles := make(map[uint]bool)

	var servers []entity.Server
	if err := DB.Find(&servers).Error; err != nil {
		return nil, fmt.Errorf("failed to inspect servers: %w", err)
	}
	impact.Servers = len(servers)

	var locations []entity.StorageLocation
	if err := DB.Find(&locations).Error; err != nil {
		return nil, fmt.Errorf("failed to inspect storage locations: %w", err)
	}
	impact.StorageLocations = len(locations)

	var rules []entity.NamingRule
	if err := DB.Find(&rules).Error; err != nil {
		return nil, fmt.Errorf("failed to inspect naming rules: %w", err)
	}
	impact.NamingRules = len(rules)

	var profiles []entity.BackupProfile
	if err := DB.Find(&profiles).Error; err != nil {
		return nil, fmt.Errorf("failed to inspect backup profiles: %w", err)
	}
	for _, profile := range profiles {
		affectedProfiles[profile.ID] = true
		var runs []entity.BackupRun
		if err := DB.Where("backup_profile_id = ?", profile.ID).Find(&runs).Error; err != nil {
			return nil, err
		}
		impact.BackupRuns += len(runs)
		for _, run := range runs {
			var files []entity.BackupFile
			if err := DB.Where("backup_run_id = ?", run.ID).Find(&files).Error; err != nil {
				return nil, err
			}
			impact.BackupFiles += len(files)
			for _, file := range files {
				impact.TotalSizeBytes += file.SizeBytes
				if file.LocalPath != "" {
					impact.FilePaths = append(impact.FilePaths, file.LocalPath)
				}
			}
		}
	}

	impact.BackupProfiles = len(affectedProfiles)
	return impact, nil
}

func ServiceExportConfiguration() (*ConfigurationExport, error) {
	servers, err := ServiceExportServers()
	if err != nil {
		return nil, fmt.Errorf("failed to load servers: %w", err)
	}

	locations, err := ServiceExportStorageLocations()
	if err != nil {
		return nil, fmt.Errorf("failed to load storage locations: %w", err)
	}

	rules, err := ServiceExportNamingRules()
	if err != nil {
		return nil, fmt.Errorf("failed to load naming rules: %w", err)
	}

	profiles, err := ServiceExportBackupProfiles()
	if err != nil {
		return nil, fmt.Errorf("failed to load backup profiles: %w", err)
	}

	exported := &ConfigurationExport{
		Version:          configurationVersion,
		StorageLocations: locations,
		NamingRules:      rules,
		Profiles:         profiles,
		Servers:          servers,
	}

	return exported, nil
}

func ServiceImportConfiguration(input *ConfigurationExport, mode ConfigurationImportMode) (*ConfigurationImportResult, error) {
	if input == nil || input.Version != configurationVersion {
		return nil, fmt.Errorf("unsupported or missing configuration version")
	}
	if mode != ConfigurationImportOverwrite && mode != ConfigurationImportAdd {
		return nil, fmt.Errorf("unsupported configuration import mode")
	}
	if err := validateConfiguration(input); err != nil {
		return nil, err
	}
	if mode == ConfigurationImportAdd {
		var err error
		input, err = prepareAddedConfiguration(input)
		if err != nil {
			return nil, err
		}
	}
	if mode == ConfigurationImportOverwrite {
		if err := ServiceClearConfiguration(); err != nil {
			return nil, err
		}
	}

	result := &ConfigurationImportResult{}
	err := DB.Transaction(func(tx *gorm.DB) error {
		servers, err := ServiceImportServers(tx, input.Servers)
		if err != nil {
			return err
		}

		result.Servers = len(input.Servers)

		locations, err := ServiceImportStorageLocations(tx, input.StorageLocations)
		if err != nil {
			return err
		}
		result.StorageLocations = len(input.StorageLocations)

		rules, err := ServiceImportNamingRules(tx, input.NamingRules)
		if err != nil {
			return err
		}
		result.NamingRules = len(input.NamingRules)

		result.Profiles, err = ServiceImportBackupProfiles(tx, input.Profiles, servers, locations, rules)
		if err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	var importedProfiles []entity.BackupProfile
	if err := DB.Where("name IN ?", profileNames(input.Profiles)).Find(&importedProfiles).Error; err != nil {
		return nil, fmt.Errorf("failed to reload imported profiles: %w", err)
	}
	scheduler := GetScheduler()
	for i := range importedProfiles {
		if err := scheduler.ScheduleProfile(&importedProfiles[i]); err != nil {
			return nil, fmt.Errorf("failed to schedule imported profile %q: %w", importedProfiles[i].Name, err)
		}
	}

	return result, nil
}

func prepareAddedConfiguration(input *ConfigurationExport) (*ConfigurationExport, error) {
	output := *input
	output.Servers = append([]entity.Server(nil), input.Servers...)
	output.StorageLocations = append([]entity.StorageLocation(nil), input.StorageLocations...)
	output.NamingRules = append([]entity.NamingRule(nil), input.NamingRules...)
	output.Profiles = make([]entity.BackupProfile, len(input.Profiles))
	copy(output.Profiles, input.Profiles)

	serverNames, err := availableNames("servers", configurationServerNames(input.Servers))
	if err != nil {
		return nil, err
	}
	locationNames, err := availableNames("storage locations", configurationStorageLocationNames(input.StorageLocations))
	if err != nil {
		return nil, err
	}
	ruleNames, err := availableNames("naming rules", configurationNamingRuleNames(input.NamingRules))
	if err != nil {
		return nil, err
	}
	profileNames, err := availableNames("profiles", configurationProfileNames(input.Profiles))
	if err != nil {
		return nil, err
	}

	serverMap := make(map[string]string, len(input.Servers))
	for i := range output.Servers {
		oldName := output.Servers[i].Name
		output.Servers[i].Name = serverNames[i]
		serverMap[oldName] = output.Servers[i].Name
	}
	for i := range output.StorageLocations {
		output.StorageLocations[i].Name = locationNames[i]
	}
	for i := range output.NamingRules {
		output.NamingRules[i].Name = ruleNames[i]
	}
	for i := range output.Profiles {
		output.Profiles[i].Name = profileNames[i]
		if output.Profiles[i].Server != nil {
			server := *output.Profiles[i].Server
			server.Name = serverMap[server.Name]
			output.Profiles[i].Server = &server
		}
		if output.Profiles[i].StorageLocation != nil {
			location := *output.Profiles[i].StorageLocation
			location.Name = locationNamesForName(input.StorageLocations, locationNames, location.Name)
			output.Profiles[i].StorageLocation = &location
		}
		if output.Profiles[i].NamingRule != nil {
			rule := *output.Profiles[i].NamingRule
			rule.Name = namingRulesForName(input.NamingRules, ruleNames, rule.Name)
			output.Profiles[i].NamingRule = &rule
		}
		output.Profiles[i].Commands = append([]entity.Command(nil), input.Profiles[i].Commands...)
		output.Profiles[i].FileRules = append([]entity.FileRule(nil), input.Profiles[i].FileRules...)
	}

	return &output, nil
}

func availableNames(resource string, imported []string) ([]string, error) {
	names := make([]string, len(imported))
	used := make(map[string]bool)
	switch resource {
	case "servers":
		var rows []entity.Server
		if err := DB.Find(&rows).Error; err != nil {
			return nil, fmt.Errorf("failed to load existing servers: %w", err)
		}
		for _, row := range rows {
			used[row.Name] = true
		}
	case "storage locations":
		var rows []entity.StorageLocation
		if err := DB.Find(&rows).Error; err != nil {
			return nil, fmt.Errorf("failed to load existing storage locations: %w", err)
		}
		for _, row := range rows {
			used[row.Name] = true
		}
	case "naming rules":
		var rows []entity.NamingRule
		if err := DB.Find(&rows).Error; err != nil {
			return nil, fmt.Errorf("failed to load existing naming rules: %w", err)
		}
		for _, row := range rows {
			used[row.Name] = true
		}
	case "profiles":
		var rows []entity.BackupProfile
		if err := DB.Find(&rows).Error; err != nil {
			return nil, fmt.Errorf("failed to load existing profiles: %w", err)
		}
		for _, row := range rows {
			used[row.Name] = true
		}
	default:
		return nil, fmt.Errorf("unsupported resource type %q", resource)
	}

	for i, name := range imported {
		candidate := name
		if used[candidate] {
			base := name + " (Imported)"
			candidate = base
			for suffix := 2; used[candidate]; suffix++ {
				candidate = fmt.Sprintf("%s %d", base, suffix)
			}
		}
		names[i] = candidate
		used[candidate] = true
	}
	return names, nil
}

func configurationServerNames(rows []entity.Server) []string {
	names := make([]string, len(rows))
	for i := range rows {
		names[i] = rows[i].Name
	}
	return names
}

func configurationStorageLocationNames(rows []entity.StorageLocation) []string {
	names := make([]string, len(rows))
	for i := range rows {
		names[i] = rows[i].Name
	}
	return names
}

func configurationNamingRuleNames(rows []entity.NamingRule) []string {
	names := make([]string, len(rows))
	for i := range rows {
		names[i] = rows[i].Name
	}
	return names
}

func configurationProfileNames(rows []entity.BackupProfile) []string {
	names := make([]string, len(rows))
	for i := range rows {
		names[i] = rows[i].Name
	}
	return names
}

func locationNamesForName(rows []entity.StorageLocation, names []string, name string) string {
	for i := range rows {
		if rows[i].Name == name {
			return names[i]
		}
	}
	return name
}

func namingRulesForName(rows []entity.NamingRule, names []string, name string) string {
	for i := range rows {
		if rows[i].Name == name {
			return names[i]
		}
	}
	return name
}

func profileNames(inputs []entity.BackupProfile) []string {
	names := make([]string, 0, len(inputs))
	for _, input := range inputs {
		names = append(names, input.Name)
	}
	return names
}

func validateConfiguration(input *ConfigurationExport) error {
	serverNames := make(map[string]bool, len(input.Servers))
	for _, server := range input.Servers {
		if strings.TrimSpace(server.Name) == "" || strings.TrimSpace(server.Host) == "" || strings.TrimSpace(server.Username) == "" {
			return fmt.Errorf("server name, host, and username are required")
		}
		if server.AuthType != "password" && server.AuthType != "key" && server.AuthType != "" {
			return fmt.Errorf("server %q has unsupported authentication type", server.Name)
		}
		serverNames[server.Name] = true
	}
	locationNames := make(map[string]bool, len(input.StorageLocations))
	for _, location := range input.StorageLocations {
		if strings.TrimSpace(location.Name) == "" || strings.TrimSpace(location.BasePath) == "" {
			return fmt.Errorf("storage location name and base path are required")
		}
		locationNames[location.Name] = true
	}
	ruleNames := make(map[string]bool, len(input.NamingRules))
	for _, rule := range input.NamingRules {
		if strings.TrimSpace(rule.Name) == "" || strings.TrimSpace(rule.Pattern) == "" {
			return fmt.Errorf("naming rule name and pattern are required")
		}
		ruleNames[rule.Name] = true
	}
	for _, profile := range input.Profiles {
		if profile.Server == nil || !serverNames[profile.Server.Name] {
			return fmt.Errorf("profile %q references an unknown server", profile.Name)
		}
		if profile.StorageLocation == nil || !locationNames[profile.StorageLocation.Name] {
			return fmt.Errorf("profile %q references an unknown storage location", profile.Name)
		}
		if profile.NamingRule == nil || !ruleNames[profile.NamingRule.Name] {
			return fmt.Errorf("profile %q references an unknown naming rule", profile.Name)
		}
	}
	return nil
}

func ServiceClearConfiguration() error {
	var runs []entity.BackupRun
	if err := DB.Find(&runs).Error; err != nil {
		return fmt.Errorf("failed to load backup runs for overwrite: %w", err)
	}
	for _, run := range runs {
		if err := ServiceDeleteBackupRun(run.ID); err != nil {
			return fmt.Errorf("failed to remove backup run %d: %w", run.ID, err)
		}
	}

	var profiles []entity.BackupProfile
	if err := DB.Find(&profiles).Error; err != nil {
		return fmt.Errorf("failed to load backup profiles for overwrite: %w", err)
	}
	for _, profile := range profiles {
		if err := ServiceDeleteBackupProfile(profile.ID); err != nil {
			return fmt.Errorf("failed to remove backup profile %q: %w", profile.Name, err)
		}
	}

	for _, value := range []interface{}{&entity.Server{}, &entity.StorageLocation{}, &entity.NamingRule{}} {
		if err := DB.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(value).Error; err != nil {
			return fmt.Errorf("failed to remove existing configuration: %w", err)
		}
	}
	return nil
}
