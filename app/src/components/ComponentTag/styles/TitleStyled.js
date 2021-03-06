import styled, { css } from 'styled-components';
import PropTypes from 'prop-types';
import constants from './constants';

import {
  baseModule,
  fontSizeXSmall,
} from '../../../styles/themeSelectors';

const propTypes = {
  focused: PropTypes.bool,
  colorScheme: PropTypes.oneOf(['dark', 'light']),
};

const defaultProps = {
  focused: false,
  colorScheme: 'dark',
};

const focused = ({ focused, colorScheme }) => css`
  color: ${focused
      ? constants[colorScheme].tag.fontColorFocused
      : constants[colorScheme].tag.fontColor
  };`;

export const TitleStyled = styled.div`
  font-size: ${fontSizeXSmall}px;
  line-height: 1.25;
  padding: ${baseModule(0.5)}px;
  text-align: center;
  word-wrap: break-word;
  ${focused}
`;

TitleStyled.displayName = 'TitleStyled';
TitleStyled.propTypes = propTypes;
TitleStyled.defaultProps = defaultProps;
