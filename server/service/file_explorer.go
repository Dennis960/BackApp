package service

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"backapp-server/entity"
)

func ServiceListServerFiles(serverId uint, remotePath string) ([]entity.FileSystemEntry, error) {
	// Get the server (use GetServerByID to preserve credentials)
	server, err := GetServerByID(serverId)
	if err != nil {
		return nil, err
	}

	// For local servers, use local filesystem
	if server.Host == "localhost" || server.Host == "127.0.0.1" {
		return listLocalFiles(remotePath)
	}

	// For remote servers, use SSH
	client, err := NewSSHClient(server)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to server: %w", err)
	}
	defer client.Close()

	return listRemoteFiles(client, remotePath)
}

func listLocalFiles(dirPath string) ([]entity.FileSystemEntry, error) {
	if dirPath == "" {
		dirPath = "/home"
	}

	// Ensure path exists and is a directory
	info, err := os.Stat(dirPath)
	if err != nil {
		return nil, fmt.Errorf("path not found: %w", err)
	}
	if !info.IsDir() {
		return nil, fmt.Errorf("path is not a directory")
	}

	entries, err := os.ReadDir(dirPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read directory: %w", err)
	}

	var results []entity.FileSystemEntry
	for _, entry := range entries {
		info, _ := entry.Info()
		results = append(results, entity.FileSystemEntry{
			Name:  entry.Name(),
			Path:  filepath.Join(dirPath, entry.Name()),
			IsDir: entry.IsDir(),
			Size:  info.Size(),
		})
	}

	// Sort by name, directories first
	sort.Slice(results, func(i, j int) bool {
		if results[i].IsDir == results[j].IsDir {
			return results[i].Name < results[j].Name
		}
		return results[i].IsDir
	})

	return results, nil
}

func listRemoteFiles(client *SSHClient, remotePath string) ([]entity.FileSystemEntry, error) {
	if remotePath == "" {
		remotePath = "/home"
	}

	// Use ls command to list files
	cmd := fmt.Sprintf("ls -la %s", remotePath)
	output, err := client.RunCommand(cmd)
	if err != nil {
		return nil, fmt.Errorf("failed to list remote files: %w", err)
	}

	var results []entity.FileSystemEntry
	lines := strings.Split(string(output), "\n")

	for _, line := range lines {
		if line == "" || strings.HasPrefix(line, "total") {
			continue
		}

		// Parse ls -la output: permissions links owner group size date... name
		parts := strings.Fields(line)
		if len(parts) < 9 {
			continue
		}

		// Skip "." and ".."
		name := parts[len(parts)-1]
		if name == "." || name == ".." {
			continue
		}

		isDir := strings.HasPrefix(parts[0], "d")
		size := int64(0)
		if !isDir {
			fmt.Sscanf(parts[4], "%d", &size)
		}

		path := remotePath
		if !strings.HasSuffix(path, "/") {
			path += "/"
		}
		path += name

		results = append(results, entity.FileSystemEntry{
			Name:  name,
			Path:  path,
			IsDir: isDir,
			Size:  size,
		})
	}

	// Sort by name, directories first
	sort.Slice(results, func(i, j int) bool {
		if results[i].IsDir == results[j].IsDir {
			return results[i].Name < results[j].Name
		}
		return results[i].IsDir
	})

	return results, nil
}
