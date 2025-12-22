package controller

import (
	"path/filepath"
	"strings"
)

// isValidPath checks that the resolved path is within the base directory
// to prevent directory traversal attacks.
func isValidPath(requestedPath, baseDir string) bool {
	absRequested, err := filepath.Abs(requestedPath)
	if err != nil {
		return false
	}
	absBase, err := filepath.Abs(baseDir)
	if err != nil {
		return false
	}
	return strings.HasPrefix(absRequested, absBase)
}
