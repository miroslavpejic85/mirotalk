# CoTURN Setup Guide

Set up `CoTURN` with Docker for NAT traversal and media relay in WebRTC applications.

---

## Installation Steps

### 1. Prepare Docker Compose

1. Copy the template:
    ```bash
    cp docker-compose.template.yml docker-compose.yml
    ```
2. Edit `docker-compose.yml` to fit your environment.
3. Use Let's Encrypt and Certbot for SSL certificates. Replace `YOUR.DOMAIN` in `docker-compose.yml` with your actual domain name.
    - Learn more about Let's Encrypt: [Click here](https://letsencrypt.org/).
    - Learn more about Certbot: [Click here](https://certbot.eff.org/).

### 2. Configure TURN Server

1. Copy the template:
    ```bash
    cp turnserver.template.conf turnserver.conf
    ```
2. Edit `turnserver.conf`:

    - Replace `YOUR.DOMAIN.NAME` with your domain.
    - Replace `YOUR.USERNAME` and `YOUR.PASSWORD` with your credentials.

    Example:

    ```text
    server-name=example.com
    realm=example.com
    user=username:password
    ```

### 3. Verify Files

Ensure `turnserver.conf` and `docker-compose.yml` are in the same directory.

### 4. Start the Server

Run:

```bash
docker-compose up -d
```

### 5. Check Logs (Optional)

Check logs to verify the server:

```bash
docker-compose logs -f
```

---

## Notes

- Open ports (e.g., 3478, 5349 for TURN) on your firewall.
- Use secure credentials.
- Test with a WebRTC application.

For more, visit the [official documentation](https://docs.mirotalk.com/coturn/installation/).
