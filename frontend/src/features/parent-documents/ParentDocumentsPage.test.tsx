import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, vi } from 'vitest';
import { ParentDocumentsPage } from './ParentDocumentsPage';
import { parentDocumentsApi, type ParentDocuments } from './parentDocuments.api';

vi.mock('./parentDocuments.api', () => ({ parentDocumentsApi: { get: vi.fn() } }));
vi.mock('../auth/useAuth', () => ({ useAuth: () => ({ accessToken: 'token' }) }));

const populated: ParentDocuments = {
  children: [
    { id: 'child-1', displayName: 'Aarav Sharma' },
    { id: 'child-2', displayName: 'Mira Sharma' },
  ],
  child: { id: 'child-1', displayName: 'Aarav Sharma' },
  documents: [
    {
      id: 'document-1',
      child: { id: 'child-1', displayName: 'Aarav Sharma' },
      uploader: { displayName: 'Anita Sharma' },
      purpose: 'PARENT_PROVIDED_SUPPORTING_DOCUMENT',
      displayName: 'Parent-provided consent form record',
      fileName: 'consent-form.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 184320,
      createdAt: '2026-09-29T10:00:00.000Z',
      binaryAvailable: false,
    },
  ],
  binaryStorageAvailable: false,
};
const empty: ParentDocuments = {
  ...populated,
  child: { id: 'child-2', displayName: 'Mira Sharma' },
  documents: [],
};

function renderPage() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <ParentDocumentsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ParentDocumentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(parentDocumentsApi.get).mockImplementation(async (_token, childId) =>
      childId === 'child-2' ? empty : populated,
    );
  });

  it('renders permitted metadata with the selected child context', async () => {
    renderPage();
    expect(await screen.findByText('Records for Aarav Sharma')).toBeInTheDocument();
    expect(screen.getByText('Parent-provided consent form record')).toBeInTheDocument();
    expect(screen.getByText(/consent-form\.pdf/)).toBeInTheDocument();
    expect(screen.getByText('Metadata only · file unavailable')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /upload/i })).not.toBeInTheDocument();
  });

  it('switches to Mira without retaining sibling document metadata', async () => {
    renderPage();
    fireEvent.change(await screen.findByRole('combobox', { name: 'Child' }), {
      target: { value: 'child-2' },
    });
    expect(await screen.findByText('Records for Mira Sharma')).toBeInTheDocument();
    expect(screen.getByText('No Parent-visible documents')).toBeInTheDocument();
    expect(screen.queryByText('consent-form.pdf')).not.toBeInTheDocument();
    expect(parentDocumentsApi.get).toHaveBeenLastCalledWith('token', 'child-2');
  });

  it('states the real binary-storage boundary', async () => {
    renderPage();
    expect(await screen.findByText('Secure file storage is not connected')).toBeInTheDocument();
    expect(
      screen.getByText(/Upload, preview, and download remain unavailable/),
    ).toBeInTheDocument();
  });

  it('shows loading and restricted states', async () => {
    vi.mocked(parentDocumentsApi.get).mockReturnValue(new Promise<never>(() => {}));
    const view = renderPage();
    expect(screen.getByText('Loading documents…')).toBeInTheDocument();
    view.unmount();

    vi.mocked(parentDocumentsApi.get).mockRejectedValue(new Error('forbidden'));
    renderPage();
    expect(
      await screen.findByText('Documents are unavailable for this account.'),
    ).toBeInTheDocument();
  });

  it('does not render private Student document sources', async () => {
    renderPage();
    await screen.findByText('Records for Aarav Sharma');
    expect(document.body.textContent).not.toMatch(
      /AI conversation|Community attachment|private note|opportunity application|session|credential/i,
    );
  });
});
