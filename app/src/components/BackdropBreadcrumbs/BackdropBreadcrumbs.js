import React from 'react';
import PropTypes from 'prop-types';
import { Breadcrumbs } from 'reactackle-breadcrumbs';
import { ThemeProvider } from 'styled-components';
import { Theme } from 'reactackle-core';
import { BreadcrumbLink } from './BreadcrumbLink';
import { BackdropBreadcrumbsStyled } from './styles/BackdropBreadcrumbsStyled';
import { boobenTheme, reactackleMixin } from '../../styles/theme';

const propTypes = {
  items: PropTypes.arrayOf(PropTypes.shape({
    title: PropTypes.string.isRequired,
    tooltipText: PropTypes.string,
  })),
};
const defaultProps = {
  items: [],
};

export const BackdropBreadcrumbs = props => (
  <Theme mixin={reactackleMixin}>
    <ThemeProvider theme={boobenTheme}>
      <BackdropBreadcrumbsStyled>
        <Breadcrumbs
          colorScheme="dark"
          items={props.items}
          linkComponent={BreadcrumbLink}
        />
      </BackdropBreadcrumbsStyled>
    </ThemeProvider>
  </Theme>
);

BackdropBreadcrumbs.propTypes = propTypes;
BackdropBreadcrumbs.defaultProps = defaultProps;
BackdropBreadcrumbs.displayName = 'BackdropBreadcrumbs';
