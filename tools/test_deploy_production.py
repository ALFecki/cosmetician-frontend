import io
import os
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from deploy_production import BACKEND_FILES, FRONTEND_FILES, main, ssh_command, wait_for_release, write_frames


class DeploymentTransportTest(unittest.TestCase):
    def test_artifacts_are_sent_in_fixed_order_with_exact_byte_lengths(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            files = BACKEND_FILES + FRONTEND_FILES
            payloads = [bytes([index, 10, 0]) for index in range(len(files))]
            for name, payload in zip(files, payloads):
                path = root / name
                path.parent.mkdir(exist_ok=True)
                path.write_bytes(payload)
            stream = io.BytesIO()
            write_frames(root, stream)
            self.assertEqual(stream.getvalue(), b"".join(b"3\n" + payload for payload in payloads))

    def test_frontend_only_sends_no_backend_files(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            frontend = root / "frontend"
            frontend.mkdir()
            (frontend / "manifest.json").write_bytes(b"a")
            (frontend / "frontend.tar.gz").write_bytes(b"bc")
            stream = io.BytesIO()
            write_frames(root, stream, include_backend=False)
            self.assertEqual(stream.getvalue(), b"1\na2\nbc")

    @patch("deploy_production.result")
    def test_frontend_only_checks_frontend_and_reports_the_active_backend(self, result):
        state = {"id": "release", "status": "success", "backend_commit": "b" * 40,
                 "frontend_commit": "f" * 40, "last_backup": "20261119T101500Z"}
        result.return_value = state
        self.assertEqual(
            wait_for_release(["ssh"], "release", None, "f" * 40),
            ("20261119T101500Z", "b" * 40),
        )
        state["frontend_commit"] = "a" * 40
        with self.assertRaisesRegex(RuntimeError, "does not match"):
            wait_for_release(["ssh"], "release", None, "f" * 40)

    def test_ssh_disallows_target_injection_and_requires_the_pinned_host_key(self):
        with self.assertRaises(ValueError):
            ssh_command(Path("/tmp/ssh"), "user@server -o ProxyCommand=bad")
        command = ssh_command(Path("/tmp/ssh"), "user@server")
        self.assertIn("StrictHostKeyChecking=yes", command)
        self.assertIn("UserKnownHostsFile=/tmp/ssh/known_hosts", command)
        self.assertIn("IdentitiesOnly=yes", command)

    @patch("deploy_production.time.sleep")
    @patch("deploy_production.result")
    def test_status_polling_retries_transport_errors_and_verifies_both_revisions(self, result, sleep):
        result.side_effect = [
            subprocess.TimeoutExpired("ssh", 30),
            {"id": "release", "status": "running", "phase": "stopping"},
            {"id": "release", "status": "running"},
            {"id": "release", "status": "success", "backend_commit": "b", "frontend_commit": "f",
             "last_backup": "20261119T101500Z"},
        ]
        self.assertEqual(wait_for_release(["ssh"], "release", "b", "f"), ("20261119T101500Z", "b"))
        self.assertEqual(sleep.call_count, 3)

    @patch("deploy_production.result")
    def test_status_for_a_different_live_revision_is_a_failure(self, result):
        result.return_value = {"id": "release", "status": "success", "backend_commit": "old", "frontend_commit": "f"}
        with self.assertRaisesRegex(RuntimeError, "does not match"):
            wait_for_release(["ssh"], "release", "b", "f")

    def test_push_from_main_allows_frontend_only_but_not_combined_deploy(self):
        env = {
            "GITHUB_REPOSITORY": "ALFecki/cosmetician-frontend",
            "GITHUB_REF": "refs/heads/main",
            "GITHUB_EVENT_NAME": "push",
        }
        arguments = ["deploy_production.py", "release", "f" * 40, "1"]
        with patch.dict(os.environ, env, clear=True), patch("deploy_production.os.umask", side_effect=RuntimeError("validated")):
            with patch("sys.argv", arguments):
                with self.assertRaisesRegex(RuntimeError, "validated"):
                    main()
            with patch("sys.argv", arguments + ["--backend", "b" * 40]):
                with self.assertRaisesRegex(ValueError, "requires approval"):
                    main()
