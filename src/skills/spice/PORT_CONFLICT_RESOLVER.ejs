---
name: port-conflict-resolver
description: Detects and resolves port conflicts when development servers fail to start. Activates when port conflict errors occur or when checking port availability. Identifies processes using ports and suggests solutions.
allowed-tools: [Bash]
---

# SPICE Port Conflict Resolver Skill

Resolves "Address already in use" errors by detecting port conflicts and providing solutions to free occupied ports.

## Activation Triggers

This skill automatically activates when:
- Development server fails with "EADDRINUSE" error
- Port already in use errors occur
- User requests port availability check
- Starting multiple services on same machine

## Parse Port from Error Message

```bash
parse_port_from_error() {
    local error_message="$1"

    echo "=== Parsing Port Number ==="

    # Common error patterns
    PORT=$(echo "$error_message" | grep -oE "port [0-9]+" | grep -oE "[0-9]+")

    if [ -z "$PORT" ]; then
        PORT=$(echo "$error_message" | grep -oE ":[0-9]+" | grep -oE "[0-9]+")
    fi

    if [ -z "$PORT" ]; then
        PORT=$(echo "$error_message" | grep -oE "EADDRINUSE.*[0-9]+" | grep -oE "[0-9]+$")
    fi

    if [ -n "$PORT" ]; then
        echo "✅ Detected port: $PORT"
        export PORT
        return 0
    else
        echo "⚠️  Could not parse port from error"
        return 1
    fi
}
```

## Find Process Using Port

```bash
find_process_on_port() {
    local port="$1"

    echo "=== Finding Process on Port $port ==="

    # macOS/Linux: lsof
    if command -v lsof &> /dev/null; then
        PID=$(lsof -ti :"$port" 2>/dev/null)

        if [ -n "$PID" ]; then
            echo "✅ Found process using port $port:"
            echo ""
            ps -p "$PID" -o pid,user,command
            echo ""
            export PID
            return 0
        fi
    fi

    # Fallback: netstat
    if command -v netstat &> /dev/null; then
        NETSTAT_OUT=$(netstat -tuln 2>/dev/null | grep ":$port")

        if [ -n "$NETSTAT_OUT" ]; then
            echo "✅ Port $port is in use:"
            echo "$NETSTAT_OUT"
            return 0
        fi
    fi

    echo "ℹ️  Port $port appears to be free"
    return 1
}
```

## Show Process Details

```bash
show_process_details() {
    local pid="$1"

    if [ -z "$pid" ]; then
        echo "No PID provided"
        return 1
    fi

    echo "=== Process Details ==="
    echo ""
    echo "PID: $pid"
    ps -p "$pid" -o pid,ppid,user,%cpu,%mem,command
    echo ""

    # Show listening ports for this process
    if command -v lsof &> /dev/null; then
        echo "Listening ports:"
        lsof -p "$pid" -a -i -sTCP:LISTEN 2>/dev/null | grep LISTEN
    fi

    echo ""
}
```

## Suggest Solutions

```bash
suggest_solutions() {
    local port="$1"
    local pid="$2"

    echo "=== Suggested Solutions ==="
    echo ""

    if [ -n "$pid" ]; then
        echo "Option 1: Kill the process using port $port"
        echo "  kill -9 $pid"
        echo ""

        echo "Option 2: Gracefully stop the process"
        echo "  kill $pid"
        echo "  # Wait a few seconds, then verify:"
        echo "  lsof -ti :$port"
        echo ""
    fi

    echo "Option 3: Use an alternative port"
    NEXT_PORT=$((port + 1))
    echo "  PORT=$NEXT_PORT npm start"
    echo "  # or update your configuration file"
    echo ""

    echo "Option 4: Update configuration to use new port"
    echo "  # package.json:"
    echo '  "scripts": { "start": "PORT='"$NEXT_PORT"' node server.js" }'
    echo ""
    echo "  # .env file:"
    echo "  PORT=$NEXT_PORT"
    echo ""
}
```

## Verify Port Available

```bash
verify_port_available() {
    local port="$1"

    echo "=== Verifying Port $port Availability ==="

    if lsof -ti :"$port" &> /dev/null; then
        echo "❌ Port $port is still in use"
        lsof -ti :"$port" | xargs -I {} ps -p {} -o pid,command
        return 1
    else
        echo "✅ Port $port is now available"
        return 0
    fi
}
```

## Kill Process on Port

```bash
kill_process_on_port() {
    local port="$1"
    local force="${2:-false}"

    echo "=== Stopping Process on Port $port ==="

    PID=$(lsof -ti :"$port" 2>/dev/null)

    if [ -z "$PID" ]; then
        echo "ℹ️  No process found on port $port"
        return 0
    fi

    echo "Found process: $PID"
    ps -p "$PID" -o pid,user,command

    if [ "$force" = "true" ]; then
        echo "Force killing process $PID..."
        kill -9 "$PID" || {
            echo "ERROR: Failed to kill process"
            return 1
        }
    else
        echo "Gracefully stopping process $PID..."
        kill "$PID" || {
            echo "ERROR: Failed to stop process"
            return 1
        }

        # Wait for process to stop
        sleep 2
    fi

    # Verify process stopped
    if ps -p "$PID" &> /dev/null; then
        echo "⚠️  Process still running, may need force kill"
        return 1
    else
        echo "✅ Process stopped successfully"
        return 0
    fi
}
```

## Find Available Port

```bash
find_available_port() {
    local start_port="${1:-3000}"
    local max_attempts=100

    echo "=== Finding Available Port Starting from $start_port ==="

    for ((i=0; i<max_attempts; i++)); do
        PORT=$((start_port + i))

        if ! lsof -ti :"$PORT" &> /dev/null; then
            echo "✅ Found available port: $PORT"
            export AVAILABLE_PORT=$PORT
            return 0
        fi
    done

    echo "ERROR: Could not find available port after $max_attempts attempts"
    return 1
}
```

## Complete Resolution Workflow

```bash
#!/bin/bash
# Complete port conflict resolution workflow

PORT_OR_ERROR="$1"
ACTION="${2:-suggest}"  # suggest, kill, or find

if [ -z "$PORT_OR_ERROR" ]; then
    echo "Usage: $0 <port|error_message> [suggest|kill|find]"
    echo ""
    echo "Examples:"
    echo "  $0 3000 suggest          # Show solutions for port 3000"
    echo "  $0 3000 kill             # Kill process on port 3000"
    echo "  $0 3000 find             # Find alternative port"
    echo '  $0 "EADDRINUSE :::3000"  # Parse port from error'
    exit 1
fi

echo "╔════════════════════════════════════════╗"
echo "║  SPICE Port Conflict Resolver          ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Parse port number
if [[ "$PORT_OR_ERROR" =~ ^[0-9]+$ ]]; then
    PORT="$PORT_OR_ERROR"
else
    parse_port_from_error "$PORT_OR_ERROR" || {
        echo "ERROR: Could not parse port number"
        exit 1
    }
fi

# Find process on port
find_process_on_port "$PORT"
PROCESS_FOUND=$?

if [ $PROCESS_FOUND -eq 0 ] && [ -n "$PID" ]; then
    show_process_details "$PID"
fi

# Execute action
case "$ACTION" in
    suggest)
        suggest_solutions "$PORT" "$PID"
        ;;

    kill)
        if [ -z "$PID" ]; then
            echo "ℹ️  No process to kill on port $PORT"
            exit 0
        fi

        kill_process_on_port "$PORT" false || {
            echo "⚠️  Graceful stop failed, trying force kill..."
            kill_process_on_port "$PORT" true
        }

        verify_port_available "$PORT"
        ;;

    find)
        find_available_port "$PORT"
        echo ""
        echo "Use alternative port: $AVAILABLE_PORT"
        echo "  PORT=$AVAILABLE_PORT npm start"
        ;;

    *)
        echo "ERROR: Unknown action: $ACTION"
        echo "Valid actions: suggest, kill, find"
        exit 1
        ;;
esac

echo ""
echo "=== Summary ==="
if [ "$ACTION" = "kill" ]; then
    echo "✅ Port $PORT resolved"
elif [ "$ACTION" = "find" ]; then
    echo "✅ Alternative port: $AVAILABLE_PORT"
else
    echo "ℹ️  Review solutions above and choose appropriate action"
fi
echo ""
```

## Common Issues and Solutions

### Issue: Permission denied when killing process

**Cause:** Process owned by different user or system

**Solution:**
```bash
# Use sudo for system processes
sudo kill -9 <PID>

# Or start your service on a different port (>1024)
PORT=3001 npm start
```

### Issue: Process keeps restarting after kill

**Cause:** Process manager (PM2, systemd) or nodemon watching

**Solution:**
```bash
# Stop process manager first
pm2 stop all
# or
systemctl stop myservice

# Then kill the port
lsof -ti :3000 | xargs kill -9
```

### Issue: lsof command not found

**Cause:** lsof not installed (rare on macOS/Linux)

**Solution:**
```bash
# Use netstat instead
netstat -tuln | grep :3000

# Or install lsof
# macOS: brew install lsof
# Linux: apt-get install lsof
```

## Validation Checklist

Before starting development server, verify:

- [ ] Port number identified from error or configuration
- [ ] Process using port identified (if any)
- [ ] Process details reviewed (not critical system service)
- [ ] Appropriate solution selected (kill vs alternative port)
- [ ] Port verified available after resolution
- [ ] Development server starts successfully

## Integration with SPICE Workflow

This skill integrates at key points:

1. **Development Setup**: Check ports before starting services
2. **Error Recovery**: Quick resolution when services fail to start
3. **Multi-Service Development**: Manage multiple services on different ports
4. **Team Environments**: Prevent port conflicts across team members

Port conflict resolution unblocks development quickly by identifying and resolving "Address already in use" errors systematically.

## References

- SPICE Environment Setup: `~/.claude/docs/spice/CLAUDE-IMPORT.md#environment-setup`
- Worktree Setup Skill: `~/.claude/skills/spice/WORKTREE_SETUP.md`
