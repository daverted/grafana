import { GrafanaThemeCommons } from '../types/theme';

const theme: GrafanaThemeCommons = {
  name: 'Grafana Default',
  typography: {
    fontFamily: {
      // sansSerif: "'Roboto', 'Helvetica Neue', Arial, sans-serif",
      sansSerif: "'Inter', sans-serif",
      monospace: "Menlo, Monaco, Consolas, 'Courier New', monospace",
    },
    size: {
      root: '13px',
      base: '13px',
      xs: '12px',
      sm: '14px',
      md: '18px',
      lg: '20px',
    },
    heading: {
      h1: '30px',
      h2: '26px',
      h3: '23px',
      h4: '20px',
      h5: '18px',
      h6: '16px',
    },
    weight: {
      light: 200,
      regular: 400,
      semibold: 600,
    },
    lineHeight: {
      xs: 1,
      sm: 1.1,
      md: 4 / 3,
      lg: 1.5,
    },
    link: {
      decoration: 'none',
      hoverDecoration: 'none',
    },
  },
  breakpoints: {
    xs: '0',
    sm: '544px',
    md: '769px', // 1 more than regular ipad in portrait
    lg: '992px',
    xl: '1200px',
  },
  spacing: {
    insetSquishMd: '4px 8px',
    d: '14px',
    xxs: '2px',
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    gutter: '30px',
  },
  border: {
    radius: {
      sm: '2px',
      md: '3px',
      lg: '5px',
    },
    width: {
      sm: '1px',
    },
  },
  height: {
    sm: '24px',
    md: '32px',
    lg: '48px',
  },
  panelPadding: 0,
  panelHeaderHeight: 28,
  zIndex: {
    dropdown: '1000',
    navbarFixed: '1020',
    sidemenu: '1025',
    tooltip: '1030',
    modalBackdrop: '1040',
    modal: '1050',
    typeahead: '1060',
  },
};

export default theme;
