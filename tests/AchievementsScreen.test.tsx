import React from 'react';
import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AchievementsScreen, formatDisplayDate, scoreAchievement } from '../src/screens/AchievementsScreen';
import type { Achievement } from '../src/types';

const mockUseAuth = vi.fn();

vi.mock('../src/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

function makeAchievement(overrides: Partial<Achievement> = {}): Achievement {
  return {
    id: overrides.id || 'achievement-1',
    title: overrides.title || 'Closed a nasty release gap',
    category: overrides.category || 'Work',
    story: overrides.story || 'Tracked down a release-blocking issue before it reached production.',
    impact: overrides.impact || 'Saved the team a late rollback and gave support a quiet day.',
    achievementDate: overrides.achievementDate,
    author: overrides.author || 'Coy Admin',
    authorId: overrides.authorId || 'user-1',
    authorPhotoURL: overrides.authorPhotoURL,
    date: overrides.date || 'Mar 30, 2026',
    createdAt: overrides.createdAt || { seconds: 10 },
  };
}

describe('AchievementsScreen', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      profile: { uid: 'user-1', displayName: 'Coy Admin', role: 'admin' },
      isAdmin: true,
    });
  });

  it('renders the empty state and primary action when there are no achievements', () => {
    render(
      <AchievementsScreen
        achievements={[]}
        onAddAchievement={vi.fn()}
        onDeleteAchievement={vi.fn()}
        onEditAchievement={vi.fn()}
        searchQuery=""
      />
    );

    expect(screen.getByText('Nothing here yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add the first one' })).toBeInTheDocument();
    expect(screen.getByText('Good first entries')).toBeInTheDocument();
  });

  it('filters to only the signed-in user entries when Mine is selected', async () => {
    const user = userEvent.setup();
    render(
      <AchievementsScreen
        achievements={[
          makeAchievement({ id: 'mine', title: 'My entry', authorId: 'user-1', author: 'Coy Admin' }),
          makeAchievement({ id: 'other', title: 'Other entry', authorId: 'user-2', author: 'Team Mate', createdAt: { seconds: 20 } }),
        ]}
        onAddAchievement={vi.fn()}
        onDeleteAchievement={vi.fn()}
        onEditAchievement={vi.fn()}
        searchQuery=""
      />
    );

    await user.click(screen.getAllByRole('button', { name: 'Mine' })[0]);

    expect(screen.getByText('My entry')).toBeInTheDocument();
    expect(screen.queryByText('Other entry')).not.toBeInTheDocument();
  });

  it('switches sort order between newest and oldest', async () => {
    const user = userEvent.setup();
    render(
      <AchievementsScreen
        achievements={[
          makeAchievement({ id: 'old', title: 'Older entry', createdAt: { seconds: 10 } }),
          makeAchievement({ id: 'new', title: 'Newer entry', createdAt: { seconds: 20 } }),
        ]}
        onAddAchievement={vi.fn()}
        onDeleteAchievement={vi.fn()}
        onEditAchievement={vi.fn()}
        searchQuery=""
      />
    );

    let newer = screen.getByText('Newer entry');
    let older = screen.getByText('Older entry');
    expect(newer.compareDocumentPosition(older) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await user.click(screen.getAllByRole('button', { name: 'Oldest' })[0]);

    newer = screen.getByText('Newer entry');
    older = screen.getByText('Older entry');
    expect(older.compareDocumentPosition(newer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('opens and closes the achievement details modal', async () => {
    const user = userEvent.setup();
    render(
      <AchievementsScreen
        achievements={[makeAchievement({ title: 'Detail entry', story: 'Full detail text for the modal body.' })]}
        onAddAchievement={vi.fn()}
        onDeleteAchievement={vi.fn()}
        onEditAchievement={vi.fn()}
        searchQuery=""
      />
    );

    const detailCardButton = screen.getByText('Detail entry').closest('button');
    if (!detailCardButton) throw new Error('Achievement card button not found');

    await user.click(detailCardButton);

    const closeButton = screen.getByRole('button', { name: 'Close achievement details' });
    expect(closeButton).toBeInTheDocument();
    expect(screen.getByText('What happened')).toBeInTheDocument();

    await user.click(closeButton);
    await waitForElementToBeRemoved(() => screen.queryByRole('button', { name: 'Close achievement details' }));

    expect(screen.queryByText('What happened')).not.toBeInTheDocument();
  });

  it('keeps the admin review panel hidden for non-admin users', () => {
    mockUseAuth.mockReturnValue({
      profile: { uid: 'user-2', displayName: 'Team Mate', role: 'user' },
      isAdmin: false,
    });

    render(
      <AchievementsScreen
        achievements={[makeAchievement()]}
        onAddAchievement={vi.fn()}
        onDeleteAchievement={vi.fn()}
        onEditAchievement={vi.fn()}
        searchQuery=""
      />
    );

    expect(screen.queryByRole('button', { name: /review notes/i })).not.toBeInTheDocument();
  });

  it('expands the admin review panel for admins', async () => {
    const user = userEvent.setup();
    render(
      <AchievementsScreen
        achievements={[makeAchievement({ title: 'QA cleanup win' })]}
        onAddAchievement={vi.fn()}
        onDeleteAchievement={vi.fn()}
        onEditAchievement={vi.fn()}
        searchQuery=""
      />
    );

    expect(screen.getAllByText('QA cleanup win')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: /admin only review notes/i }));

    expect(screen.getAllByText('QA cleanup win')).toHaveLength(2);
    expect(screen.getAllByText('Signal')[0]).toBeInTheDocument();
  });
});

describe('Achievements helpers', () => {
  it('scores work entries higher when they include a date and stronger detail', () => {
    const lowSignal = makeAchievement({
      achievementDate: undefined,
      story: 'Short story',
      impact: 'Short impact',
    });
    const highSignal = makeAchievement({
      achievementDate: '2026-03-30',
      story: 'A much longer and more detailed write-up of the work that happened here.',
      impact: 'A fuller impact note that explains why the work mattered for users and the team.',
    });

    expect(scoreAchievement(highSignal)).toBeGreaterThan(scoreAchievement(lowSignal));
  });

  it('formats valid dates and leaves invalid text alone', () => {
    expect(formatDisplayDate('2026-03-30')).toBe('Mar 30, 2026');
    expect(formatDisplayDate('not-a-date')).toBe('not-a-date');
  });
});
