import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ReferralPage } from '../src/pages/marketing/ReferralPage';

function renderPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/referral']}>
        <Routes>
          <Route path="/referral" element={<ReferralPage />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Full name'), 'Jane Doe');
  await user.type(screen.getByLabelText('Work email'), 'jane@lawfirm.com');
  await user.type(screen.getByLabelText('Company / Firm'), 'Startup Law LLP');
  await user.selectOptions(screen.getByLabelText('Your role'), 'lawyer');
  await user.click(screen.getByRole('button', { name: 'Apply to join' }));
}

describe('ReferralPage', () => {
  afterEach(() => vi.restoreAllMocks());

  it('renders the heading', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Earn by referring 409A valuations',
    );
  });

  it('shows the signup form', () => {
    renderPage();
    expect(screen.getByTestId('referral-form')).toBeTruthy();
    expect(screen.getByLabelText('Full name')).toBeTruthy();
    expect(screen.getByLabelText('Work email')).toBeTruthy();
    expect(screen.getByLabelText('Company / Firm')).toBeTruthy();
    expect(screen.getByLabelText('Your role')).toBeTruthy();
  });

  it('renders the four benefit cards', () => {
    renderPage();
    expect(screen.getByText('Revenue share')).toBeTruthy();
    expect(screen.getByText('Defensible reports')).toBeTruthy();
    expect(screen.getByText('Referral dashboard')).toBeTruthy();
    expect(screen.getByText('24-hour turnaround')).toBeTruthy();
  });

  it('renders the three audience segments', () => {
    renderPage();
    expect(screen.getByText('Startup Lawyers')).toBeTruthy();
    expect(screen.getByText('CFOs & Controllers')).toBeTruthy();
    expect(screen.getByText('Accelerators & VCs')).toBeTruthy();
  });

  it('shows how-it-works section', () => {
    renderPage();
    expect(screen.getByText('Sign up')).toBeTruthy();
    expect(screen.getByText('Share your link')).toBeTruthy();
    expect(screen.getByText('Earn')).toBeTruthy();
  });

  it('shows success state after form submission', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 201 }));
    const user = userEvent.setup();
    renderPage();

    await fillAndSubmit(user);

    expect(await screen.findByTestId('referral-success')).toBeTruthy();
    expect(screen.getByText('Application received')).toBeTruthy();
  });

  it('files the application in the contact queue, a route that exists', async () => {
    // It posted to /api/referral-signup, which no service serves.
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 201 }));
    const user = userEvent.setup();
    renderPage();

    await fillAndSubmit(user);
    await screen.findByTestId('referral-success');

    const [url, init] = spy.mock.calls[0]!;
    expect(String(url)).toBe('/api/v1/contact');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({
      name: 'Jane Doe',
      email: 'jane@lawfirm.com',
      company: 'Startup Law LLP',
      message: 'Referral partner application — role: Startup Lawyer',
    });
  });

  it('shows error when submission fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 500 }));
    const user = userEvent.setup();
    renderPage();

    await fillAndSubmit(user);

    expect(await screen.findByText(/could not be submitted/i)).toBeTruthy();
    expect(screen.queryByTestId('referral-success')).toBeNull();
  });

  it('shows error on network failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    const user = userEvent.setup();
    renderPage();

    await fillAndSubmit(user);

    expect(await screen.findByText(/could not be submitted/i)).toBeTruthy();
    expect(screen.queryByText(/Failed to fetch/)).toBeNull();
  });

  it('renders FAQ section', () => {
    renderPage();
    expect(screen.getByText('Frequently asked questions')).toBeTruthy();
    expect(screen.getByText('How does the referral program work?')).toBeTruthy();
  });
});
