package service

import (
	"fmt"
	"net"
	"strings"
	"time"

	"backapp-server/entity"

	"golang.org/x/crypto/ssh"
)

func resolveSFTPAddress(location *entity.StorageLocation) (string, error) {
	if location == nil {
		return "", fmt.Errorf("storage location is required")
	}
	address := strings.TrimSpace(location.Address)
	if address == "" {
		return "", fmt.Errorf("sftp address is required")
	}
	port := location.Port
	if port == 0 {
		port = 22
	}
	if _, _, err := net.SplitHostPort(address); err == nil {
		return address, nil
	}
	return net.JoinHostPort(address, fmt.Sprintf("%d", port)), nil
}

func buildSFTPAuthMethods(location *entity.StorageLocation) ([]ssh.AuthMethod, error) {
	authType := strings.ToLower(strings.TrimSpace(location.AuthType))
	authMethods := []ssh.AuthMethod{}

	if authType == "" {
		if location.SSHKey != "" {
			authType = "key"
		} else if location.Password != "" {
			authType = "password"
		}
	}

	switch authType {
	case "password":
		if location.Password == "" {
			return nil, fmt.Errorf("password is required for sftp auth")
		}
		authMethods = append(authMethods, ssh.Password(location.Password))
	case "key", "":
		if location.SSHKey == "" {
			return nil, fmt.Errorf("ssh key is required for sftp key auth")
		}
		keyData, err := readPrivateKeyData(location.SSHKey)
		if err != nil {
			return nil, err
		}
		signer, err := ssh.ParsePrivateKey(keyData)
		if err != nil {
			return nil, fmt.Errorf("failed to parse ssh key: %v", err)
		}
		authMethods = append(authMethods, ssh.PublicKeys(signer))
	default:
		return nil, fmt.Errorf("unsupported auth_type: %s", authType)
	}

	return authMethods, nil
}

func buildSFTPSSHConfig(location *entity.StorageLocation) (*ssh.ClientConfig, error) {
	if location == nil {
		return nil, fmt.Errorf("storage location is required")
	}
	if strings.TrimSpace(location.Username) == "" {
		return nil, fmt.Errorf("sftp username is required")
	}
	authMethods, err := buildSFTPAuthMethods(location)
	if err != nil {
		return nil, err
	}
	return &ssh.ClientConfig{
		User:            location.Username,
		Auth:            authMethods,
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
		Timeout:         30 * time.Second,
	}, nil
}
