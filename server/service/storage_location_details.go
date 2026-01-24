package service

import (
	"errors"

	"backapp-server/entity"

	"gorm.io/gorm"
)

func hydrateStorageLocation(location *entity.StorageLocation) error {
	if location == nil {
		return nil
	}

	storageType := NormalizeStorageType(location)
	if storageType == storageTypeLocal {
		var details entity.LocalStorageLocationDetails
		err := DB.Where("storage_location_id = ?", location.ID).First(&details).Error
		if err == nil {
			location.BasePath = details.BasePath
			return nil
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		if location.BasePath != "" {
			details = entity.LocalStorageLocationDetails{
				StorageLocationID: location.ID,
				BasePath:          location.BasePath,
			}
			if err := DB.Create(&details).Error; err != nil {
				return err
			}
		}
		return nil
	}

	if storageType == storageTypeSFTP {
		var details entity.SftpStorageLocationDetails
		err := DB.Where("storage_location_id = ?", location.ID).First(&details).Error
		if err == nil {
			location.Address = details.Address
			location.Port = details.Port
			location.RemotePath = details.RemotePath
			location.Username = details.Username
			location.Password = details.Password
			location.SSHKey = details.SSHKey
			location.AuthType = details.AuthType
			return nil
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		if location.Address != "" || location.RemotePath != "" || location.Username != "" || location.Password != "" || location.SSHKey != "" {
			details = entity.SftpStorageLocationDetails{
				StorageLocationID: location.ID,
				Address:           location.Address,
				Port:              location.Port,
				RemotePath:        location.RemotePath,
				Username:          location.Username,
				Password:          location.Password,
				SSHKey:            location.SSHKey,
				AuthType:          location.AuthType,
			}
			if err := DB.Create(&details).Error; err != nil {
				return err
			}
		}
	}

	return nil
}

func hydrateStorageLocations(locations []entity.StorageLocation) error {
	for i := range locations {
		if err := hydrateStorageLocation(&locations[i]); err != nil {
			return err
		}
	}
	return nil
}
