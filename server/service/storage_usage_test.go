package service

import (
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestGetStorageUsageIncludesProfileBreakdown(t *testing.T) {
	previousDB := DB
	testDB, err := gorm.Open(sqlite.Open("file:storage-usage-test?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open test database: %v", err)
	}
	DB = testDB
	t.Cleanup(func() {
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
		DB = previousDB
	})

	statements := []string{
		"CREATE TABLE storage_locations (id INTEGER PRIMARY KEY, name TEXT, base_path TEXT, created_at DATETIME)",
		"CREATE TABLE backup_profiles (id INTEGER PRIMARY KEY, name TEXT, storage_location_id INTEGER)",
		"CREATE TABLE backup_runs (id INTEGER PRIMARY KEY, backup_profile_id INTEGER)",
		"CREATE TABLE backup_files (id INTEGER PRIMARY KEY, backup_run_id INTEGER, deleted BOOLEAN, size_bytes INTEGER, file_size INTEGER)",
	}
	for _, statement := range statements {
		if err := DB.Exec(statement).Error; err != nil {
			t.Fatalf("create test schema: %v", err)
		}
	}

	basePath := t.TempDir()
	if err := DB.Exec("INSERT INTO storage_locations (id, name, base_path) VALUES (1, ?, ?)", "Local", basePath).Error; err != nil {
		t.Fatalf("insert storage location: %v", err)
	}
	if err := DB.Exec("INSERT INTO backup_profiles (id, name, storage_location_id) VALUES (1, ?, 1)", "Daily").Error; err != nil {
		t.Fatalf("insert backup profile: %v", err)
	}
	if err := DB.Exec("INSERT INTO backup_runs (id, backup_profile_id) VALUES (1, 1)").Error; err != nil {
		t.Fatalf("insert backup run: %v", err)
	}
	if err := DB.Exec(`INSERT INTO backup_files (id, backup_run_id, deleted, size_bytes, file_size)
		VALUES (1, 1, false, 100, 0), (2, 1, false, 0, 25), (3, 1, true, 1000, 0)`).Error; err != nil {
		t.Fatalf("insert backup files: %v", err)
	}

	usage, err := GetStorageUsage()
	if err != nil {
		t.Fatalf("get storage usage: %v", err)
	}
	if len(usage.Profiles) != 1 {
		t.Fatalf("got %d profile summaries, want 1", len(usage.Profiles))
	}
	profile := usage.Profiles[0]
	if profile.BackupProfileID != 1 || profile.ProfileName != "Daily" ||
		profile.StorageLocationID != 1 || profile.StorageLocationName != "Local" ||
		profile.BasePath != basePath || profile.BackupCount != 2 || profile.BackupSizeBytes != 125 {
		t.Fatalf("unexpected profile usage: %+v", profile)
	}
}
