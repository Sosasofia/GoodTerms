import { render } from '@testing-library/react';
import Home from '../src/app/page';
import { redirect } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

describe('Home', () => {
  it('redirects to /groups', () => {
    render(<Home />);
    expect(redirect).toHaveBeenCalledWith('/groups');
  });
});