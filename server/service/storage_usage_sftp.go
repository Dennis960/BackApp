package service

import (
	"fmt"
	"strconv"
	"strings"

	"backapp-server/entity"

	"github.com/pkg/sftp"
	"golang.org/x/crypto/ssh"
)

func getSFTPDiskUsage(location *entity.StorageLocation) (diskUsage, error) {
	if location == nil || strings.TrimSpace(location.RemotePath) == "" {
		return diskUsage{}, fmt.Errorf("remote_path is required for sftp usage")
	}

	config, err := buildSFTPSSHConfig(location)
	if err != nil {
		return diskUsage{}, err
	}
	addr, err := resolveSFTPAddress(location)
	if err != nil {
		return diskUsage{}, err
	}

	sshClient, err := ssh.Dial("tcp", addr, config)
	if err != nil {
		return diskUsage{}, fmt.Errorf("sftp ssh connection failed: %v", err)
	}
	defer sshClient.Close()

	if usage, err := getSFTPStatVFS(sshClient, location.RemotePath); err == nil {
		return usage, nil
	}

	return getSFTPDiskUsageViaDF(sshClient, location.RemotePath)
}

func getSFTPBackupSize(location *entity.StorageLocation) (int64, int64, error) {
	if location == nil || strings.TrimSpace(location.RemotePath) == "" {
		return 0, 0, fmt.Errorf("remote_path is required for sftp usage")
	}

	config, err := buildSFTPSSHConfig(location)
	if err != nil {
		return 0, 0, err
	}
	addr, err := resolveSFTPAddress(location)
	if err != nil {
		return 0, 0, err
	}

	sshClient, err := ssh.Dial("tcp", addr, config)
	if err != nil {
		return 0, 0, fmt.Errorf("sftp ssh connection failed: %v", err)
	}
	defer sshClient.Close()

	client, err := sftp.NewClient(sshClient)
	if err != nil {
		return 0, 0, fmt.Errorf("failed to create sftp client: %v", err)
	}
	defer client.Close()

	var totalSize int64
	var fileCount int64
	walker := client.Walk(location.RemotePath)
	for walker.Step() {
		if err := walker.Err(); err != nil {
			continue
		}
		info := walker.Stat()
		if info == nil || info.IsDir() {
			continue
		}
		totalSize += info.Size()
		fileCount++
	}

	return totalSize, fileCount, nil
}

func getSFTPStatVFS(sshClient *ssh.Client, remotePath string) (diskUsage, error) {
	client, err := sftp.NewClient(sshClient)
	if err != nil {
		return diskUsage{}, fmt.Errorf("failed to create sftp client: %v", err)
	}
	defer client.Close()

	stats, err := client.StatVFS(remotePath)
	if err != nil {
		return diskUsage{}, err
	}

	blockSize := int64(stats.Frsize)
	if blockSize == 0 {
		blockSize = int64(stats.Bsize)
	}
	if blockSize == 0 {
		blockSize = 1
	}

	total := int64(stats.Blocks) * blockSize
	free := int64(stats.Bfree) * blockSize
	used := total - free
	return diskUsage{
		Total: total,
		Free:  free,
		Used:  used,
		Ok:    true,
	}, nil
}

func getSFTPDiskUsageViaDF(sshClient *ssh.Client, remotePath string) (diskUsage, error) {
	session, err := sshClient.NewSession()
	if err != nil {
		return diskUsage{}, fmt.Errorf("failed to create ssh session: %v", err)
	}
	defer session.Close()

	cmd := fmt.Sprintf("df -k '%s' | tail -1", remotePath)
	output, err := session.CombinedOutput(cmd)
	if err != nil {
		return diskUsage{}, fmt.Errorf("df command failed: %v", err)
	}

	fields := strings.Fields(strings.TrimSpace(string(output)))
	if len(fields) < 5 {
		return diskUsage{}, fmt.Errorf("unexpected df output: %s", strings.TrimSpace(string(output)))
	}

	sizeKB, err := strconv.ParseInt(fields[1], 10, 64)
	if err != nil {
		return diskUsage{}, fmt.Errorf("failed to parse size: %v", err)
	}
	usedKB, err := strconv.ParseInt(fields[2], 10, 64)
	if err != nil {
		return diskUsage{}, fmt.Errorf("failed to parse used: %v", err)
	}
	freeKB, err := strconv.ParseInt(fields[3], 10, 64)
	if err != nil {
		return diskUsage{}, fmt.Errorf("failed to parse free: %v", err)
	}

	return diskUsage{
		Total: sizeKB * 1024,
		Free:  freeKB * 1024,
		Used:  usedKB * 1024,
		Ok:    true,
	}, nil
}
