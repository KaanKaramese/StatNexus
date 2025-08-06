/// <reference types="vitest" />
// @vitest-environment jsdom

import { render, screen, fireEvent } from '@testing-library/react';
import MatchList from './MatchList';
import React from 'react';
import { describe, it, expect } from 'vitest';

describe('MatchList', () => {
  it('renders loading state', () => {
    render(<MatchList puuID={null} />);
    expect(screen.getByText(/no matches found/i)).toBeInTheDocument();
  });

  it('renders error state', () => {
    // Simulate error by passing an invalid puuID
    render(<MatchList puuID={''} />);
    expect(screen.getByText(/no matches found/i)).toBeInTheDocument();
  });

  // More tests can be added with mock fetch and data
});
