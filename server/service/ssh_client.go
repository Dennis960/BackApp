package service

import (
	"fmt"
	"io"
	"log"
	"net"
	"os"
	"time"

	"backapp-server/entity"

	"golang.org/x/crypto/ssh"
)

// SSHClient wraps an SSH connection for executing commands and transferring files
type SSHClient struct {
	client *ssh.Client
	config *ssh.ClientConfig
	addr   string
}

// NewSSHClient creates a new SSH client for a server
func NewSSHClient(server *entity.Server) (*SSHClient, error) {
	var config *ssh.ClientConfig

	switch server.AuthType {
	case "key":
		keyData, err := readPrivateKeyData(server.PrivateKeyPath)
		if err != nil {
			return nil, err
		}

		signer, err := ssh.ParsePrivateKey(keyData)
		if err != nil {
			return nil, fmt.Errorf("failed to parse private key: %v", err)
		}

		config = &ssh.ClientConfig{
			User: server.Username,
			Auth: []ssh.AuthMethod{
				ssh.PublicKeys(signer),
			},
			HostKeyCallback: ssh.InsecureIgnoreHostKey(),
			Timeout:         30 * time.Second,
		}

	case "password":
		config = &ssh.ClientConfig{
			User: server.Username,
			Auth: []ssh.AuthMethod{
				ssh.Password(server.Password),
			},
			HostKeyCallback: ssh.InsecureIgnoreHostKey(),
			Timeout:         30 * time.Second,
		}

	default:
		return nil, fmt.Errorf("unsupported auth_type: %s", server.AuthType)
	}

	// Build address with correct port
	address := server.Host
	if _, _, err := net.SplitHostPort(server.Host); err != nil {
		// hostname doesn't contain port, add it
		port := server.Port
		if port == 0 {
			port = 22
		}
		address = net.JoinHostPort(server.Host, fmt.Sprintf("%d", port))
	}

	client, err := ssh.Dial("tcp", address, config)
	if err != nil {
		return nil, fmt.Errorf("SSH connection failed: %v", err)
	}

	return &SSHClient{
		client: client,
		config: config,
		addr:   address,
	}, nil
}

// RunCommand executes a command on the remote server
func (c *SSHClient) RunCommand(cmd string) (string, error) {
	return c.RunCommandInDir(cmd, "")
}

// RunCommandInDir executes a command on the remote server in a specific directory
func (c *SSHClient) RunCommandInDir(cmd string, workingDir string) (string, error) {
	session, err := c.client.NewSession()
	if err != nil {
		return "", fmt.Errorf("failed to create session: %v", err)
	}
	defer session.Close()

	// If working directory is specified and not root, prepend cd command
	fullCmd := cmd
	if workingDir != "" && workingDir != "/" {
		fullCmd = fmt.Sprintf("cd '%s' && %s", workingDir, cmd)
	}

	output, err := session.CombinedOutput(fullCmd)
	if err != nil {
		return string(output), fmt.Errorf("command failed: %v", err)
	}

	return string(output), nil
}

// CopyFileFromRemote downloads a file from the remote server using SCP
func (c *SSHClient) CopyFileFromRemote(remotePath, localPath string) error {
	log.Printf("Starting file copy from remote: %s to local: %s", remotePath, localPath)

	// Try simple cat method first (more reliable)
	err := c.copyFileUsingCat(remotePath, localPath)
	if err == nil {
		log.Printf("File copied successfully using cat method")
		return nil
	}

	log.Printf("Cat method failed: %v, falling back to SCP", err)
	return c.copyFileUsingSCP(remotePath, localPath)
}

// CopyFileFromRemoteToWriter streams a remote file into a writer.
func (c *SSHClient) CopyFileFromRemoteToWriter(remotePath string, writer io.Writer) error {
	session, err := c.client.NewSession()
	if err != nil {
		return fmt.Errorf("failed to create session: %v", err)
	}
	defer session.Close()

	stdout, err := session.StdoutPipe()
	if err != nil {
		return fmt.Errorf("failed to get stdout pipe: %v", err)
	}

	if err := session.Start(fmt.Sprintf("cat '%s'", remotePath)); err != nil {
		return fmt.Errorf("failed to start cat: %v", err)
	}

	if _, err := io.Copy(writer, stdout); err != nil {
		return fmt.Errorf("failed to copy file content: %v", err)
	}

	if err := session.Wait(); err != nil {
		return fmt.Errorf("cat command failed: %v", err)
	}

	return nil
}

// copyFileUsingCat downloads a file using cat (simpler and more reliable)
func (c *SSHClient) copyFileUsingCat(remotePath, localPath string) error {
	session, err := c.client.NewSession()
	if err != nil {
		return fmt.Errorf("failed to create session: %v", err)
	}
	defer session.Close()

	// Create local file
	localFile, err := os.Create(localPath)
	if err != nil {
		return fmt.Errorf("failed to create local file: %v", err)
	}
	defer localFile.Close()

	// Get stdout pipe
	stdout, err := session.StdoutPipe()
	if err != nil {
		return fmt.Errorf("failed to get stdout pipe: %v", err)
	}

	// Start cat command
	if err := session.Start(fmt.Sprintf("cat '%s'", remotePath)); err != nil {
		return fmt.Errorf("failed to start cat: %v", err)
	}

	// Copy content to local file
	if _, err := io.Copy(localFile, stdout); err != nil {
		return fmt.Errorf("failed to copy file content: %v", err)
	}

	// Wait for command to finish
	if err := session.Wait(); err != nil {
		return fmt.Errorf("cat command failed: %v", err)
	}

	return nil
}

// copyFileUsingSCP downloads a file from the remote server using SCP
func (c *SSHClient) copyFileUsingSCP(remotePath, localPath string) error {
	session, err := c.client.NewSession()
	if err != nil {
		return fmt.Errorf("failed to create session: %v", err)
	}
	defer session.Close()

	// Create local file
	localFile, err := os.Create(localPath)
	if err != nil {
		return fmt.Errorf("failed to create local file: %v", err)
	}
	defer localFile.Close()

	// Use SCP to download file
	stdout, err := session.StdoutPipe()
	if err != nil {
		return fmt.Errorf("failed to get stdout pipe: %v", err)
	}

	stdin, err := session.StdinPipe()
	if err != nil {
		return fmt.Errorf("failed to get stdin pipe: %v", err)
	}

	if err := session.Start("scp -f " + remotePath); err != nil {
		return fmt.Errorf("failed to start scp: %v", err)
	}

	// Send null byte to indicate ready
	if _, err := stdin.Write([]byte{0}); err != nil {
		return fmt.Errorf("failed to send ready signal: %v", err)
	}

	// Read file info
	buf := make([]byte, 1024)
	_, err = stdout.Read(buf)
	if err != nil {
		return fmt.Errorf("failed to read file info: %v", err)
	}

	// Send acknowledgment
	if _, err := stdin.Write([]byte{0}); err != nil {
		return fmt.Errorf("failed to send ack: %v", err)
	}

	// Read file content
	if _, err := io.Copy(localFile, stdout); err != nil {
		return fmt.Errorf("failed to copy file: %v", err)
	}

	// Send final acknowledgment
	if _, err := stdin.Write([]byte{0}); err != nil {
		return fmt.Errorf("failed to send final ack: %v", err)
	}

	if err := session.Wait(); err != nil {
		// SCP might return error even on success, check if file was created
		if stat, statErr := os.Stat(localPath); statErr == nil && stat.Size() > 0 {
			return nil
		}
		return fmt.Errorf("scp failed: %v", err)
	}

	return nil
}

// Close closes the SSH connection
func (c *SSHClient) Close() error {
	if c.client != nil {
		return c.client.Close()
	}
	return nil
}
