import React from 'react';
import { IconCheck as IconCheckRCTCL } from 'reactackle-icons';
import defaultProps from './common/defaultProps';

export const IconCheck = props => (
  <IconCheckRCTCL {...props} />
);

IconCheck.propTypes = IconCheckRCTCL.propTypes;
IconCheck.defaultProps = defaultProps;
IconCheck.displayName = 'IconCheck';
