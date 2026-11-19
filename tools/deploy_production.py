"""Send a pair of build artifacts to the restricted VPS deployment command."""

import argparse
import json
import os
import re
import secrets
import shutil
import stat
import subprocess
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path

FILES = (
    "backend/manifest.json",
    "backend/migrations.json",
    "backend/image.tar.gz",
    "frontend/manifest.json",
    "frontend/frontend.tar.gz",
)


def write_frames(root, stream):
    for name in FILES:
        path = root / name
        if not stat.S_ISREG(path.lstat().st_mode):
            raise ValueError(f"Expected a regular artifact: {name}")
        with path.open("rb") as artifact:
            stream.write(f"{os.fstat(artifact.fileno()).st_size}\n".encode("ascii"))
            shutil.copyfileobj(artifact, stream, length=1024 * 1024)


def ssh_command(files, host):
    if not re.fullmatch(r"[A-Za-z0-9_][A-Za-z0-9_.-]*@[A-Za-z0-9][A-Za-z0-9.-]*", host):
        raise ValueError("Invalid deployment SSH target")
    return [
        "ssh", "-F", "/dev/null", "-T",
        "-o", "BatchMode=yes", "-o", "IdentitiesOnly=yes",
        "-o", "ConnectTimeout=10", "-o", "ServerAliveInterval=15",
        "-o", "ServerAliveCountMax=3", "-o", "StrictHostKeyChecking=yes",
        "-o", "GlobalKnownHostsFile=/dev/null",
        "-o", f"UserKnownHostsFile={files / 'known_hosts'}",
        "-i", str(files / "key"), "--", host,
    ]


def result(command):
    reply = subprocess.check_output(command, timeout=30)
    return json.loads(reply)


def submit(command, release):
    with subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE) as ssh:
        try:
            write_frames(release, ssh.stdin)
            ssh.stdin.close()
            reply = ssh.stdout.read()
            if ssh.wait(timeout=30) == 0:
                return json.loads(reply)
        except OSError:
            pass
    raise RuntimeError("Upload or submission failed; inspect the existing operation before retrying")


def wait_for_release(command, identifier, backend, frontend):
    deadline = time.monotonic() + 30 * 60
    phase = None
    while time.monotonic() < deadline:
        try:
            state = result([*command, f"status {identifier}"])
        except (subprocess.SubprocessError, OSError):
            time.sleep(5)
            continue
        if state.get("id") != identifier:
            raise RuntimeError("Server returned a status for a different release")
        if state.get("status") == "success":
            if (state.get("backend_commit"), state.get("frontend_commit")) != (backend, frontend):
                raise RuntimeError("Live release does not match both selected commits")
            backup = state.get("last_backup")
            if not isinstance(backup, str) or not re.fullmatch(r"[0-9]{8}T[0-9]{6}Z", backup):
                raise RuntimeError("The server did not report its encrypted backup")
            return backup
        if state.get("status") != "running":
            raise RuntimeError(f"Server deployment failed: {identifier}; check VPS status")
        if state.get("phase") and state["phase"] != phase:
            phase = state["phase"]
            print(f"Server phase: {phase}", flush=True)
        time.sleep(5)
    raise RuntimeError(f"Server operation {identifier} may still run; check status before retrying")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("release", type=Path)
    parser.add_argument("backend")
    parser.add_argument("frontend")
    parser.add_argument("run_id")
    args = parser.parse_args()
    if not all(re.fullmatch(r"[a-f0-9]{40}", sha) for sha in (args.backend, args.frontend)):
        raise ValueError("Deploy requires the two exact main revisions")
    if not re.fullmatch(r"[1-9][0-9]{0,19}", args.run_id):
        raise ValueError("Invalid GitHub Actions run ID")
    if os.environ.get("GITHUB_REF") != "refs/heads/main" or os.environ.get("GITHUB_EVENT_NAME") != "workflow_dispatch":
        raise ValueError("Production requires a manual run from main")

    os.umask(0o077)
    with tempfile.TemporaryDirectory(prefix="skviderm-ssh-") as directory:
        files = Path(directory)
        (files / "key").write_text(os.environ.pop("SKVIDERM_DEPLOY_KEY").rstrip("\n") + "\n")
        (files / "known_hosts").write_text(os.environ["SKVIDERM_DEPLOY_HOST_KEY"].rstrip("\n") + "\n")
        command = ssh_command(files, os.environ["SKVIDERM_DEPLOY_HOST"])
        if result([*command, "probe"]) != {"protocol": 1}:
            raise RuntimeError("The restricted deployment command did not answer")

        identifier = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" + secrets.token_hex(4)
        with Path(os.environ["GITHUB_STEP_SUMMARY"]).open("a") as summary:
            summary.write(f"### Production release {identifier}\n\n")
            summary.write(f"- Go: `{args.backend}`\n- Frontend: `{args.frontend}`\n")
        print(f"Server operation {identifier} continues independently after submission.", flush=True)
        state = submit([*command, f"submit {identifier} {args.backend} {args.frontend} {args.run_id}"], args.release)
        if state != {"id": identifier, "status": "running"}:
            raise RuntimeError("Unexpected deployment acknowledgement")
        backup = wait_for_release(command, identifier, args.backend, args.frontend)
        with Path(os.environ["GITHUB_STEP_SUMMARY"]).open("a") as summary:
            summary.write(f"- Encrypted VPS backup: `{backup}`\n- [Site](https://skviderm.by/)\n")


if __name__ == "__main__":
    main()
