import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AchievementForm } from '../src/components/AchievementForm';

describe('AchievementForm', () => {
  it('keeps the dialog open when submit fails', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error('Missing or insufficient permissions.'));
    const onClose = vi.fn();

    render(<AchievementForm onSubmit={onSubmit} onClose={onClose} />);

    await user.type(screen.getByLabelText('Achievement Title'), 'Closed a release risk early');
    await user.type(screen.getByLabelText('What Happened?'), 'I found the regression path before it escaped and documented the steps clearly.');
    await user.type(screen.getByLabelText('Why Did It Matter?'), 'The team avoided a rollback and had enough context to patch the issue safely.');

    await user.click(screen.getByRole('button', { name: 'Save Achievement' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onClose).not.toHaveBeenCalled());
  });

  it('closes the dialog after a successful async submit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(<AchievementForm onSubmit={onSubmit} onClose={onClose} />);

    await user.type(screen.getByLabelText('Achievement Title'), 'Improved release confidence');
    await user.type(screen.getByLabelText('What Happened?'), 'I tightened the checks around a flaky path and verified the release flow before handoff.');
    await user.type(screen.getByLabelText('Why Did It Matter?'), 'It reduced late surprises for the team and gave support a quieter launch window.');

    await user.click(screen.getByRole('button', { name: 'Save Achievement' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});
