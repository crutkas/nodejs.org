import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

import {
  parseCompat,
  nextItem,
  OPERATING_SYSTEMS,
  INSTALL_METHODS,
  PACKAGE_MANAGERS,
  PLATFORMS,
} from '#site/util/download';

import { buildReleaseArtifacts } from '../download/archive';
import createInterpreter from '../interpreter';

describe('parseCompat', () => {
  it('should handle all OS, install methods, and package managers', () => {
    OPERATING_SYSTEMS.forEach(os => {
      INSTALL_METHODS.forEach(method => {
        PACKAGE_MANAGERS.forEach(pm => {
          const releaseContext = {
            os: os.value,
            installMethod: method.value,
            platform: 'x64',
            version: 'v16.0.0',
            release: { status: 'LTS' },
          };
          const result = parseCompat([os, pm, method], releaseContext);
          assert.ok(Array.isArray(result));
        });
      });
    });
  });

  it('should validate platform compatibility', () => {
    OPERATING_SYSTEMS.forEach(os => {
      const platforms = PLATFORMS[os.value] || [];
      platforms.forEach(platform => {
        const releaseContext = {
          os: os.value,
          installMethod: '',
          platform: platform.value,
          version: 'v16.0.0',
          release: { status: 'LTS' },
        };
        const result = parseCompat([platform], releaseContext);
        assert.equal(result.length, 1);
      });
    });
  });

  it('should enable x64 musl only for releases that publish the artifact', () => {
    const platform = PLATFORMS.LINUX.find(({ value }) => value === 'x64-musl');
    assert.ok(
      platform,
      'Linux x64 musl should be available as a manual option'
    );

    const cases = [
      ['v22.23.3', false],
      ['v22.23.2', true],
      ['v23.11.1', true],
      ['v24.20.0', false],
      ['v24.19.0', true],
      ['v25.0.0', true],
      ['v26.8.0', false],
      ['v26.7.0', true],
      ['v27.0.0', false],
      ['v27.0.0-alpha.1', false],
    ];

    for (const [version, disabled] of cases) {
      const [result] = parseCompat([platform], {
        os: 'LINUX',
        installMethod: '',
        platform: 'x64-musl',
        version,
        release: { status: 'LTS' },
      });

      assert.equal(result.disabled, disabled, `compatibility for ${version}`);
    }
  });

  describe('extended tests', () => {
    it('should disable items if OS is not supported', () => {
      const items = [
        {
          value: 'testItem',
          compatibility: { os: ['MAC'] },
        },
      ];
      const result = parseCompat(items, {
        os: 'WIN',
        installMethod: '',
        platform: '',
        version: 'v16.0.0',
        release: { status: 'LTS' },
      });
      assert.ok(result[0].disabled);
    });

    it('should disable items if installMethod is not supported', () => {
      const items = [
        {
          value: 'testItem',
          compatibility: { installMethod: ['NVM'] },
        },
      ];
      const result = parseCompat(items, {
        os: 'MAC',
        installMethod: 'FNM',
        platform: '',
        version: 'v16.0.0',
        release: { status: 'Current' },
      });
      assert.ok(result[0].disabled);
    });

    it('should disable items if platform is not supported', () => {
      const items = [
        {
          value: 'testItem',
          compatibility: { platform: ['arm64'] },
        },
      ];
      const result = parseCompat(items, {
        os: 'LINUX',
        installMethod: '',
        platform: 'x64',
        version: 'v16.0.0',
        release: { status: 'LTS' },
      });
      assert.ok(result[0].disabled);
    });

    it('should disable items if semver constraint is not satisfied', () => {
      const items = [
        {
          value: 'testItem',
          compatibility: { semver: ['>= 16.9.0'] },
        },
      ];
      const result = parseCompat(items, {
        os: 'MAC',
        installMethod: '',
        platform: 'x64',
        version: 'v16.0.0',
        release: { status: 'LTS' },
      });
      assert.ok(result[0].disabled);
    });

    it('should match semver constraints for pre-release versions', () => {
      const items = [
        {
          value: 'testItem',
          compatibility: { semver: ['>= 16.9.0'] },
        },
        {
          value: 'testItem2',
          compatibility: { semver: ['< 23.0.0'] },
        },
      ];
      const result = parseCompat(items, {
        os: 'MAC',
        installMethod: '',
        platform: 'x64',
        version: 'v27.0.0-alpha.0.0.0',
        release: { status: 'Alpha' },
      });
      assert.equal(result[0].disabled, false);
      assert.ok(result[1].disabled);
    });

    it('should disable items if release status is not supported', () => {
      const items = [
        {
          value: 'testItem',
          compatibility: { releases: ['Current'] },
        },
      ];
      const result = parseCompat(items, {
        os: 'WIN',
        installMethod: '',
        platform: 'x64',
        version: 'v18.0.0',
        release: { status: 'LTS' },
      });
      assert.ok(result[0].disabled);
    });
  });
});

describe('buildReleaseArtifacts', () => {
  it('should list x64 musl only for versions with published artifacts', () => {
    const cases = [
      ['v22.23.3', true],
      ['v22.23.2', false],
      ['v23.11.1', false],
      ['v24.20.0', true],
      ['v24.19.0', false],
      ['v25.0.0', false],
      ['v26.8.0', true],
      ['v26.7.0', false],
      ['v27.0.0', true],
      ['v27.0.0-alpha.1', true],
    ];

    for (const [version, shouldInclude] of cases) {
      const { binaries } = buildReleaseArtifacts(
        { minorVersions: [] },
        version
      );
      const artifact = binaries.find(
        ({ fileName }) => fileName === `node-${version}-linux-x64-musl.tar.xz`
      );

      assert.equal(Boolean(artifact), shouldInclude, `artifact for ${version}`);
    }
  });
});

describe('nextItem', () => {
  it('should find the first valid item if current is invalid', () => {
    const items = [
      { value: 'invalid', disabled: true },
      { value: 'valid', disabled: false },
    ];
    assert.equal(nextItem('invalid', items), 'valid');
    assert.equal(nextItem('valid', items), 'valid');
  });
});

describe('INSTALL_METHODS', () => {
  const context = {
    os: 'WIN',
    installMethod: '',
    platform: 'x64',
    version: 'v24.22.1',
    release: { status: 'LTS', version: '24.22.1' },
  };

  it('keeps Unix nvm off Windows and preserves fnm as the Windows default', () => {
    const methods = parseCompat(INSTALL_METHODS, context);

    assert.equal(methods.find(({ value }) => value === 'NVM').disabled, true);
    assert.equal(
      nextItem(
        '',
        methods.filter(({ recommended }) => recommended)
      ),
      'FNM'
    );
    for (const id of ['NVM_WINDOWS', 'WINGET']) {
      const method = methods.find(({ value }) => value === id);
      assert.equal(method.disabled, false);
      assert.ok(!method.recommended);
    }
  });

  it('restricts native Windows methods to their supported environments', () => {
    const cases = [
      ['NVM_WINDOWS', { os: 'MAC' }, true],
      ['NVM_WINDOWS', { os: 'LINUX' }, true],
      ['NVM_WINDOWS', { platform: 'arm64' }, false],
      ['NVM_WINDOWS', { platform: 'x86' }, true],
      ['NVM_WINDOWS', { release: { status: 'Alpha' } }, true],
      ['WINGET', { os: 'MAC' }, true],
      ['WINGET', { os: 'LINUX' }, true],
      ['WINGET', { release: { status: 'Alpha' } }, true],
      ['WINGET', { release: { status: 'EOL' } }, true],
    ];

    for (const [id, overrides, disabled] of cases) {
      const methods = parseCompat(INSTALL_METHODS, {
        ...context,
        ...overrides,
      });
      assert.equal(
        methods.find(({ value }) => value === id).disabled,
        disabled,
        `${id}: ${JSON.stringify(overrides)}`
      );
    }
  });

  const renderSnippet = async (name, props) => {
    const content = await readFile(
      new URL(`../../snippets/en/download/${name}.bash`, import.meta.url),
      'utf8'
    );
    const interpreter = createInterpreter({ props }, 'script');
    interpreter.run(`exports.content = \`${content}\``);
    return interpreter.exports.content;
  };

  it('renders exact WinGet versions, package IDs, and architectures', async () => {
    for (const [status, version, id] of [
      ['LTS', '24.22.1', 'OpenJS.NodeJS.LTS'],
      ['Current', '26.12.1', 'OpenJS.NodeJS'],
    ]) {
      for (const platform of ['x64', 'arm64', 'x86']) {
        const content = await renderSnippet('winget', {
          ...context,
          platform,
          release: { status, version },
        });
        assert.ok(
          content.includes(
            `winget install --id ${id} --exact --source winget --version ${version} --architecture ${platform}`
          )
        );
        assert.ok(content.includes('if ($LASTEXITCODE -ne 0) { throw'));
        assert.ok(!content.includes('${'));
      }
    }
  });

  it('renders matching nvm-windows v2 installers and exact Node versions', async () => {
    for (const platform of ['x64', 'arm64']) {
      const content = await renderSnippet('nvm_windows', {
        ...context,
        platform,
      });
      assert.ok(
        content.includes(
          `https://github.com/nvm-windows/nvm/releases/download/v2.0.1/nvm-2.0.1-${platform}-setup.exe`
        )
      );
      assert.ok(content.includes('nvm install 24.22.1'));
      assert.ok(content.includes('nvm use 24.22.1'));
      assert.ok(!content.includes('${'));
    }
  });

  it('should create icons only when an icon is configured', () => {
    const nvmMethod = INSTALL_METHODS.find(method => method.value === 'NVM');
    const asdfMethod = INSTALL_METHODS.find(method => method.value === 'ASDF');

    assert.ok(nvmMethod?.iconImage);
    assert.equal(asdfMethod?.iconImage, undefined);
  });
});
