package service

import (
	"fmt"
	"strings"
	"time"

	"backapp-server/entity"

	"gorm.io/gorm"
)

func ServiceListNamingRules() ([]entity.NamingRule, error) {
	var rules []entity.NamingRule
	if err := DB.Find(&rules).Error; err != nil {
		return nil, err
	}
	return rules, nil
}

func ServiceCreateNamingRule(input *entity.NamingRule) (*entity.NamingRule, error) {
	if err := DB.Create(input).Error; err != nil {
		return nil, err
	}

	return input, nil
}

func ServiceExportNamingRules() ([]entity.NamingRule, error) {
	return ServiceListNamingRules()
}

func ServiceImportNamingRules(db *gorm.DB, inputs []entity.NamingRule) (map[string]uint, error) {
	ids := make(map[string]uint, len(inputs))
	for _, input := range inputs {
		rule, err := ServiceUpsertNamingRule(db, &input)
		if err != nil {
			return nil, fmt.Errorf("failed to import naming rule %q: %w", input.Name, err)
		}
		ids[input.Name] = rule.ID
	}
	return ids, nil
}

func ServiceUpsertNamingRule(db *gorm.DB, input *entity.NamingRule) (*entity.NamingRule, error) {
	var rule entity.NamingRule
	query := db.Where("name = ?", input.Name).First(&rule)
	if query.Error != nil && query.Error != gorm.ErrRecordNotFound {
		return nil, query.Error
	}
	rule.Name = input.Name
	rule.Pattern = input.Pattern
	if query.Error == gorm.ErrRecordNotFound {
		return &rule, db.Create(&rule).Error
	}
	return &rule, db.Save(&rule).Error
}

func ServiceUpdateNamingRule(id uint, input *entity.NamingRule) (*entity.NamingRule, error) {
	var rule entity.NamingRule
	if err := DB.First(&rule, id).Error; err != nil {
		return nil, err
	}
	if input.Name != "" {
		rule.Name = input.Name
	}
	if input.Pattern != "" {
		rule.Pattern = input.Pattern
	}
	if err := DB.Save(&rule).Error; err != nil {
		return nil, err
	}
	return &rule, nil
}

func ServiceDeleteNamingRule(id string) error {
	return DB.Delete(&entity.NamingRule{}, "id = ?", id).Error
}

// ServiceGetNamingRuleDeletionImpact returns the backup data affected by deleting a naming rule.
func ServiceGetNamingRuleDeletionImpact(id uint) (*DeletionImpact, error) {
	var rule entity.NamingRule
	if err := DB.First(&rule, id).Error; err != nil {
		return nil, err
	}

	var profiles []entity.BackupProfile
	if err := DB.Where("naming_rule_id = ?", id).Find(&profiles).Error; err != nil {
		return nil, err
	}
	impact := &DeletionImpact{BackupProfiles: len(profiles)}
	for _, profile := range profiles {
		profileImpact, err := ServiceGetBackupProfileDeletionImpact(profile.ID)
		if err != nil {
			return nil, err
		}
		impact.BackupRuns += profileImpact.BackupRuns
		impact.BackupFiles += profileImpact.BackupFiles
		impact.TotalSizeBytes += profileImpact.TotalSizeBytes
		impact.FilePaths = append(impact.FilePaths, profileImpact.FilePaths...)
	}
	return impact, nil
}

// translatePattern is a helper function that translates naming pattern tokens
func translatePattern(pattern, serverName, serverHost, profileName string) string {
	now := time.Now()
	result := pattern

	// Common date/time tokens
	result = strings.ReplaceAll(result, "{date}", now.Format("2006-01-02"))
	result = strings.ReplaceAll(result, "{time}", now.Format("15-04-05"))
	result = strings.ReplaceAll(result, "{profile}", profileName)

	// Granular date/time tokens (case-sensitive)
	result = strings.ReplaceAll(result, "{YYYY}", now.Format("2006"))
	result = strings.ReplaceAll(result, "{YY}", now.Format("06"))
	result = strings.ReplaceAll(result, "{MM}", now.Format("01"))
	result = strings.ReplaceAll(result, "{DD}", now.Format("02"))
	result = strings.ReplaceAll(result, "{HH}", now.Format("15"))
	result = strings.ReplaceAll(result, "{mm}", now.Format("04"))
	result = strings.ReplaceAll(result, "{SS}", now.Format("05"))

	// Timestamp support (Unix timestamp in seconds)
	result = strings.ReplaceAll(result, "{TIMESTAMP}", fmt.Sprintf("%d", now.Unix()))

	// Server and database variables
	result = strings.ReplaceAll(result, "{SERVER_NAME}", serverName)
	result = strings.ReplaceAll(result, "{SERVER_HOST}", serverHost)

	return result
}

// ServiceTranslateNamingPattern translates a naming pattern using dummy values for preview
func ServiceTranslateNamingPattern(pattern string) string {
	return translatePattern(pattern, "my-server", "192.168.1.100", "my_database")
}
