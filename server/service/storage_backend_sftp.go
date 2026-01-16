package service

import (
	"fmt"
	"io"
	"os"

	"backapp-server/entity"

	"github.com/pkg/sftp"
	"golang.org/x/crypto/ssh"
)

type sftpStorageBackend struct {
	sshClient  *ssh.Client
	sftpClient *sftp.Client
}

// NewSFTPStorageBackend connects to an SFTP storage location.
func NewSFTPStorageBackend(location *entity.StorageLocation) (StorageBackend, error) {
	if location == nil {
		return nil, fmt.Errorf("storage location is required")
	}

	config, err := buildSFTPSSHConfig(location)
	if err != nil {
		return nil, err
	}
	addr, err := resolveSFTPAddress(location)
	if err != nil {
		return nil, err
	}

	sshClient, err := ssh.Dial("tcp", addr, config)
	if err != nil {
		return nil, fmt.Errorf("sftp ssh connection failed: %v", err)
	}

	sftpClient, err := sftp.NewClient(sshClient)
	if err != nil {
		sshClient.Close()
		return nil, fmt.Errorf("failed to create sftp client: %v", err)
	}

	return &sftpStorageBackend{
		sshClient:  sshClient,
		sftpClient: sftpClient,
	}, nil
}

// TestSFTPConnection verifies that the SFTP storage can be reached.
func TestSFTPConnection(location *entity.StorageLocation) error {
	config, err := buildSFTPSSHConfig(location)
	if err != nil {
		return err
	}
	addr, err := resolveSFTPAddress(location)
	if err != nil {
		return err
	}

	sshClient, err := ssh.Dial("tcp", addr, config)
	if err != nil {
		return fmt.Errorf("sftp ssh connection failed: %v", err)
	}
	defer sshClient.Close()

	sftpClient, err := sftp.NewClient(sshClient)
	if err != nil {
		return fmt.Errorf("failed to create sftp client: %v", err)
	}
	defer sftpClient.Close()

	if location.RemotePath != "" {
		if _, err := sftpClient.Stat(location.RemotePath); err != nil {
			return fmt.Errorf("remote path not accessible: %v", err)
		}
	}
	return nil
}

func (b *sftpStorageBackend) EnsureDir(dirPath string) error {
	return b.sftpClient.MkdirAll(dirPath)
}

func (b *sftpStorageBackend) OpenWriter(filePath string) (io.WriteCloser, error) {
	return b.sftpClient.Create(filePath)
}

func (b *sftpStorageBackend) OpenReader(filePath string) (io.ReadCloser, error) {
	return b.sftpClient.Open(filePath)
}

func (b *sftpStorageBackend) Remove(filePath string) error {
	return b.sftpClient.Remove(filePath)
}

func (b *sftpStorageBackend) Stat(filePath string) (os.FileInfo, error) {
	return b.sftpClient.Stat(filePath)
}

func (b *sftpStorageBackend) IsLocal() bool {
	return false
}

func (b *sftpStorageBackend) Close() error {
	if b.sftpClient != nil {
		b.sftpClient.Close()
	}
	if b.sshClient != nil {
		return b.sshClient.Close()
	}
	return nil
}
