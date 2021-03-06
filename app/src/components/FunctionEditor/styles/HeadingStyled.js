import styled from 'styled-components';

import {
  baseModule,
  paletteBlueGrey50,
  colorBorder,
  textColorMedium,
} from '../../../styles/themeSelectors';

// CodeMirror ruler width + border - one level of indentation (2 spaces)
const codeMirrorOffset = 20;

export const HeadingStyled = styled.div`
  background-color: ${paletteBlueGrey50};
  color: ${textColorMedium};
  padding: ${baseModule(1)}px ${codeMirrorOffset}px;
  user-select: none;

  pre {
    padding: 0;
    margin: 0;
  }
  
  &:first-of-type {
    border-bottom: 1px solid ${colorBorder};
  }
  
  &:last-of-type {
    border-top: 1px solid ${colorBorder};
    border-bottom: 1px solid ${colorBorder};
  }
`;

HeadingStyled.displayName = 'HeadingStyled';
