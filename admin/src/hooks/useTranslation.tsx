import { useIntl } from 'react-intl';
import { getTranslation } from '../utils/getTranslation';

const useTranslation = () => {
  const { formatMessage } = useIntl();
  const t = (id: string, params?: { [key: string]: string | number }) => formatMessage({ id: getTranslation(id) }, {
    ...Object.entries(params || {}).reduce((acc: { [key: string]: string }, [key, value]) => {
      acc[key] = typeof value === "number" ? value.toString() : value;
      return acc;
    }, {})
  });
  return { t };
};

export default useTranslation;