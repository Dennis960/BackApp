package service

import (
	"fmt"
	"strings"
	"time"

	"backapp-server/entity"
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

// translatePattern is a helper function that translates naming pattern tokens
func translatePattern(pattern, serverName, serverHost, profileName string) string {
	now := time.Now()
	result := pattern

	// Legacy format support
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
	result = strings.ReplaceAll(result, "{DATABASE}", profileName)

	return result
}

// ServiceTranslateNamingPattern translates a naming pattern using dummy values for preview
func ServiceTranslateNamingPattern(pattern string) string {
	return translatePattern(pattern, "my-server", "192.168.1.100", "my_database")
}
