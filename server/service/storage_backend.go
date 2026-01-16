package service

import (
	"io"
	"os"
	"path"
	"path/filepath"
	"strings"

	"backapp-server/entity"
)

const (
	storageTypeLocal = "local"
	storageTypeSFTP  = "sftp"
)

// StorageBackend abstracts where backups are written/read.
type StorageBackend interface {
	EnsureDir(path string) error
	OpenWriter(path string) (io.WriteCloser, error)
	OpenReader(path string) (io.ReadCloser, error)
	Remove(path string) error
	Stat(path string) (os.FileInfo, error)
	IsLocal() bool
	Close() error
}

type localStorageBackend struct{}

func (b *localStorageBackend) EnsureDir(dirPath string) error {
	return os.MkdirAll(dirPath, 0755)
}

func (b *localStorageBackend) OpenWriter(filePath string) (io.WriteCloser, error) {
	return os.Create(filePath)
}

func (b *localStorageBackend) OpenReader(filePath string) (io.ReadCloser, error) {
	return os.Open(filePath)
}

func (b *localStorageBackend) Remove(filePath string) error {
	return os.Remove(filePath)
}

func (b *localStorageBackend) Stat(filePath string) (os.FileInfo, error) {
	return os.Stat(filePath)
}

func (b *localStorageBackend) IsLocal() bool {
	return true
}

func (b *localStorageBackend) Close() error {
	return nil
}

// NormalizeStorageType returns the effective storage type.
func NormalizeStorageType(location *entity.StorageLocation) string {
	if location == nil {
		return storageTypeLocal
	}
	storageType := strings.ToLower(strings.TrimSpace(location.Type))
	if storageType == "" {
		return storageTypeLocal
	}
	return storageType
}

// StorageBasePath returns the base path/prefix for a storage location.
func StorageBasePath(location *entity.StorageLocation) string {
	if NormalizeStorageType(location) == storageTypeSFTP {
		return location.RemotePath
	}
	return location.BasePath
}

// JoinStoragePath joins path elements based on storage type.
func JoinStoragePath(location *entity.StorageLocation, elements ...string) string {
	if NormalizeStorageType(location) == storageTypeSFTP {
		return path.Join(elements...)
	}
	return filepath.Join(elements...)
}

// NewStorageBackend creates a storage backend for the location.
func NewStorageBackend(location *entity.StorageLocation) (StorageBackend, error) {
	if NormalizeStorageType(location) == storageTypeSFTP {
		return NewSFTPStorageBackend(location)
	}
	return &localStorageBackend{}, nil
}
