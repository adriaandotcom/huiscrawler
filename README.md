## ⚙️ Deployment

The CI automatically builds and deploys the latest `main`.

### Server setup

The current production server is set up as follows:

Create an ssh key pair for GitHub Actions to use (do not use yourself):

```bash
ssh-keygen -t ed25519 -C "ci@adriaan.company" -f ci_key
```

Copy the contents of the file `ci_key` to a GitHub Actions secret named `DEPLOY_SSH_KEY`.

Next copy contents of `ci_key.pub` and edit `~/.ssh/authorized_keys` on the server:

```
# GitHub Action user. Restrict and command options are used to sucurely limit permissions!
restrict,command="/home/user/huiscrawler/deploy" <contents of ci_key.pub>
```

Make sure to run `sudo systemctl restart sshd` to reload the authorized_keys file.

Finally, prepare initial deploy config:

```bash
ssh user@server.adriaan.company mkdir -p /home/user/huiscrawler
scp .env.production user@server.adriaan.company:huiscrawler/.env
scp docker-compose.yml user@server.adriaan.company:huiscrawler/docker-compose.yml
scp deploy user@server.adriaan.company:huiscrawler/deploy

# Create a personal access token with read access to container images
# Username is USERNAME, do not edit
ssh user@server.adriaan.company
docker login ghcr.io -u USERNAME
```

After that you can deploy normally from ci.

### Change env variables or compose file

After changing config in `.env.production` or `docker-compose.yml` copy the file to the server with:

```bash
scp .env.production user@server.adriaan.company:huiscrawler/.env
```

Then do a regular deploy or run `docker-compose up -d` on the server.
