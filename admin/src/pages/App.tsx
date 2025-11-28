import { Route, Routes } from 'react-router-dom';

import { DesignSystemProvider, darkTheme, lightTheme } from '@strapi/design-system';
import { Page } from '@strapi/strapi/admin';
import { useMemo } from 'react';
import { HomePage } from './HomePage';


function App() {
  const isDarkMode = useMemo(() => window?.localStorage?.STRAPI_THEME === "dark", [window?.localStorage?.STRAPI_THEME]);
  return (
    <DesignSystemProvider theme={isDarkMode ? darkTheme : lightTheme}>
      <Routes>
        <Route index element={<HomePage />} />
        <Route path="/*" element={<Page.Error />} />
      </Routes>
    </DesignSystemProvider>
  );
};

export { App };
