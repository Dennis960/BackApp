package service

import "backapp-server/entity"

func ServiceListFileRulesForProfile(profileID int) ([]entity.FileRule, error) {
	var rules []entity.FileRule
	if err := DB.Where("backup_profile_id = ?", profileID).Find(&rules).Error; err != nil {
		return nil, err
	}
	return rules, nil
}

func ServiceCreateFileRule(input *entity.FileRule) (*entity.FileRule, error) {
	if err := DB.Create(input).Error; err != nil {
		return nil, err
	}
	return input, nil
}

func ServiceUpdateFileRule(id uint, input *entity.FileRule) (*entity.FileRule, error) {
	var rule entity.FileRule
	if err := DB.First(&rule, id).Error; err != nil {
		return nil, err
	}
	rule.RemotePath = input.RemotePath
	rule.Recursive = input.Recursive
	rule.ExcludePattern = input.ExcludePattern
	if err := DB.Save(&rule).Error; err != nil {
		return nil, err
	}
	return &rule, nil
}

func ServiceDeleteFileRule(id uint) error {
	return DB.Delete(&entity.FileRule{}, id).Error
}
