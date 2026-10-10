import { render, screen } from '@testing-library/react';
import { FoundationPage } from './FoundationPage';

describe('FoundationPage', () => {
  it('identifies the project foundation without presenting product features', () => {
    render(<FoundationPage />);
    expect(screen.getByRole('heading', { name: 'Foundation ready' })).toBeInTheDocument();
  });
});
