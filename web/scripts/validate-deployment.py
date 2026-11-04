"""Validate normalized Compose configuration from stdin without printing secrets."""
import argparse
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlsplit


def origin(value, key):
    try:
        parsed = urlsplit(value)
        if parsed.scheme not in ('http', 'https') or not parsed.hostname or parsed.username or parsed.password or parsed.path not in ('', '/') or parsed.query or parsed.fragment:
            raise ValueError()
        parsed.port
        return parsed
    except (ValueError, TypeError, AttributeError):
        raise ValueError(key + ' must be an HTTP(S) origin; do not use a Swagger or API path.') from None


def validate(config, network):
    services = config.get('services', {})
    if set(services) != {'web'}:
        raise ValueError('The deployment must contain only the web client service.')
    service = services['web']
    env = service.get('environment', {})
    if not re.fullmatch(r'[0-9a-fA-F]{64}', str(env.get('SESSION_SECRET', ''))):
        raise ValueError('SESSION_SECRET must contain 64 hexadecimal characters. Preserve the existing valid key.')
    backend = env.get('BACKEND_BASE_URL') or network.get('backendOrigin')
    origin(backend, 'BACKEND_BASE_URL/config.network.backendOrigin')
    if origin(env.get('APP_ORIGIN'), 'APP_ORIGIN').scheme != 'https' or str(env.get('COOKIE_SECURE')).lower() != 'true':
        raise ValueError('Public deployment requires an HTTPS APP_ORIGIN and COOKIE_SECURE=true.')
    if env.get('MAKAN_TEST_MODE') == 'fixture' or str(env.get('MAKAN_REFERENCE_PREVIEW')).lower() == 'true':
        raise ValueError('Fixture mode and reference preview must be disabled.')
    if env.get('SESSION_DIRECTORY') != '/app/.makan-sessions':
        raise ValueError('SESSION_DIRECTORY must use the persistent session mount.')
    if not any(v.get('type') == 'volume' and v.get('source') == 'sessions' and v.get('target') == '/app/.makan-sessions' for v in service.get('volumes', [])):
        raise ValueError('The persistent sessions volume is missing.')
    if config.get('volumes', {}).get('sessions', {}).get('name') != 'makan-client_sessions':
        raise ValueError('Keep the existing makan-client_sessions volume name.')
    ports = service.get('ports', [])
    if len(ports) != 1 or ports[0].get('host_ip') != '127.0.0.1' or int(ports[0].get('target', 0)) != 3000 or not 1 <= int(ports[0].get('published', 0)) <= 65535:
        raise ValueError('Publish one loopback port to container port 3000.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--network', required=True, type=Path)
    args = parser.parse_args()
    try:
        config = json.load(sys.stdin)
        network = json.loads(args.network.read_text())
        validate(config, network)
    except (ValueError, KeyError, TypeError, OSError):
        # Do not echo JSON, file contents, parser excerpts or environment values.
        print('MakanApp: deployment configuration is invalid. Check SESSION_SECRET, origins, cookie security, ports and the sessions volume; see readme.md.', file=sys.stderr)
        return 1
    print('MakanApp: deployment configuration is valid; secret values were not printed.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
