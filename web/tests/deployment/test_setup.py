"""Linux deployment-helper checks; Docker is mocked inside an isolated container.
Run from repository root: python3 web/tests/deployment/test_setup.py
Docker runner: build tests/deployment/Dockerfile as makan-deployment-test:local.
Linux namespace alternative: MAKAN_DEPLOY_TEST_RUNNER=bwrap python3 ...
No Docker socket, private files, network, Nginx or live application is exposed.
"""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import shutil
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[3]
IMAGE = os.environ.get('MAKAN_DEPLOY_TEST_IMAGE', 'makan-deployment-test:local')
RUNNER = os.environ.get('MAKAN_DEPLOY_TEST_RUNNER', 'docker')
APP = '/tmp/makan app'
DUMMY_ENV = b'SESSION_SECRET=' + b'0' * 64 + b'\nMAKAN_PORT=8080\n'

MOCK_DOCKER = r"""
import fs from 'node:fs';
const args = process.argv.slice(2);
fs.appendFileSync('/tmp/makan-calls.jsonl', JSON.stringify(args) + '\n');
const stage = args[0] === 'info' ? 'info' : ['version','config','build','up','ps'].find(v => args.includes(v));
if (stage === 'build' && process.env.MOCK_FAIL === 'env-change') {
  fs.appendFileSync(args[args.indexOf('--env-file') + 1], '# concurrent configuration change\n');
}
if (process.env.MOCK_FAIL === stage) { console.error('simulated ' + stage + ' failure'); process.exit(17); }
if (stage === 'config') console.log(fs.readFileSync('/fixture/compose.json','utf8'));
if (stage === 'ps') console.log('web healthy');
"""
RESULT = r"""
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const file = '/tmp/makan app/web/.env.docker';
const hash = fs.existsSync(file) ? createHash('sha256').update(fs.readFileSync(file)).digest('hex') : null;
const calls = fs.existsSync('/tmp/makan-calls.jsonl') ? fs.readFileSync('/tmp/makan-calls.jsonl','utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];
const root='/tmp/makan app';
const backups=fs.existsSync(root+'/.deployment-backups')?fs.readdirSync(root+'/.deployment-backups').flatMap(d=>fs.readdirSync(root+'/.deployment-backups/'+d)):[];
console.log('DEPLOY_TEST_RESULT=' + JSON.stringify({calls,envHash:hash,backups,legacyTheme:fs.existsSync(root+'/web/src/features/personal/theme.ts'),replacementTheme:fs.existsSync(root+'/web/src/features/personal/theme.tsx')}));
"""
WRAPPER = r"""
cp -R '/fixture/app' '/tmp/makan app'
cp /fixture/setup.sh '/tmp/makan app/setup.sh'
export PATH=/fixture/bin:$PATH
bash '/tmp/makan app/setup.sh' "$@"
deploy_status=$?
node /fixture/result.mjs
exit "$deploy_status"
"""

class DeploymentTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if RUNNER == 'bwrap':
            if not shutil.which('bwrap') or not shutil.which('node'):
                raise RuntimeError('Bubblewrap and Node are required')
            return
        if RUNNER != 'docker':
            raise RuntimeError('Unknown deployment test runner')
        check = subprocess.run(['docker', 'image', 'inspect', IMAGE], capture_output=True)
        if check.returncode:
            raise RuntimeError('Docker test image unavailable; run: docker pull ' + IMAGE)

    def run_case(self, args=None, fail='', env=True, uid='0', missing_source=False, config_case='', retired=False):
        with tempfile.TemporaryDirectory(prefix='makan-deploy-test-') as folder:
            fixture = Path(folder)
            (fixture/'setup.sh').write_bytes((ROOT/'setup.sh').read_bytes())
            web = fixture/'app/web'
            web.mkdir(parents=True)
            for file in ['compose.yaml', 'Dockerfile', '.dockerignore', 'package.json', 'package-lock.json',
                         'scripts/build-public-brand.mjs', 'src/content/fa.ts']:
                if not (missing_source and file == 'package-lock.json'):
                    (web/file).parent.mkdir(parents=True,exist_ok=True)
                    (web/file).write_text('fixture\n', encoding='utf-8')
            (web/'config').mkdir()
            (web/'config/network.json').write_text(json.dumps({'backendOrigin':'http://94.184.32.84:8090'}))
            shutil.copyfile(ROOT/'web/scripts/validate-deployment.py',web/'scripts/validate-deployment.py')
            if retired:
                (web/'src/features/personal').mkdir(parents=True)
                (web/'src/features/personal/theme.ts').write_text('retired module')
                (web/'src/features/personal/theme.tsx').write_text('replacement module')
            config = {'services':{'web':{'environment':{
                'SESSION_SECRET':'0'*64,'APP_ORIGIN':'https://app.makanapp.org',
                'BACKEND_BASE_URL':'','COOKIE_SECURE':'true','SESSION_DIRECTORY':'/app/.makan-sessions'},
                'volumes':[{'type':'volume','source':'sessions','target':'/app/.makan-sessions'}],
                'ports':[{'host_ip':'127.0.0.1','published':'8080','target':3000}]}},
                'volumes':{'sessions':{'name':'makan-client_sessions'}}}
            settings=config['services']['web']['environment']
            if config_case=='bad-key': settings['SESSION_SECRET']='invalid-secret-must-not-appear'
            if config_case=='bad-origin': settings['APP_ORIGIN']='http://app.makanapp.org'
            if config_case=='bad-backend': settings['BACKEND_BASE_URL']='http://name:private-password@host/api'
            if config_case=='public-port': config['services']['web']['ports'][0]['host_ip']='0.0.0.0'
            if config_case=='wrong-volume': config['volumes']['sessions']['name']='new-empty-volume'
            if config_case=='fixture-mode': settings['MAKAN_TEST_MODE']='fixture'
            (fixture/'compose.json').write_text(json.dumps(config))
            if env:
                (web/'.env.docker').write_bytes(DUMMY_ENV)
            (fixture/'mock-docker.mjs').write_text(MOCK_DOCKER, encoding='utf-8')
            (fixture/'result.mjs').write_text(RESULT, encoding='utf-8')
            binary = fixture/'bin'
            binary.mkdir()
            commands = {
                'docker': '#!/bin/bash\nexec node /fixture/mock-docker.mjs "$@"\n',
                'id': '#!/bin/bash\nif [[ "$1" == "-u" ]]; then echo "${MOCK_UID:-0}"; else exec /usr/bin/id "$@"; fi\n',
                'flock': '#!/bin/bash\nif [[ "${MOCK_FAIL:-}" == "lock" ]]; then exit 1; fi\nexec /usr/bin/flock "$@"\n',
            }
            for name in ['apt-get', 'ufw', 'nginx', 'systemctl', 'certbot']:
                commands[name] = '#!/bin/bash\necho "Forbidden provisioning command reached" >&2\nexit 99\n'
            for name, contents in commands.items():
                path = binary/name
                path.write_text(contents, encoding='utf-8', newline='\n')
                path.chmod(0o755)
            command = ['docker','run','--pull=never','--rm','--network=none','--read-only',
                       '--cap-drop=ALL','--security-opt=no-new-privileges',
                       '--tmpfs','/tmp:rw,nosuid,nodev','--tmpfs','/run/lock:rw,nosuid,nodev',
                       '--mount',f'type=bind,source={fixture},target=/fixture,readonly',
                       '--env','MOCK_FAIL='+fail,'--env','MOCK_UID='+uid,
                       '--entrypoint','/bin/bash',IMAGE,'-c',WRAPPER,'--']
            if RUNNER=='bwrap':
                command=['bwrap','--unshare-user','--uid','0','--gid','0','--unshare-pid','--unshare-net',
                         '--ro-bind','/usr','/usr','--ro-bind','/lib','/lib','--ro-bind','/lib64','/lib64',
                         '--symlink','usr/bin','/bin','--proc','/proc','--dev','/dev',
                         '--tmpfs','/tmp','--tmpfs','/run','--dir','/runtime',
                         '--ro-bind',shutil.which('node'),'/runtime/node',
                         '--ro-bind',str(fixture),'/fixture','--clearenv',
                         '--setenv','PATH','/fixture/bin:/runtime:/usr/bin:/bin',
                         '--setenv','MOCK_FAIL',fail,'--setenv','MOCK_UID',uid,
                         '/bin/bash','-c',WRAPPER,'--']
            command += ['--update','--app-dir',APP] if args is None else args
            run = subprocess.run(command, text=True, capture_output=True, timeout=60)
            output = run.stdout + run.stderr
            self.assertNotIn('0' * 64, output, 'Secret material was printed')
            self.assertNotIn('invalid-secret-must-not-appear', output)
            self.assertNotIn('private-password', output)
            self.assertNotIn('Forbidden provisioning', output)
            payload = next((line.split('=',1)[1] for line in run.stdout.splitlines()
                            if line.startswith('DEPLOY_TEST_RESULT=')), None)
            self.assertIsNotNone(payload, output)
            result = json.loads(payload)
            if env:
                self.assertEqual((web/'.env.docker').read_bytes(), DUMMY_ENV)
            return run.returncode, output, result

    @staticmethod
    def stages(result):
        return [a[0] if a[0] == 'info' else next(v for v in ['version','config','build','up','ps'] if v in a)
                for a in result['calls']]

    def test_update_order_scope_and_preserved_env(self):
        code, output, result = self.run_case()
        self.assertEqual(code, 0, output)
        self.assertEqual(self.stages(result), ['info','version','config','build','up','ps'])
        self.assertEqual(result['envHash'], hashlib.sha256(DUMMY_ENV).hexdigest())
        for call in result['calls'][2:]:
            self.assertEqual(call[call.index('--project-name')+1], 'makan-client')
            self.assertEqual(call[call.index('--file')+1], APP+'/web/compose.yaml')
            self.assertNotIn('compose.local.yaml', ' '.join(call))
            self.assertEqual(call[call.index('--env-file')+1], APP+'/web/.env.docker')
        up = next(c for c in result['calls'] if 'up' in c)
        for flag in ['--no-deps','--no-build','--wait','--wait-timeout']:
            self.assertIn(flag, up)
        self.assertEqual(up[-1], 'web')
        self.assertIn('update completed', output)

    def test_build_failure_never_replaces_running_service(self):
        code, output, result = self.run_case(fail='build')
        self.assertEqual(code, 17)
        self.assertNotIn('up', self.stages(result))
        self.assertNotIn('update completed', output)
        self.assertEqual(result['envHash'], hashlib.sha256(DUMMY_ENV).hexdigest())

    def test_invalid_compose_stops_before_build(self):
        code, output, result = self.run_case(fail='config')
        self.assertNotEqual(code, 0)
        self.assertNotIn('build', self.stages(result))
        self.assertNotIn('update completed', output)

    def test_failed_health_check_is_not_success(self):
        code, output, result = self.run_case(fail='up')
        self.assertEqual(code, 17)
        self.assertNotIn('ps', self.stages(result))
        self.assertNotIn('update completed', output)

    def test_missing_env_is_not_created(self):
        code, output, result = self.run_case(env=False)
        self.assertNotEqual(code, 0)
        self.assertEqual(result['calls'], [])
        self.assertIsNone(result['envHash'])
        self.assertIn('is missing', output)

    def test_incomplete_upload_stops_before_docker(self):
        code, _, result = self.run_case(missing_source=True)
        self.assertNotEqual(code, 0)
        self.assertEqual(result['calls'], [])

    def test_busy_update_lock_does_not_build(self):
        code, output, result = self.run_case(fail='lock')
        self.assertNotEqual(code, 0)
        self.assertNotIn('build', self.stages(result))
        self.assertIn('Another Makan client update', output)

    def test_concurrent_env_change_prevents_deployment(self):
        code, output, result = self.run_case(fail='env-change')
        self.assertNotEqual(code, 0)
        self.assertIn('build', self.stages(result))
        self.assertNotIn('up', self.stages(result))
        self.assertIn('changed during the build', output)

    def test_non_root_never_runs_docker(self):
        code, output, result = self.run_case(uid='1000')
        self.assertNotEqual(code, 0)
        self.assertEqual(result['calls'], [])
        self.assertIn('sudo', output)

    def test_help_and_no_arguments_have_no_side_effects(self):
        for args in [[], ['--help']]:
            with self.subTest(args=args):
                code, _, result = self.run_case(args=args, uid='1000')
                self.assertEqual(code, 0)
                self.assertEqual(result['calls'], [])

    def test_script_directory_is_used_when_no_app_directory_is_given(self):
        code, output, result = self.run_case(args=['--update'])
        self.assertEqual(code, 0, output)
        self.assertEqual(self.stages(result)[-2:], ['up','ps'])

    def test_install_options_are_rejected_before_provisioning(self):
        code, output, result = self.run_case(args=['--install','--app-dir',APP])
        self.assertNotEqual(code, 0)
        self.assertEqual(result['calls'], [])
        self.assertIn('only with --update or --check', output)

    def test_check_validates_without_build_or_replacement(self):
        code,output,result=self.run_case(args=['--check','--app-dir',APP])
        self.assertEqual(code,0,output)
        self.assertEqual(self.stages(result),['info','version','config'])
        self.assertIn('preflight passed',output)

    def test_invalid_effective_settings_never_build_or_replace(self):
        for case in ['bad-key','bad-origin','bad-backend','public-port','wrong-volume','fixture-mode']:
            with self.subTest(case=case):
                code,output,result=self.run_case(config_case=case)
                self.assertNotEqual(code,0)
                self.assertNotIn('build',self.stages(result))
                self.assertNotIn('up',self.stages(result))
                self.assertIn('configuration is invalid',output)

    def test_only_the_known_retired_theme_is_backed_up(self):
        code,output,result=self.run_case(retired=True)
        self.assertEqual(code,0,output)
        self.assertFalse(result['legacyTheme'])
        self.assertTrue(result['replacementTheme'])
        self.assertEqual(result['backups'],['theme.ts.retired'])

    def test_check_does_not_move_the_retired_module(self):
        code,output,result=self.run_case(args=['--check','--app-dir',APP],retired=True)
        self.assertEqual(code,0,output)
        self.assertTrue(result['legacyTheme'])
        self.assertEqual(result['backups'],[])

if __name__ == '__main__':
    unittest.main(verbosity=2)
