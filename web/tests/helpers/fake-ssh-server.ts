/**
 * Fake SSH/SFTP Server for testing
 * 
 * This module provides a fake SSH server with virtual filesystem support
 * for testing backup operations without needing a real SSH server.
 */
import type { Server } from 'ssh2';
import ssh2 from 'ssh2';

// SFTP status codes from ssh2.utils.sftp
const SFTP_STATUS = ssh2.utils.sftp.STATUS_CODE;

/** SSH private key for test server authentication */
export const SSH_PRIVATE_KEY = `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACCiAcnkgsR9+W7N2JxZePG/iNFSC6kedIk81lEt49lFywAAAKh3i0Tqd4tE
6gAAAAtzc2gtZWQyNTUxOQAAACCiAcnkgsR9+W7N2JxZePG/iNFSC6kedIk81lEt49lFyw
AAAEAPwzooSHy4SeVAneStkNcJXeeAuepaii84+tl6C4XZE6IByeSCxH35bs3YnFl48b+I
0VILqR50iTzWUS3j2UXLAAAAHmRlbm5pc0BkZW5uaXMtQjY1MC1HQU1JTkctWC1BWAECAw
QFBgc=
-----END OPENSSH PRIVATE KEY-----`;

/** SSH public key for test server authentication */
export const SSH_PUBLIC_KEY = `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKIByeSCxH35bs3YnFl48b+I0VILqR50iTzWUS3j2UXL test@key`;

/** Virtual file entry in the fake filesystem */
export interface VirtualFile {
  content: Buffer;
  isDirectory: boolean;
  mode: number;
  size: number;
  atime: Date;
  mtime: Date;
}

/** Options for starting the fake SSH server */
export interface FakeSSHServerOptions {
  port?: number;
  username?: string;
  password?: string;
  virtualFiles?: Map<string, VirtualFile>;
}

/**
 * Create a virtual file entry
 */
export function createVirtualFile(content: string | Buffer): VirtualFile {
  const buf = typeof content === 'string' ? Buffer.from(content) : content;
  return {
    content: buf,
    isDirectory: false,
    mode: 0o100644,
    size: buf.length,
    atime: new Date(),
    mtime: new Date(),
  };
}

/**
 * Create a virtual directory entry
 */
export function createVirtualDirectory(): VirtualFile {
  return {
    content: Buffer.alloc(0),
    isDirectory: true,
    mode: 0o40755,
    size: 4096,
    atime: new Date(),
    mtime: new Date(),
  };
}

/**
 * Start a simple fake SSH server with a single test file
 */
export async function startFakeSSHServer(
  port = 2222,
  username = 'root',
  password = 'passwd',
  testFilePath = '/testfile.txt'
): Promise<Server> {
  const virtualFiles = new Map<string, VirtualFile>();
  virtualFiles.set('/', createVirtualDirectory());
  virtualFiles.set(testFilePath, createVirtualFile('Hello, World!'));

  return startFakeSSHServerWithFiles({ port, username, password, virtualFiles });
}

/**
 * Start a fake SSH server with a custom virtual filesystem
 */
export async function startFakeSSHServerWithFiles(options: FakeSSHServerOptions): Promise<Server> {
  const {
    port = 2222,
    username = 'root',
    password = 'passwd',
    virtualFiles = new Map<string, VirtualFile>(),
  } = options;

  // Track open file handles for SFTP
  let handleCounter = 0;
  const openHandles = new Map<string, { path: string; offset: number }>();

  const server = new ssh2.Server(
    {
      hostKeys: [SSH_PRIVATE_KEY],
    },
    (client) => {
      client.on('authentication', (ctx) => {
        if (ctx.method === 'password' && ctx.username === username && ctx.password === password) {
          return ctx.accept();
        } else if (ctx.method === 'publickey' && ctx.username === username) {
          const clientKey = ctx.key.data.toString('base64');
          if (clientKey === Buffer.from(SSH_PUBLIC_KEY.split(' ')[1], 'base64').toString('base64')) {
            return ctx.accept();
          }
        }
        ctx.reject(['password', 'publickey']);
      }).on('ready', () => {
        client.on('session', (accept) => {
          const session = accept();

          // Handle shell requests
          session.on('shell', (accept) => {
            const stream = accept();
            stream.write('Welcome to your Node SSH server!\n');
            stream.on('data', (data: Buffer) => {
              stream.write(`You said: ${data}`);
            });
          });

          // Handle exec requests (for commands like test -e, test -d, etc.)
          session.on('exec', (accept, _reject, info) => {
            const stream = accept();
            const cmd = info.command;

            // Handle test -e (file exists)
            const testExistsMatch = cmd.match(/test -e '([^']+)' && echo exists \|\| echo notfound/);
            if (testExistsMatch) {
              const path = testExistsMatch[1];
              stream.write(virtualFiles.has(path) ? 'exists\n' : 'notfound\n');
              stream.exit(0);
              stream.end();
              return;
            }

            // Handle test -d (is directory)
            const testDirMatch = cmd.match(/test -d '([^']+)' && echo yes \|\| echo no/);
            if (testDirMatch) {
              const path = testDirMatch[1];
              const file = virtualFiles.get(path);
              stream.write(file?.isDirectory ? 'yes\n' : 'no\n');
              stream.exit(0);
              stream.end();
              return;
            }

            // Handle find command for directory listing
            const findMatch = cmd.match(/find '([^']+)' -maxdepth 1 -type f/);
            if (findMatch) {
              const basePath = findMatch[1];
              const files: string[] = [];
              virtualFiles.forEach((file, path) => {
                if (!file.isDirectory && path.startsWith(basePath) && path !== basePath) {
                  const relativePath = path.slice(basePath.length);
                  if (!relativePath.includes('/') || (relativePath.startsWith('/') && !relativePath.slice(1).includes('/'))) {
                    files.push(path);
                  }
                }
              });
              stream.write(files.join('\n') + '\n');
              stream.exit(0);
              stream.end();
              return;
            }

            // Handle stat command for file size
            const statMatch = cmd.match(/stat -c%s '([^']+)'/);
            if (statMatch) {
              const path = statMatch[1];
              const file = virtualFiles.get(path);
              stream.write(`${file && !file.isDirectory ? file.size : 0}\n`);
              stream.exit(0);
              stream.end();
              return;
            }

            // Handle cat command for file content
            const catMatch = cmd.match(/cat '([^']+)'/);
            if (catMatch) {
              const path = catMatch[1];
              const file = virtualFiles.get(path);
              if (file && !file.isDirectory) {
                stream.write(file.content);
              }
              stream.exit(0);
              stream.end();
              return;
            }

            // Default: echo the command
            stream.write(`You ran: ${cmd}\n`);
            stream.exit(0);
            stream.end();
          });

          // Handle SFTP requests
          session.on('sftp', (accept) => {
            const sftpStream = accept();

            sftpStream.on('OPEN', (reqid, filename) => {
              const file = virtualFiles.get(filename);
              if (!file || file.isDirectory) {
                sftpStream.status(reqid, SFTP_STATUS.NO_SUCH_FILE);
                return;
              }

              const handleId = `handle_${handleCounter++}`;
              const handle = Buffer.from(handleId);
              openHandles.set(handleId, { path: filename, offset: 0 });
              sftpStream.handle(reqid, handle);
            });

            sftpStream.on('READ', (reqid, handle, offset, length) => {
              const handleId = handle.toString();
              const handleInfo = openHandles.get(handleId);
              if (!handleInfo) {
                sftpStream.status(reqid, SFTP_STATUS.FAILURE);
                return;
              }

              const file = virtualFiles.get(handleInfo.path);
              if (!file) {
                sftpStream.status(reqid, SFTP_STATUS.NO_SUCH_FILE);
                return;
              }

              if (offset >= file.content.length) {
                sftpStream.status(reqid, SFTP_STATUS.EOF);
                return;
              }

              const chunk = file.content.slice(offset, offset + length);
              sftpStream.data(reqid, chunk);
            });

            sftpStream.on('CLOSE', (reqid, handle) => {
              const handleId = handle.toString();
              openHandles.delete(handleId);
              sftpStream.status(reqid, SFTP_STATUS.OK);
            });

            const handleStat = (reqid: number, path: string) => {
              const file = virtualFiles.get(path);
              if (!file) {
                sftpStream.status(reqid, SFTP_STATUS.NO_SUCH_FILE);
                return;
              }

              sftpStream.attrs(reqid, {
                mode: file.mode,
                size: file.size,
                atime: Math.floor(file.atime.getTime() / 1000),
                mtime: Math.floor(file.mtime.getTime() / 1000),
                uid: 0,
                gid: 0,
              });
            };

            sftpStream.on('STAT', (reqid, path) => handleStat(reqid, path));
            sftpStream.on('LSTAT', (reqid, path) => handleStat(reqid, path));

            sftpStream.on('FSTAT', (reqid, handle) => {
              const handleId = handle.toString();
              const handleInfo = openHandles.get(handleId);
              if (!handleInfo) {
                sftpStream.status(reqid, SFTP_STATUS.FAILURE);
                return;
              }

              const file = virtualFiles.get(handleInfo.path);
              if (!file) {
                sftpStream.status(reqid, SFTP_STATUS.NO_SUCH_FILE);
                return;
              }

              sftpStream.attrs(reqid, {
                mode: file.mode,
                size: file.size,
                atime: Math.floor(file.atime.getTime() / 1000),
                mtime: Math.floor(file.mtime.getTime() / 1000),
                uid: 0,
                gid: 0,
              });
            });
          });
        });
      });
    }
  );

  return new Promise<Server>((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      console.log(`Fake SSH/SFTP server running on port ${port}`);
      resolve(server);
    });
  });
}
