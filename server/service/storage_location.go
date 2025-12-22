package service

import "backapp-server/entity"

func ServiceListStorageLocations() ([]entity.StorageLocation, error) {
	var locs []entity.StorageLocation
	if err := DB.Find(&locs).Error; err != nil {
		return nil, err
	}
	return locs, nil
}

func ServiceCreateStorageLocation(input *entity.StorageLocation) (*entity.StorageLocation, error) {
	if err := DB.Create(input).Error; err != nil {
		return nil, err
	}
	return input, nil
}

func ServiceUpdateStorageLocation(id uint, input *entity.StorageLocation) (*entity.StorageLocation, error) {
	var location entity.StorageLocation
	if err := DB.First(&location, id).Error; err != nil {
		return nil, err
	}
	if input.Name != "" {
		location.Name = input.Name
	}
	if input.BasePath != "" {
		location.BasePath = input.BasePath
	}
	if err := DB.Save(&location).Error; err != nil {
		return nil, err
	}
	return &location, nil
}

func ServiceDeleteStorageLocation(id string) error {
	return DB.Delete(&entity.StorageLocation{}, "id = ?", id).Error
}
