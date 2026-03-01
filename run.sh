#!/usr/bin/env bash
# run.sh — Inicia backend y frontend del IQ Lab Simulator

set -uo pipefail
set -m  # Monitor mode: cada job en background corre en su propio process group

# ── Colores ───────────────────────────────────────────────────────────────────
GRN='\033[0;32m'; YLW='\033[1;33m'; RED='\033[0;31m'
BOLD='\033[1m'; DIM='\033[2m'; RST='\033[0m'

# ── Rutas ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/lab-simulator/backend"
FRONTEND_DIR="$SCRIPT_DIR/lab-simulator/frontend"
UVICORN="$SCRIPT_DIR/venv/bin/uvicorn"
BACKEND_LOG="/tmp/iq_backend.log"
FRONTEND_LOG="/tmp/iq_frontend.log"
BACKEND_PID=""
FRONTEND_PID=""

# ── Liberar puertos al arrancar (limpia procesos de sesiones anteriores) ───────
_free_port() {
  local port="$1"
  local pids
  pids=$(ss -tlnp "sport = :$port" 2>/dev/null \
    | grep -oP 'pid=\K[0-9]+' | sort -u)
  if [[ -n "$pids" ]]; then
    echo -e "  ${DIM}Liberando puerto $port (PIDs: $pids)${RST}"
    # shellcheck disable=SC2086
    kill -9 $pids 2>/dev/null || true
    sleep 0.4
  fi
}

# ── Limpieza ──────────────────────────────────────────────────────────────────
_CLEANING=0
cleanup() {
  [[ $_CLEANING -eq 1 ]] && return
  _CLEANING=1
  echo -e "\n${YLW}Deteniendo servicios...${RST}"
  _stop "backend"  "${BACKEND_PID:-}"
  _stop "frontend" "${FRONTEND_PID:-}"
  echo -e "${GRN}Listo.${RST}"
}
trap cleanup EXIT SIGINT SIGTERM

# Mata el process group completo del PID dado (set -m garantiza un group por job)
_stop() {
  local name="$1" pid="${2:-}"
  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    kill -- -"$pid" 2>/dev/null || kill "$pid" 2>/dev/null
    wait "$pid" 2>/dev/null || true
    echo -e "  ${DIM}$name detenido${RST}"
  fi
}

# ── Iniciar servicios ─────────────────────────────────────────────────────────
start_backend() {
  _stop "backend" "${BACKEND_PID:-}"
  : > "$BACKEND_LOG"
  (cd "$BACKEND_DIR" && "$UVICORN" main:app --reload --port 8000 >"$BACKEND_LOG" 2>&1) &
  BACKEND_PID=$!
  echo -e "${GRN}▶ Backend${RST}  → ${BOLD}http://localhost:8000${RST}  ${DIM}(PID $BACKEND_PID | $BACKEND_LOG)${RST}"
}

start_frontend() {
  _stop "frontend" "${FRONTEND_PID:-}"
  : > "$FRONTEND_LOG"
  (cd "$FRONTEND_DIR" && npm run dev >"$FRONTEND_LOG" 2>&1) &
  FRONTEND_PID=$!
  echo -e "${GRN}▶ Frontend${RST} → ${BOLD}http://localhost:5173${RST}  ${DIM}(PID $FRONTEND_PID | $FRONTEND_LOG)${RST}"
}

# ── Menú ──────────────────────────────────────────────────────────────────────
print_menu() {
  echo ""
  echo -e "  ${YLW}b${RST}  reiniciar backend    ${YLW}f${RST}  reiniciar frontend"
  echo -e "  ${YLW}r${RST}  reiniciar todo       ${YLW}l${RST}  ver logs"
  echo -e "  ${YLW}q${RST}  salir"
  echo ""
}

show_logs() {
  echo -e "\n${DIM}─── Backend (últimas 30 líneas) ────────────────────────${RST}"
  tail -n 30 "$BACKEND_LOG" 2>/dev/null || echo "  (sin logs aún)"
  echo -e "\n${DIM}─── Frontend (últimas 30 líneas) ───────────────────────${RST}"
  tail -n 30 "$FRONTEND_LOG" 2>/dev/null || echo "  (sin logs aún)"
  echo ""
}

# ── Main ──────────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}╔══════════════════════════════════╗${RST}"
echo -e "${BOLD}║    IQ App — Lab Simulator        ║${RST}"
echo -e "${BOLD}╚══════════════════════════════════╝${RST}\n"

# Limpiar puertos antes de arrancar para evitar conflictos tras Ctrl+Z
_free_port 8000
_free_port 5173

start_backend
start_frontend
print_menu

while true; do
  if ! read -rp "→ " cmd; then
    echo
    break
  fi
  case "$cmd" in
    b) start_backend                 ;;
    f) start_frontend                ;;
    r) start_backend; start_frontend ;;
    l) show_logs                     ;;
    q|"") break                      ;;
    *) echo -e "${RED}Desconocido: '$cmd'${RST}"; print_menu ;;
  esac
done
