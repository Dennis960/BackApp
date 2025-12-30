import type { Server } from 'ssh2';
import ssh2 from 'ssh2';

export const privateKey = `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACCiAcnkgsR9+W7N2JxZePG/iNFSC6kedIk81lEt49lFywAAAKh3i0Tqd4tE
6gAAAAtzc2gtZWQyNTUxOQAAACCiAcnkgsR9+W7N2JxZePG/iNFSC6kedIk81lEt49lFyw
AAAEAPwzooSHy4SeVAneStkNcJXeeAuepaii84+tl6C4XZE6IByeSCxH35bs3YnFl48b+I
0VILqR50iTzWUS3j2UXLAAAAHmRlbm5pc0BkZW5uaXMtQjY1MC1HQU1JTkctWC1BWAECAw
QFBgc=
-----END OPENSSH PRIVATE KEY-----`
export const allowedPubKey = `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKIByeSCxH35bs3YnFl48b+I0VILqR50iTzWUS3j2UXL test@key`;

export async function startFakeSSHServer(port = 2222, username = 'root', password = 'passwd', testFilePath = '/testfile.txt'): Promise<Server> {
  const server = new ssh2.Server({
    hostKeys: [privateKey],
  }, (client) => {
    client.on('authentication', (ctx) => {
      if (ctx.method === 'password' && ctx.username === username && ctx.password === password) {
        return ctx.accept();
      } else if (ctx.method === 'publickey' && ctx.username === username) {
        const clientKey = ctx.key.data.toString('base64');

        if (clientKey === Buffer.from(allowedPubKey.split(' ')[1], 'base64').toString('base64')) {
          return ctx.accept();
        }
      }
      ctx.reject(['password', 'publickey']);
    }).on('ready', () => {
      client.on('session', (accept) => {
        const session = accept();
        // Handle shell requests
        session.on('shell', (accept, reject) => {
          const stream = accept();
          stream.write('Welcome to your Node SSH server!\n');
          stream.on('data', (data: Buffer) => {
            // Echo back what the client types
            stream.write(`You said: ${data}`);
          });
          stream.on('close', () => {
            console.log('Shell closed');
          });
        });
        session.on('exec', (accept, reject, info) => {
          const stream = accept();
          console.log(`Exec request: ${info.command}`);
          // Echo the command back
          stream.write(`You ran: ${info.command}\n`);
          stream.exit(0);
          stream.end();
        });
        session.on('sftp', (accept) => {
          const sftpStream = accept();
          // Serve files from a local test directory
          sftpStream.on('OPEN', (reqid, filename, flags, attrs) => {
            if (filename === testFilePath) {
              const handle = Buffer.from('Hello, World!');
              sftpStream.handle(reqid, handle);
            } else {
              sftpStream.status(reqid, 2); // NO_SUCH_FILE
            }
          });
        });
      });
    });
  });

  return new Promise<Server>((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      console.log(`Fake SSH/SFTP server running on port ${port}`);
      resolve(server);
    });
  });
}
