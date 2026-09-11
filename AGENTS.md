<!-- antislop:start -->
## antislop
For UI, copy, people, mobile layout, or code comments work, load the antislop skill for the task:
- Core filter, always on: `antislop`
- UI / visual: `antislop-ui`
- Copy & text: `antislop-copywriting`
- People: `antislop-human`
- Mobile / responsive: `antislop-layoutmobile`
- Code comments: `antislop-code`
Before starting, ask the user when antislop applies: during the work, or after it is done.
<!-- antislop:end -->

## Execution Guardrails & Anti-Loop Rules

### 1. Circuit Breaker (Max 2 Attempts)
- When debugging a build error or failing test, you have a **strict 2-attempt limit**.
- If a test or command still fails after 2 attempted fixes, **STOP immediately**.
- Do NOT guess, retry blindly, or attempt speculative rewrites.
- Present the exact failure output, the diff of what was tried, your analysis, and ask the user for guidance.

### 2. Environment First Before Code Edits
- Failures involving permissions, file access, ports, sockets, lingering processes, or timestamps are frequently environmental.
- Inspect system state first (`umask`, lingering background/mock processes, environment variables, system clock) before modifying application code or tests.
- Never weaken permission checks or security validations in code to bypass environment misconfigurations.

### 3. Scoped Test & Command Execution
- Always run narrowly targeted tests (e.g., `go test -v -run <SpecificTest> ./internal/<pkg>`) during development cycles.
- Only run the full test suite (`go test ./...`) when explicitly requested or at final verification.
- Always clean up background processes, test daemons, or mocks created during commands.

### 4. Code Editing Discipline
- Make atomic, clean edits using editor tools. Do NOT use shell heredoc hacks (`cat << 'EOF' | python3`) to rewrite code files over terminal sessions.
- Always inspect `git diff` after editing to ensure no stray characters, duplicate imports, or malformed syntax were introduced.

### 5. Memory & Tool Usage (`recall`)
- Never call the `recall` tool with keywords, topics, or names (e.g., `recall("cortana-server")` fails validation).
- `recall` ONLY accepts a specific 12-character lowercase hex ID (pattern `^[a-f0-9]{12}$`, e.g., `3f8a1c9b0e2d`) from compacted memory blocks or `/om:view`.
- To search files, configs, or codebase history, use standard grep, find, or view tools instead.
