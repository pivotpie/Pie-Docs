import { useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface BreadcrumbItem {
  label: string;
  path: string;
  isActive?: boolean;
}

interface BreadcrumbProps {
  className?: string;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ className = '' }) => {
  const { t } = useTranslation(['navigation', 'common']);
  const location = useLocation();

  // Generate breadcrumb items based on current path
  const generateBreadcrumbs = (pathname: string): BreadcrumbItem[] => {
    const pathSegments = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];

    // Always start with Home/Dashboard
    breadcrumbs.push({
      label: t('navigation:dashboard'),
      path: '/dashboard',
      isActive: pathname === '/dashboard'
    });

    // If we're on dashboard, return early
    if (pathname === '/dashboard' || pathname === '/') {
      return breadcrumbs;
    }

    // Build breadcrumbs for other paths
    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === pathSegments.length - 1;

      // Map path segments to display names
      let label = segment;
      switch (segment) {
        case 'documents':
          label = t('navigation:documents');
          break;
        case 'search':
          label = t('navigation:search');
          break;
        case 'workflows':
          label = t('navigation:workflows');
          break;
        case 'admin':
          label = t('common:settings');
          break;
        default:
          // For dynamic segments like IDs, use the segment value
          label = segment.charAt(0).toUpperCase() + segment.slice(1);
      }

      breadcrumbs.push({
        label,
        path: currentPath,
        isActive: isLast
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs(location.pathname);

  // Don't show breadcrumbs for authentication pages
  if (location.pathname.includes('/login') ||
      location.pathname.includes('/forgot-password') ||
      location.pathname.includes('/reset-password')) {
    return null;
  }

  return (
    <nav
      className={`flex ${className}`}
      aria-label={t('common:navigation.main')}
    >
      <ol className="inline-flex items-center space-x-1 md:space-x-3 rtl:space-x-reverse">
        {breadcrumbs.map((item, index) => (
          <li key={item.path} className="inline-flex items-center">
            {index > 0 && (
              <svg
                className="w-3 h-3 text-white/40 mx-1 rtl:rotate-180"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 6 10"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="m1 9 4-4-4-4"
                />
              </svg>
            )}

            {item.isActive ? (
              <span className="text-sm font-medium text-white/90">
                {item.label}
              </span>
            ) : (
              <Link
                to={item.path}
                className="inline-flex items-center text-sm font-medium text-white/70 hover:text-white transition-colors"
              >
                {index === 0 && (
                  <svg
                    className="w-3 h-3 me-2.5 rtl:me-0 rtl:ms-2.5"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="m19.707 9.293-2-2-7-7a1 1 0 0 0-1.414 0l-7 7-2 2a1 1 0 0 0 1.414 1.414L2 10.414V18a2 2 0 0 0 2 2h3a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h3a2 2 0 0 0 2-2v-7.586l.293.293a1 1 0 0 0 1.414-1.414Z" />
                  </svg>
                )}
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumb;