package service

import (
	"testing"
	"time"

	"backapp-server/entity"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestServiceListBackupFilesForProfilePaginates(t *testing.T) {
	previousDB := DB
	testDB, err := gorm.Open(sqlite.Open("file:backup-profile-files-test?mode=memory&cache=shared"), &gorm.Config{})
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

	if err := DB.AutoMigrate(&entity.BackupRun{}, &entity.BackupFile{}); err != nil {
		t.Fatalf("migrate test database: %v", err)
	}

	now := time.Now()
	runs := []entity.BackupRun{
		{BackupProfileID: 1, Status: "completed", StartTime: now, EndTime: now},
		{BackupProfileID: 2, Status: "completed", StartTime: now, EndTime: now},
	}
	if err := DB.Create(&runs).Error; err != nil {
		t.Fatalf("create backup runs: %v", err)
	}

	files := []entity.BackupFile{
		{BackupRunID: runs[0].ID, RemotePath: "first.txt", LocalPath: "/backups/first.txt"},
		{BackupRunID: runs[0].ID, RemotePath: "second.txt", LocalPath: "/backups/second.txt"},
		{BackupRunID: runs[0].ID, RemotePath: "third.txt", LocalPath: "/backups/third.txt"},
		{BackupRunID: runs[1].ID, RemotePath: "other-profile.txt", LocalPath: "/backups/other.txt"},
	}
	if err := DB.Create(&files).Error; err != nil {
		t.Fatalf("create backup files: %v", err)
	}

	page, err := ServiceListBackupFilesForProfile(1, 2, 0)
	if err != nil {
		t.Fatalf("list first page: %v", err)
	}
	if page.Total != 3 || len(page.Files) != 2 {
		t.Fatalf("first page has total %d and %d files, want 3 and 2", page.Total, len(page.Files))
	}
	if page.Files[0].RunID != runs[0].ID || page.Files[0].RunStatus != runs[0].Status ||
		page.Files[0].RunStartedAt.IsZero() || page.Files[0].RunFinishedAt.IsZero() {
		t.Fatalf("run details were not populated: %+v", page.Files[0])
	}

	nextPage, err := ServiceListBackupFilesForProfile(1, 2, 2)
	if err != nil {
		t.Fatalf("list second page: %v", err)
	}
	if nextPage.Total != 3 || len(nextPage.Files) != 1 || nextPage.Files[0].RemotePath != "first.txt" {
		t.Fatalf("second page = total %d, files %+v; want total 3 and first.txt", nextPage.Total, nextPage.Files)
	}
}
