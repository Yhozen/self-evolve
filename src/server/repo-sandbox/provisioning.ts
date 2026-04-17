type ProvisionMode = "fresh" | "restored";

const BREW_INSTALL_URL =
  "https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh";

function buildPostSwitchInstallScript() {
  return [
    "set -euo pipefail",
    "",
    "if [ -f package.json ]; then",
    "  corepack enable >/dev/null 2>&1 || true",
    "  pnpm install --frozen-lockfile=false",
    "fi",
  ].join("\n");
}

function buildSharedSetupScript(opencodeBin: string) {
  return [
    "set -euo pipefail",
    "",
    "if ! command -v brew >/dev/null 2>&1; then",
    `  NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL ${BREW_INSTALL_URL})"`,
    "fi",
    "",
    "if [ -x /home/linuxbrew/.linuxbrew/bin/brew ]; then",
    '  eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"',
    "elif [ -x /opt/homebrew/bin/brew ]; then",
    '  eval "$(/opt/homebrew/bin/brew shellenv)"',
    "elif [ -x /usr/local/bin/brew ]; then",
    '  eval "$(/usr/local/bin/brew shellenv)"',
    "fi",
    "",
    "if ! command -v brew >/dev/null 2>&1; then",
    '  echo "Homebrew is unavailable after installation." >&2',
    "  exit 1",
    "fi",
    "",
    `if ! [ -x "${opencodeBin}" ]; then`,
    "  curl -fsSL https://opencode.ai/install | bash",
    "fi",
    "",
    "if ! command -v wt >/dev/null 2>&1; then",
    "  brew install worktrunk",
    "fi",
    "",
    "wt config shell install || true",
    "",
    'POST_SWITCH_SCRIPT="$(mktemp)"',
    "cat > \"$POST_SWITCH_SCRIPT\" <<'EOF'",
    buildPostSwitchInstallScript(),
    "EOF",
    'chmod +x "$POST_SWITCH_SCRIPT"',
  ].join("\n");
}

function buildFreshBranchScript() {
  return [
    'if [ -n "$REQUESTED_BRANCH" ]; then',
    '  CURRENT_BRANCH="$(git branch --show-current || true)"',
    '  if [ "$CURRENT_BRANCH" != "$REQUESTED_BRANCH" ]; then',
    '    if git show-ref --verify --quiet "refs/heads/$REQUESTED_BRANCH"; then',
    '      wt switch "$REQUESTED_BRANCH" --execute "$POST_SWITCH_SCRIPT"',
    "    else",
    '      wt switch --create "$REQUESTED_BRANCH" --execute "$POST_SWITCH_SCRIPT"',
    "    fi",
    "    exit $?",
    "  fi",
    "fi",
  ].join("\n");
}

function buildRestoredBranchScript() {
  return [
    'if [ -n "$REQUESTED_BRANCH" ]; then',
    '  CURRENT_BRANCH="$(git branch --show-current || true)"',
    '  if [ "$CURRENT_BRANCH" != "$REQUESTED_BRANCH" ]; then',
    '    if git show-ref --verify --quiet "refs/heads/$REQUESTED_BRANCH"; then',
    '      wt switch "$REQUESTED_BRANCH" --execute "$POST_SWITCH_SCRIPT"',
    "      exit $?",
    "    fi",
    "",
    '    echo "Baseline branch mismatch: snapshot is on $BASELINE_BRANCH and local branch $REQUESTED_BRANCH is not available. Create a fresh sandbox for a new branch." >&2',
    "    exit 1",
    "  fi",
    "fi",
  ].join("\n");
}

export function buildRepoProvisionScript(input: {
  baselineBranch?: string;
  mode: ProvisionMode;
  opencodeBin: string;
}) {
  return [
    buildSharedSetupScript(input.opencodeBin),
    "",
    input.mode === "fresh"
      ? buildFreshBranchScript()
      : buildRestoredBranchScript(),
    "",
    '"$POST_SWITCH_SCRIPT"',
  ].join("\n");
}
