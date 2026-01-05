# Self-Hosted Judge0 Setup Guide

This guide will help you set up a self-hosted Judge0 instance using Docker and integrate it with your CodeView project.

## Prerequisites

- Docker Desktop installed on Windows
- Docker Compose (comes with Docker Desktop)
- At least 4GB of free RAM
- 10GB of free disk space

## Step 1: Install Docker Desktop

1. Download Docker Desktop from [docker.com](https://www.docker.com/products/docker-desktop/)
2. Install and start Docker Desktop
3. Verify installation:
   ```powershell
   docker --version
   docker-compose --version
   ```

## Step 2: Create Judge0 Directory

Create a new directory for Judge0 in your project:

```powershell
cd c:\Users\vishu\Desktop
mkdir judge0-server
cd judge0-server
```

## Step 3: Create Docker Compose File

Create a file named `docker-compose.yml` with the following content:

```yaml
version: '3.7'

x-logging:
  &default-logging
  driver: json-file
  options:
    max-size: 100M

services:
  server:
    image: judge0/judge0:1.13.0
    volumes:
      - ./judge0.conf:/judge0.conf:ro
    ports:
      - "2358:2358"
    privileged: true
    logging: *default-logging
    restart: always
    environment:
      - REDIS_HOST=redis
      - POSTGRES_HOST=db
      - POSTGRES_DB=judge0
      - POSTGRES_USER=judge0
      - POSTGRES_PASSWORD=YourSecurePassword123
    depends_on:
      - db
      - redis

  workers:
    image: judge0/judge0:1.13.0
    command: ["./scripts/workers"]
    volumes:
      - ./judge0.conf:/judge0.conf:ro
    privileged: true
    logging: *default-logging
    restart: always
    environment:
      - REDIS_HOST=redis
      - POSTGRES_HOST=db
      - POSTGRES_DB=judge0
      - POSTGRES_USER=judge0
      - POSTGRES_PASSWORD=YourSecurePassword123
    depends_on:
      - db
      - redis

  db:
    image: postgres:13.0
    env_file: judge0.conf
    volumes:
      - postgres-data:/var/lib/postgresql/data/
    logging: *default-logging
    restart: always
    environment:
      - POSTGRES_DB=judge0
      - POSTGRES_USER=judge0
      - POSTGRES_PASSWORD=YourSecurePassword123

  redis:
    image: redis:6.0
    command: [
      "bash", "-c",
      'docker-entrypoint.sh --appendonly yes --requirepass "YourRedisPassword123"'
    ]
    volumes:
      - redis-data:/data
    logging: *default-logging
    restart: always

volumes:
  postgres-data:
  redis-data:
```

## Step 4: Create Judge0 Configuration File

Create a file named `judge0.conf` in the same directory:

```conf
################################################################################
# Judge0 Configuration File
################################################################################

# Redis Configuration
REDIS_PASSWORD=YourRedisPassword123

# PostgreSQL Configuration
POSTGRES_PASSWORD=YourSecurePassword123

# Judge0 Configuration
ENABLE_WAIT_RESULT=true
ENABLE_COMPILER_OPTIONS=true
ALLOWED_LANGUAGES_FOR_COMPILE_OPTIONS=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91

# Submission Configuration
MAX_QUEUE_SIZE=100
MAX_CPU_TIME_LIMIT=15
MAX_MAX_CPU_TIME_LIMIT=150
MAX_WALL_TIME_LIMIT=20
MAX_MAX_WALL_TIME_LIMIT=150
MAX_MEMORY_LIMIT=128000
MAX_MAX_MEMORY_LIMIT=512000
MAX_STACK_LIMIT=128000
MAX_MAX_STACK_LIMIT=128000
MAX_MAX_PROCESSES_AND_OR_THREADS=60
MAX_MAX_FILE_SIZE=1024
MAX_NUMBER_OF_RUNS=20
MAX_MAX_NUMBER_OF_RUNS=20
MAX_REDIRECT_STDERR_TO_STDOUT=true
MAX_MAX_REDIRECT_STDERR_TO_STDOUT=true
MAX_ENABLE_PER_PROCESS_AND_THREAD_TIME_LIMIT=true
MAX_MAX_ENABLE_PER_PROCESS_AND_THREAD_TIME_LIMIT=true
MAX_ENABLE_PER_PROCESS_AND_THREAD_MEMORY_LIMIT=true
MAX_MAX_ENABLE_PER_PROCESS_AND_THREAD_MEMORY_LIMIT=true
ENABLE_ADDITIONAL_FILES=true

# Authentication (Optional - for production use)
# AUTHENTICATION_TOKEN_SECRET=your_secret_token_here
# Uncomment and set a secret token for production
```

## Step 5: Start Judge0

Run the following commands:

```powershell
# Start Judge0 services
docker-compose up -d

# Check if services are running
docker-compose ps

# View logs
docker-compose logs -f
```

Wait for all services to start (this may take 2-3 minutes on first run).

## Step 6: Test Judge0 Installation

Test if Judge0 is working:

```powershell
# Test endpoint
curl http://localhost:2358/about
```

You should see JSON response with Judge0 version information.

## Step 7: Configure Your CodeView Backend

Update your `backend/.env` file:

```bash
# Judge0 Self-Hosted Configuration
JUDGE0_API_URL=http://localhost:2358
JUDGE0_API_KEY=
JUDGE0_API_HOST=

# Leave JUDGE0_API_KEY and JUDGE0_API_HOST empty for self-hosted without authentication
```

## Step 8: Update judge0Config.js (Optional)

If you want to add authentication to your self-hosted Judge0, update the configuration:

1. Uncomment `AUTHENTICATION_TOKEN_SECRET` in `judge0.conf`
2. Set a secure token
3. Restart Judge0: `docker-compose restart`
4. Update your `.env` file with the token as `JUDGE0_API_KEY`

## Step 9: Restart Your Backend

```powershell
# Stop current backend
# Press Ctrl+C in the terminal running npm start

# Start backend again
cd c:\Users\vishu\Desktop\codeview-main\backend
npm start
```

## Step 10: Test the Integration

1. Open your CodeView application
2. Select a language (e.g., Python)
3. Write some code:
   ```python
   print("Hello from self-hosted Judge0!")
   ```
4. Click "Run"
5. You should see the output!

## Managing Judge0

### Stop Judge0
```powershell
cd c:\Users\vishu\Desktop\judge0-server
docker-compose down
```

### Start Judge0
```powershell
cd c:\Users\vishu\Desktop\judge0-server
docker-compose up -d
```

### View Logs
```powershell
docker-compose logs -f server
docker-compose logs -f workers
```

### Update Judge0
```powershell
docker-compose pull
docker-compose up -d
```

### Remove Everything (including data)
```powershell
docker-compose down -v
```

## Troubleshooting

### Issue: Services won't start
- **Solution**: Make sure Docker Desktop is running
- Check if ports 2358, 5432, 6379 are not in use by other applications

### Issue: "Connection refused" error
- **Solution**: Wait 2-3 minutes for all services to fully start
- Check logs: `docker-compose logs -f`

### Issue: Submissions stuck in queue
- **Solution**: Check workers are running: `docker-compose ps`
- Restart workers: `docker-compose restart workers`

### Issue: Out of memory errors
- **Solution**: Increase Docker Desktop memory limit (Settings > Resources > Memory)
- Recommended: At least 4GB

## Performance Optimization

For better performance on Windows:

1. **Enable WSL 2 Backend** in Docker Desktop settings
2. **Increase Resources**:
   - Memory: 4-6 GB
   - CPU: 2-4 cores
3. **Use SSD** for Docker data storage

## Security Considerations

For production use:

1. **Enable Authentication**: Uncomment and set `AUTHENTICATION_TOKEN_SECRET` in `judge0.conf`
2. **Change Default Passwords**: Update Redis and PostgreSQL passwords
3. **Use HTTPS**: Set up a reverse proxy (nginx) with SSL
4. **Firewall**: Only expose port 2358 to your backend server
5. **Resource Limits**: Adjust CPU and memory limits in `judge0.conf`

## Advantages of Self-Hosting

✅ **No Rate Limits**: Execute unlimited code submissions
✅ **Full Control**: Customize time limits, memory limits, and supported languages
✅ **Privacy**: Code never leaves your infrastructure
✅ **Cost Effective**: No monthly API fees
✅ **Low Latency**: Faster execution (local network)

## Disadvantages

❌ **Maintenance**: You need to manage and update the service
❌ **Resources**: Requires dedicated server resources
❌ **Security**: You're responsible for security and isolation
❌ **Complexity**: More complex setup than using RapidAPI

## Next Steps

Once Judge0 is running:

1. Test all supported languages
2. Configure custom time/memory limits if needed
3. Set up monitoring (optional)
4. Configure backups for PostgreSQL data (optional)
5. Consider setting up authentication for production

## Support

- Judge0 Documentation: https://github.com/judge0/judge0/blob/master/README.md
- Judge0 Issues: https://github.com/judge0/judge0/issues
- Docker Documentation: https://docs.docker.com/
