package service

import (
	"fmt"
	"os"
)

// readPrivateKeyData reads a private key from a file path or returns inline data.
func readPrivateKeyData(value string) ([]byte, error) {
	if value == "" {
		return nil, fmt.Errorf("private key is empty")
	}
	if stat, statErr := os.Stat(value); statErr == nil && !stat.IsDir() {
		keyData, err := os.ReadFile(value)
		if err != nil {
			return nil, fmt.Errorf("failed to read private key file: %v", err)
		}
		return keyData, nil
	}
	return []byte(value), nil
}
