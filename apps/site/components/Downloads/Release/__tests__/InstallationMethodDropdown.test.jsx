import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

import { render } from '@testing-library/react';

import { ReleaseContext } from '#site/providers/releaseProvider';

const Select = mock.fn(() => null);

mock.module('@node-core/ui-components/Common/Select', {
  defaultExport: Select,
});

const { default: InstallationMethodDropdown } =
  await import('../InstallationMethodDropdown');

describe('InstallationMethodDropdown', () => {
  it('revalidates nvm-windows when the selected architecture changes', () => {
    const setInstallMethod = mock.fn();
    const context = {
      os: 'WIN',
      platform: 'x64',
      version: 'v22.14.0',
      release: { status: 'LTS' },
      installMethod: 'NVM_WINDOWS',
      setInstallMethod,
    };
    const dropdown = platform => (
      <ReleaseContext value={{ ...context, platform }}>
        <InstallationMethodDropdown />
      </ReleaseContext>
    );
    const { rerender } = render(dropdown('x64'));
    const nvmWindows = () =>
      Select.mock.calls
        .at(-1)
        .arguments[0].values.flatMap(({ items }) => items)
        .find(({ value }) => value === 'NVM_WINDOWS');

    assert.equal(nvmWindows().disabled, false);
    setInstallMethod.mock.resetCalls();

    rerender(dropdown('x86'));

    assert.equal(nvmWindows().disabled, true);
    assert.equal(setInstallMethod.mock.calls.at(-1).arguments[0], 'FNM');
  });
});
