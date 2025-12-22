package service

import (
	"fmt"
	"net"
	"os"
	"time"

	"backapp-server/entity"

	"golang.org/x/crypto/ssh"
)

// TestSSHConnection tests an SSH connection with a private key
func TestSSHConnection(hostname, username, keyContent string) error {
	signer, err := ssh.ParsePrivateKey([]byte(keyContent))
	if err != nil {
		return fmt.Errorf("failed to parse private key: %v", err)
	}

	config := &ssh.ClientConfig{
		User: username,
		Auth: []ssh.AuthMethod{
			ssh.PublicKeys(signer),
		},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
		Timeout:         10 * time.Second,
	}

	// Add port if not specified
	address := hostname
	if _, _, err := net.SplitHostPort(hostname); err != nil {
		address = net.JoinHostPort(hostname, "22")
	}

	conn, err := ssh.Dial("tcp", address, config)
	if err != nil {
		return fmt.Errorf("SSH connection failed: %v", err)
	}
	defer conn.Close()

	sess, err := conn.NewSession()
	if err != nil {
		return fmt.Errorf("SSH session failed: %v", err)
	}
	defer sess.Close()

	// Test with a simple command
	_, err = sess.Output("echo test")
	if err != nil {
		return fmt.Errorf("SSH command failed: %v", err)
	}

	return nil
}

// TestSSHConnectionWithPassword tests an SSH connection using username/password
func TestSSHConnectionWithPassword(hostname, username, password string) error {
	config := &ssh.ClientConfig{
		User: username,
		Auth: []ssh.AuthMethod{
			ssh.Password(password),
		},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
		Timeout:         10 * time.Second,
	}
	address := hostname
	if _, _, err := net.SplitHostPort(hostname); err != nil {
		address = net.JoinHostPort(hostname, "22")
	}
	conn, err := ssh.Dial("tcp", address, config)
	if err != nil {
		return fmt.Errorf("SSH connection failed: %v", err)
	}
	defer conn.Close()
	sess, err := conn.NewSession()
	if err != nil {
		return fmt.Errorf("SSH session failed: %v", err)
	}
	defer sess.Close()
	_, err = sess.Output("echo test")
	if err != nil {
		return fmt.Errorf("SSH command failed: %v", err)
	}
	return nil
}

// TestSSHConnectionUsingServer attempts an SSH connection using the server's auth type
func TestSSHConnectionUsingServer(server *entity.Server) error {
	switch server.AuthType {
	case "key":
		if server.PrivateKeyPath == "" {
			return fmt.Errorf("server has no private_key_path configured")
		}
		if stat, err := os.Stat(server.PrivateKeyPath); err == nil && !stat.IsDir() {
			keyData, err := os.ReadFile(server.PrivateKeyPath)
			if err != nil {
				return fmt.Errorf("failed to read private key file: %v", err)
			}
			return TestSSHConnection(server.Host, server.Username, string(keyData))
		}
		return TestSSHConnection(server.Host, server.Username, server.PrivateKeyPath)
	case "password":
		if server.Password == "" {
			return fmt.Errorf("server has no password configured")
		}
		return TestSSHConnectionWithPassword(server.Host, server.Username, server.Password)
	default:
		return fmt.Errorf("unsupported auth_type: %s", server.AuthType)
	}
}
