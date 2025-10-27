import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

interface ErrorPageProps {
  errorCode?: string;
  title?: string;
  message?: string;
  showHomeButton?: boolean;
  showBackButton?: boolean;
  showContactSupport?: boolean;
}

const ErrorPage: React.FC<ErrorPageProps> = ({
  errorCode = '500',
  title,
  message,
  showHomeButton = true,
  showBackButton = true,
  showContactSupport = false
}) => {
  const { t } = useTranslation('common');

  const getDefaultTitleAndMessage = (code: string) => {
    switch (code) {
      case '404':
        return {
          title: t('errors.pageNotFound'),
          message: 'The page you are looking for does not exist.'
        };
      case '401':
        return {
          title: t('errors.unauthorized'),
          message: 'You are not authorized to access this resource.'
        };
      case '403':
        return {
          title: t('errors.forbidden'),
          message: 'Access to this resource is forbidden.'
        };
      case '500':
      default:
        return {
          title: t('errors.serverError'),
          message: 'An internal server error occurred. Please try again later.'
        };
    }
  };

  const defaults = getDefaultTitleAndMessage(errorCode);
  const finalTitle = title || defaults.title;
  const finalMessage = message || defaults.message;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8">
      <div className="max-w-max mx-auto">
        <main className="sm:flex">
          <p className="text-4xl font-extrabold text-primary-600 sm:text-5xl">
            {errorCode}
          </p>
          <div className="sm:ml-6">
            <div className="sm:border-l sm:border-gray-200 sm:pl-6">
              <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight sm:text-5xl">
                {finalTitle}
              </h1>
              <p className="mt-1 text-base text-gray-500 dark:text-gray-400">
                {finalMessage}
              </p>
            </div>
            <div className="mt-10 flex space-x-3 sm:border-l sm:border-transparent sm:pl-6">
              {showHomeButton && (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                >
                  {t('home')}
                </Link>
              )}
              {showBackButton && (
                <button
                  onClick={() => window.history.back()}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:border-gray-600 dark:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
                >
                  {t('back')}
                </button>
              )}
              {showContactSupport && (
                <a
                  href="mailto:support@pie-docs.com"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:border-gray-600 dark:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
                >
                  Contact Support
                </a>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ErrorPage;