import { Route, Routes } from 'react-router-dom';

import { Page } from '@strapi/strapi/admin';
import { HomePage } from './HomePage';
import { SettingsPage } from './Settings';

const App = () => {
  return (
      <Routes>
        <Route index element={<HomePage />} />
        <Route path={"settings"} element={<SettingsPage />} />
        <Route path="*" element={<Page.Error />} />
      </Routes>
  );
};

export { App };
