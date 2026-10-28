import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { EmailSubscribe } from '../src/components/EmailSubscribe';

vi.mock('../src/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/api')>();
  return { ...actual, api: vi.fn() };
});

const { api: mockApi } = await import('../src/lib/api');

beforeEach(() => {
  vi.mocked(mockApi).mockReset();
});

describe('EmailSubscribe', () => {
  it('renders a form with email input and subscribe button', () => {
    render(
      <MemoryRouter>
        <EmailSubscribe />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText(/compliance deadlines/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /subscribe/i })).toBeInTheDocument();
  });

  it('posts to /subscribe, which api() prefixes — never a second /api/v1', async () => {
    // It passed '/api/v1/subscribe', so the request went to
    // /api/v1/api/v1/subscribe and every signup was a 404.
    vi.mocked(mockApi).mockResolvedValueOnce({ ok: true });
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <EmailSubscribe />
      </MemoryRouter>,
    );
    await user.type(screen.getByLabelText(/compliance deadlines/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /subscribe/i }));
    await waitFor(() =>
      expect(mockApi).toHaveBeenCalledWith('/subscribe', { method: 'POST', body: { email: 'test@example.com' } }),
    );
  });

  it('shows success message after submission', async () => {
    vi.mocked(mockApi).mockResolvedValueOnce({ ok: true });
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <EmailSubscribe />
      </MemoryRouter>,
    );
    await user.type(screen.getByLabelText(/compliance deadlines/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /subscribe/i }));
    await waitFor(() => {
      expect(screen.getByText(/you're subscribed/i)).toBeInTheDocument();
    });
  });

  it('shows a network message when the request never reaches the server', async () => {
    vi.mocked(mockApi).mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <EmailSubscribe />
      </MemoryRouter>,
    );
    await user.type(screen.getByLabelText(/compliance deadlines/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /subscribe/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/could not reach the server/i);
    });
  });

  it('shows the server detail on a structured API failure', async () => {
    const { ApiError } = await import('../src/lib/api');
    vi.mocked(mockApi).mockRejectedValueOnce(
      new ApiError(429, { title: 'Too Many Requests', detail: 'Too many subscribe attempts — please wait a minute and try again.' }),
    );
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <EmailSubscribe />
      </MemoryRouter>,
    );
    await user.type(screen.getByLabelText(/compliance deadlines/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /subscribe/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/too many subscribe attempts/i);
    });
  });
});
