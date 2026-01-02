package service

import "backapp-server/entity"

// internal helpers

func sanitizeServer(s *entity.Server) *entity.Server {
	if s == nil {
		return nil
	}
	copy := *s
	copy.PrivateKeyPath = ""
	copy.Password = ""
	return &copy
}

func sanitizeServers(list []entity.Server) []entity.Server {
	out := make([]entity.Server, len(list))
	for i := range list {
		out[i] = list[i]
		out[i].PrivateKeyPath = ""
		out[i].Password = ""
	}
	return out
}

// low-level accessors (may return sensitive fields)

func GetServerByID(id uint) (*entity.Server, error) {
	var server entity.Server
	if err := DB.First(&server, id).Error; err != nil {
		return nil, err
	}
	return &server, nil
}

func listServersRaw() ([]entity.Server, error) {
	var servers []entity.Server
	if err := DB.Find(&servers).Error; err != nil {
		return nil, err
	}
	return servers, nil
}

// public service functions (sanitized)

func ServiceListServers() ([]entity.Server, error) {
	servers, err := listServersRaw()
	if err != nil {
		return nil, err
	}
	return sanitizeServers(servers), nil
}

func ServiceGetServer(id uint) (*entity.Server, error) {
	server, err := GetServerByID(id)
	if err != nil {
		return nil, err
	}
	return sanitizeServer(server), nil
}

func ServiceCreateServerFromJSON(input *entity.Server) (*entity.Server, error) {
	server := &entity.Server{
		Name:     input.Name,
		Host:     input.Host,
		Port:     input.Port,
		Username: input.Username,
		AuthType: input.AuthType,
		Password: input.Password,
	}
	if server.Port == 0 {
		server.Port = 22
	}
	if server.AuthType == "" {
		server.AuthType = "key"
	}
	if err := DB.Create(server).Error; err != nil {
		return nil, err
	}
	return sanitizeServer(server), nil
}

func ServiceCreateServerWithKey(name, host string, port int, username string, keyContent []byte) (*entity.Server, error) {
	server := &entity.Server{
		Name:     name,
		Host:     host,
		Port:     port,
		Username: username,
		AuthType: "key",
	}
	if server.Port == 0 {
		server.Port = 22
	}
	if err := DB.Create(server).Error; err != nil {
		return nil, err
	}
	server.PrivateKeyPath = string(keyContent)
	if err := DB.Save(server).Error; err != nil {
		return nil, err
	}
	return sanitizeServer(server), nil
}

func ServiceUpdateServer(id uint, input *entity.Server) (*entity.Server, error) {
	server, err := GetServerByID(id)
	if err != nil {
		return nil, err
	}
	server.Name = input.Name
	server.Host = input.Host
	server.Port = input.Port
	server.Username = input.Username
	server.AuthType = input.AuthType
	// Only update password if a new one is provided (non-empty)
	if input.Password != "" {
		server.Password = input.Password
	}
	if server.Port == 0 {
		server.Port = 22
	}
	if err := DB.Save(server).Error; err != nil {
		return nil, err
	}
	return sanitizeServer(server), nil
}

// ServiceGetServerDeletionImpact returns the impact of deleting a server
func ServiceGetServerDeletionImpact(serverID uint) (*DeletionImpact, error) {
	// First, verify server exists
	if _, err := GetServerByID(serverID); err != nil {
		return nil, err
	}

	// Get all backup profiles for this server
	var profiles []entity.BackupProfile
	if err := DB.Where("server_id = ?", serverID).Find(&profiles).Error; err != nil {
		return nil, err
	}

	impact := &DeletionImpact{
		BackupProfiles: len(profiles),
	}

	// Get all backup runs for these profiles
	for _, profile := range profiles {
		var runs []entity.BackupRun
		if err := DB.Where("backup_profile_id = ?", profile.ID).Find(&runs).Error; err != nil {
			return nil, err
		}
		impact.BackupRuns += len(runs)

		// Get all backup files for these runs
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

	return impact, nil
}

// ServiceDeleteServer deletes a server and all related backup profiles, runs, and files
func ServiceDeleteServer(id uint) error {
	// First, verify server exists
	if _, err := GetServerByID(id); err != nil {
		return err
	}

	// Get all backup profiles for this server
	var profiles []entity.BackupProfile
	if err := DB.Where("server_id = ?", id).Find(&profiles).Error; err != nil {
		return err
	}

	// Delete all backup runs and files for each profile
	for _, profile := range profiles {
		// Unschedule the profile first
		scheduler := GetScheduler()
		scheduler.UnscheduleProfile(profile.ID)

		// Get all backup runs for this profile
		var runs []entity.BackupRun
		if err := DB.Where("backup_profile_id = ?", profile.ID).Find(&runs).Error; err != nil {
			return err
		}

		// Delete all backup runs (this also deletes files from disk)
		for _, run := range runs {
			if err := ServiceDeleteBackupRun(run.ID); err != nil {
				return err
			}
		}

		// Delete commands and file rules for the profile
		if err := DB.Where("backup_profile_id = ?", profile.ID).Delete(&entity.Command{}).Error; err != nil {
			return err
		}
		if err := DB.Where("backup_profile_id = ?", profile.ID).Delete(&entity.FileRule{}).Error; err != nil {
			return err
		}

		// Delete the profile
		if err := DB.Delete(&profile).Error; err != nil {
			return err
		}
	}

	// Finally, delete the server
	return DB.Delete(&entity.Server{}, id).Error
}
