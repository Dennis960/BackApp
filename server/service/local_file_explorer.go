package service

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"

	"backapp-server/entity"
)

// ServiceListLocalFiles lists files and directories at the given local path
func ServiceListLocalFiles(path string) ([]entity.FileSystemEntry, error) {
	// Resolve the path to prevent directory traversal
	absPath, err := filepath.Abs(path)
	if err != nil {
		return nil, fmt.Errorf("invalid path: %v", err)
	}

	// Check if path exists and is a directory
	info, err := os.Stat(absPath)
	if err != nil {
		return nil, fmt.Errorf("cannot access path: %v", err)
	}
	if !info.IsDir() {
		return nil, fmt.Errorf("path is not a directory")
	}

	// Read directory contents
	entries, err := os.ReadDir(absPath)
	if err != nil {
		return nil, fmt.Errorf("cannot read directory: %v", err)
	}

	var results []entity.FileSystemEntry

	for _, entry := range entries {
		info, err := entry.Info()
		if err != nil {
			// Skip entries we can't stat
			continue
		}

		fullPath := filepath.Join(absPath, entry.Name())
		results = append(results, entity.FileSystemEntry{
			Name:  entry.Name(),
			Path:  fullPath,
			IsDir: entry.IsDir(),
			Size:  info.Size(),
		})
	}

	// Sort: directories first, then by name
	sort.Slice(results, func(i, j int) bool {
		if results[i].IsDir != results[j].IsDir {
			return results[i].IsDir
		}
		return results[i].Name < results[j].Name
	})

	return results, nil
}
