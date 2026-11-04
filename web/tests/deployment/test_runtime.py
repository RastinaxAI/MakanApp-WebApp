"""Exercise the real image entry script with a disposable server module; no network."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

WEB = Path(__file__).resolve().parents[2]
SECRET = '0' * 64


class RuntimeTests(unittest.TestCase):
    def run_case(self, override=None, config=True, check=False):
        with tempfile.TemporaryDirectory(prefix='makan-runtime-test-') as directory:
            root = Path(directory)
            shutil.copyfile(WEB/'scripts/docker-start.mjs', root/'docker-start.mjs')
            (root/'server.js').write_text("require('node:fs').writeFileSync('started.json',JSON.stringify({backend:process.env.BACKEND_BASE_URL}));")
            if config:
                (root/'config').mkdir()
                (root/'config/network.json').write_text(json.dumps({'backendOrigin':'http://94.184.32.84:8090'}))
            env = {key:value for key,value in os.environ.items() if key in ['PATH','SYSTEMROOT','TMPDIR']}
            env.update(SESSION_SECRET=SECRET,APP_ORIGIN='https://app.makanapp.org',
                       COOKIE_SECURE='true',BACKEND_BASE_URL='',SESSION_DIRECTORY=str(root/'sessions'))
            env.update(override or {})
            result = subprocess.run([shutil.which('node'),str(root/'docker-start.mjs')]+(['--check'] if check else []),
                                    cwd=root,env=env,capture_output=True,text=True,timeout=10)
            output=result.stdout+result.stderr
            for hidden in [SECRET,'password-not-for-output','invalid-secret-not-for-output']:
                self.assertNotIn(hidden,output)
            started=json.loads((root/'started.json').read_text()) if (root/'started.json').exists() else None
            return result.returncode,output,started

    def test_blank_override_uses_the_canonical_config(self):
        code,output,started=self.run_case()
        self.assertEqual(code,0,output)
        self.assertEqual(started['backend'],'http://94.184.32.84:8090')

    def test_explicit_origin_overrides_the_config(self):
        code,output,started=self.run_case({'BACKEND_BASE_URL':'http://127.0.0.1:8099'})
        self.assertEqual(code,0,output)
        self.assertEqual(started['backend'],'http://127.0.0.1:8099')

    def test_invalid_or_missing_secret_never_starts(self):
        for secret in ['', 'invalid-secret-not-for-output']:
            with self.subTest(secret_is_empty=not secret):
                code,_,started=self.run_case({'SESSION_SECRET':secret})
                self.assertNotEqual(code,0)
                self.assertIsNone(started)

    def test_invalid_backend_never_starts_or_prints_credentials(self):
        for origin in ['http://user:password-not-for-output@host','http://host/swagger/index.html','http://host/?key=x','file:///tmp/backend']:
            with self.subTest(case=origin.split(':')[0]):
                code,_,started=self.run_case({'BACKEND_BASE_URL':origin})
                self.assertNotEqual(code,0)
                self.assertIsNone(started)

    def test_https_requires_secure_cookies(self):
        code,_,started=self.run_case({'COOKIE_SECURE':'false'})
        self.assertNotEqual(code,0)
        self.assertIsNone(started)

    def test_preview_and_fixture_flags_never_boot_a_public_image(self):
        for override in [{'MAKAN_TEST_MODE':'fixture'},{'MAKAN_REFERENCE_PREVIEW':'true'}]:
            code,_,started=self.run_case(override)
            self.assertNotEqual(code,0)
            self.assertIsNone(started)

    def test_missing_network_file_does_not_fall_back_to_another_server(self):
        code,_,started=self.run_case(config=False)
        self.assertNotEqual(code,0)
        self.assertIsNone(started)

    def test_check_validates_but_does_not_listen(self):
        code,output,started=self.run_case(check=True)
        self.assertEqual(code,0,output)
        self.assertIsNone(started)

    def test_invalid_cookie_name_never_starts(self):
        code,_,started=self.run_case({'CLIENT_COOKIE_NAME':'invalid;cookie'})
        self.assertNotEqual(code,0)
        self.assertIsNone(started)


if __name__ == '__main__':
    unittest.main(verbosity=2)
