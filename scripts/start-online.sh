#!/bin/zsh

set -euo pipefail

PROJECT_DIR="/Users/danrapoport/patient-tasks"
HOST="127.0.0.1"
PORT="3300"
LOCAL_URL="http://${HOST}:${PORT}"
SERVER_LOG="${PROJECT_DIR}/patient-tasks-online.log"
SERVER_PID_FILE="${PROJECT_DIR}/patient-tasks-online.pid"
TUNNEL_LOG="${PROJECT_DIR}/patient-tasks-tunnel.log"
TUNNEL_PID_FILE="${PROJECT_DIR}/patient-tasks-tunnel.pid"
LEGACY_LOCAL_PID_FILE="${PROJECT_DIR}/patient-tasks-launch.pid"
ENV_FILE="${PROJECT_DIR}/.online-env"
CLOUDFLARED_BIN="${PROJECT_DIR}/bin/cloudflared"
DESKTOP_INFO_FILE="${HOME}/Desktop/הספר - גישה אונליין.txt"
PROJECT_INFO_FILE="${PROJECT_DIR}/online-access.txt"

generate_access_code() {
  local prefix="${1:-}"
  python3 - "${prefix}" <<'PY'
import sys
import secrets
prefix = sys.argv[1].strip()
adjectives = ["calm", "clear", "safe", "swift", "bright", "steady", "quiet", "kind"]
nouns = ["book", "ward", "round", "desk", "shift", "team", "task", "list"]
code = f"{secrets.choice(adjectives)}-{secrets.choice(nouns)}-{secrets.randbelow(9000)+1000}"
if prefix:
    print(f"{prefix}-{code}")
else:
    print(code)
PY
}

alert_user() {
  local message="$1"
  osascript - "${message}" <<'APPLESCRIPT' >/dev/null 2>&1 || true
on run argv
  display alert "הספר - אונליין" message (item 1 of argv) as critical
end run
APPLESCRIPT
}

load_node() {
  export NVM_DIR="${HOME}/.nvm"
  if [[ ! -s "${NVM_DIR}/nvm.sh" ]]; then
    alert_user "Node.js setup is missing. Please contact support."
    exit 1
  fi

  # shellcheck disable=SC1090
  . "${NVM_DIR}/nvm.sh"
  nvm use 22 >/dev/null
}

generate_online_env() {
  python3 - <<'PY' > "${ENV_FILE}"
import secrets
adjectives = ["calm", "clear", "safe", "swift", "bright", "steady", "quiet", "kind"]
nouns = ["book", "ward", "round", "desk", "shift", "team", "task", "list"]
department_code = f"{secrets.choice(adjectives)}-{secrets.choice(nouns)}-{secrets.randbelow(9000)+1000}"
print(f"APP_ACCESS_CODE='{department_code}'")
print("APP_ADMIN_USERNAME='nes-dr'")
print("APP_ADMIN_PASSWORD='neuro135'")
print(f"APP_SESSION_SECRET='{secrets.token_hex(32)}'")
PY
  chmod 600 "${ENV_FILE}"
}

load_online_env() {
  if [[ ! -f "${ENV_FILE}" ]]; then
    generate_online_env
  fi

  # shellcheck disable=SC1090
  . "${ENV_FILE}"

  if [[ -z "${APP_ACCESS_CODE:-}" || -z "${APP_SESSION_SECRET:-}" ]]; then
    alert_user "The online access file is incomplete. Please contact support."
    exit 1
  fi

  if [[ -z "${APP_ADMIN_USERNAME:-}" ]]; then
    APP_ADMIN_USERNAME="nes-dr"
    printf "\nAPP_ADMIN_USERNAME='%s'\n" "${APP_ADMIN_USERNAME}" >> "${ENV_FILE}"
  fi

  if [[ -z "${APP_ADMIN_PASSWORD:-}" ]]; then
    APP_ADMIN_PASSWORD="neuro135"
    printf "\nAPP_ADMIN_PASSWORD='%s'\n" "${APP_ADMIN_PASSWORD}" >> "${ENV_FILE}"
    chmod 600 "${ENV_FILE}"
  fi
}

process_matches_project() {
  local pid="$1"
  local command=""
  command="$(ps -p "${pid}" -o command= 2>/dev/null || true)"
  [[ -n "${command}" && "${command}" == *"${PROJECT_DIR}/server.js"* ]]
}

start_detached_process() {
  local pid_file="$1"
  local log_file="$2"
  shift 2

  python3 - "$pid_file" "$log_file" "$@" <<'PY'
import os
import subprocess
import sys

pid_file, log_file, *command = sys.argv[1:]

with open(log_file, "ab", buffering=0) as log_handle, open(os.devnull, "rb") as devnull:
    process = subprocess.Popen(
        command,
        stdin=devnull,
        stdout=log_handle,
        stderr=subprocess.STDOUT,
        start_new_session=True,
    )

with open(pid_file, "w", encoding="utf-8") as pid_handle:
    pid_handle.write(str(process.pid))
PY
}

stop_pid_file_process() {
  local pid_file="$1"
  if [[ ! -f "${pid_file}" ]]; then
    return
  fi

  local pid=""
  pid="$(cat "${pid_file}" 2>/dev/null || true)"
  if [[ -n "${pid}" ]] && kill -0 "${pid}" 2>/dev/null; then
    kill "${pid}" 2>/dev/null || true
    sleep 1
  fi
  rm -f "${pid_file}"
}

stop_existing_project_servers() {
  stop_pid_file_process "${SERVER_PID_FILE}"
  stop_pid_file_process "${LEGACY_LOCAL_PID_FILE}"

  local pid=""
  for port in 3100 3300; do
    pid="$(lsof -t -iTCP:${port} -sTCP:LISTEN 2>/dev/null | head -n 1 || true)"
    if [[ -n "${pid}" ]] && process_matches_project "${pid}"; then
      kill "${pid}" 2>/dev/null || true
      sleep 1
    fi
  done
}

server_ready() {
  local code=""
  code="$(curl -s -o /dev/null -w '%{http_code}' "${LOCAL_URL}/api/session" || true)"
  [[ "${code}" == "200" || "${code}" == "401" ]]
}

start_server() {
  stop_existing_project_servers
  : > "${SERVER_LOG}"

  start_detached_process "${SERVER_PID_FILE}" "${SERVER_LOG}" env \
    HOST="${HOST}" \
    PORT="${PORT}" \
    APP_ACCESS_CODE="${APP_ACCESS_CODE}" \
    APP_ADMIN_USERNAME="${APP_ADMIN_USERNAME}" \
    APP_ADMIN_PASSWORD="${APP_ADMIN_PASSWORD}" \
    APP_SESSION_SECRET="${APP_SESSION_SECRET}" \
    node "${PROJECT_DIR}/server.js"

  for _ in {1..30}; do
    if server_ready; then
      return
    fi
    sleep 1
  done

  alert_user "The online server did not finish starting. Please check patient-tasks-online.log."
  exit 1
}

ensure_cloudflared() {
  if [[ -x "${CLOUDFLARED_BIN}" ]]; then
    return
  fi

  mkdir -p "${PROJECT_DIR}/bin"

  local arch
  local url
  local temp_dir
  arch="$(uname -m)"
  temp_dir="$(mktemp -d)"

  if [[ "${arch}" == "arm64" ]]; then
    url="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-arm64.tgz"
  else
    url="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64.tgz"
  fi

  curl -L "${url}" -o "${temp_dir}/cloudflared.tgz"
  tar -xzf "${temp_dir}/cloudflared.tgz" -C "${temp_dir}"
  mv "${temp_dir}/cloudflared" "${CLOUDFLARED_BIN}"
  chmod +x "${CLOUDFLARED_BIN}"
  rm -rf "${temp_dir}"
}

extract_public_url() {
  grep -Eo 'https://[-a-z0-9]+\.trycloudflare\.com' "${TUNNEL_LOG}" 2>/dev/null | tail -n 1 || true
}

start_tunnel() {
  stop_pid_file_process "${TUNNEL_PID_FILE}"
  : > "${TUNNEL_LOG}"

  start_detached_process "${TUNNEL_PID_FILE}" "${TUNNEL_LOG}" "${CLOUDFLARED_BIN}" tunnel --no-autoupdate --url "${LOCAL_URL}"

  local public_url=""
  for _ in {1..40}; do
    public_url="$(extract_public_url)"
    if [[ -n "${public_url}" ]]; then
      echo "${public_url}"
      return
    fi
    sleep 1
  done

  alert_user "The internet tunnel did not finish starting. Please check patient-tasks-tunnel.log."
  exit 1
}

write_share_file() {
  local public_url="$1"
  mkdir -p "$(dirname "${DESKTOP_INFO_FILE}")"
  cat > "${PROJECT_INFO_FILE}" <<EOF
הספר - משימות המחלקה

Local address on this Mac:
${LOCAL_URL}

Shared internet address:
${public_url}

Admin username:
${APP_ADMIN_USERNAME}

Notes:
- Everyone who should work together must use the same shared address above.
- Each staff member should open the link, choose "צור משתמש חדש", and wait for admin approval.
- After approval, staff members log in with their own Hebrew name and password.
- The admin logs in with the private username/password configured on this Mac.
- Changes should appear live across the connected devices.
- This shared link stays active while this Mac and the online launcher remain running.
EOF
  cp "${PROJECT_INFO_FILE}" "${DESKTOP_INFO_FILE}"
}

main() {
  cd "${PROJECT_DIR}"
  load_node
  load_online_env
  start_server
  ensure_cloudflared

  local public_url
  public_url="$(start_tunnel)"
  write_share_file "${public_url}"

  printf '%s' "${public_url}" | pbcopy || true
  open -a "Google Chrome" "${LOCAL_URL}" || open "${LOCAL_URL}" || true

  osascript - "${public_url}" "${APP_ADMIN_USERNAME}" <<'APPLESCRIPT' >/dev/null 2>&1 || true
on run argv
  display dialog "The online link is ready and was copied to the clipboard." & return & return & (item 1 of argv) & return & return & "Staff members now create their own Hebrew-name account inside the app and wait for admin approval." & return & return & "Admin username:" & return & (item 2 of argv) & return & return & "A text file with the same details was saved on your Desktop." buttons {"OK"} default button "OK"
end run
APPLESCRIPT

  echo "PUBLIC_URL=${public_url}"
  echo "ADMIN_USERNAME=${APP_ADMIN_USERNAME}"
}

main "$@"
