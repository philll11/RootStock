import { render } from '@testing-library/react';

import FeatureUsers from './feature-users';

describe('FeatureUsers', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<FeatureUsers />);
    expect(baseElement).toBeTruthy();
  });
});
