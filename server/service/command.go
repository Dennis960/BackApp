package service

import (
	"backapp-server/entity"
)

func ServiceListCommandsForProfile(profileID int) ([]entity.Command, error) {
	var cmds []entity.Command
	if err := DB.Where("backup_profile_id = ?", profileID).Order("run_stage, run_order").Find(&cmds).Error; err != nil {
		return nil, err
	}
	return cmds, nil
}

func ServiceCreateCommand(input *entity.Command) (*entity.Command, error) {
	if err := DB.Create(input).Error; err != nil {
		return nil, err
	}
	return input, nil
}

func ServiceUpdateCommand(id uint, input *entity.Command) (*entity.Command, error) {
	var cmd entity.Command
	if err := DB.First(&cmd, id).Error; err != nil {
		return nil, err
	}

	updates := map[string]interface{}{}
	if input.Command != "" {
		updates["command"] = input.Command
	}
	if input.RunStage != "" {
		updates["run_stage"] = input.RunStage
	}
	if input.RunOrder != 0 {
		updates["run_order"] = input.RunOrder
	}

	if len(updates) > 0 {
		if err := DB.Model(&cmd).Updates(updates).Error; err != nil {
			return nil, err
		}
	}
	return &cmd, nil
}

func ServiceDeleteCommand(id uint) error {
	return DB.Delete(&entity.Command{}, id).Error
}
