/**
 * AppHeader.tsx — Encabezado reutilizable para todas las páginas admin.
 *
 * Uso:
 *   <AppHeader
 *     icon="📊"
 *     title="Arqueo de Caja"
 *     subtitle="23 transacciones · Tasa BCV: Bs. 38.50"
 *     links={[{ to: '/', label: '← Dashboard' }, { to: '/pos', label: 'POS →' }]}
 *     actions={<button>Exportar</button>}
 *   />
 */
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthProvider';
import { useSettingsContext } from '../contexts/SettingsProvider';

interface AppHeaderLink {
    to: string;
    label: string;
    external?: boolean;
}

interface AppHeaderProps {
    icon?: string;
    title: string;
    subtitle?: string;
    links?: AppHeaderLink[];
    actions?: React.ReactNode;
    showUser?: boolean;
}

export const AppHeader = ({
    icon,
    title,
    subtitle,
    links = [{ to: '/', label: '← Dashboard' }],
    actions,
    showUser = true,
}: AppHeaderProps) => {
    const { user, logout } = useAuth();
    const { toggleDarkMode, darkMode } = useSettingsContext();

    return (
        <header className="bg-slate-900 text-white px-4 sm:px-6 py-4 flex items-center justify-between shadow-md shrink-0">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                {links.length > 0 && (
                    <nav className="flex items-center gap-1 sm:gap-2 flex-wrap">
                        {links.map((link, i) => (
                            link.external ? (
                                <a
                                    key={i}
                                    href={link.to}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs sm:text-sm text-slate-300 hover:text-white transition-colors whitespace-nowrap"
                                >
                                    {link.label}
                                </a>
                            ) : (
                                <Link
                                    key={i}
                                    to={link.to}
                                    className="text-xs sm:text-sm text-slate-300 hover:text-white transition-colors whitespace-nowrap"
                                >
                                    {link.label}
                                </Link>
                            )
                        ))}
                    </nav>
                )}
                <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2 truncate">
                    {icon && <span>{icon}</span>}
                    <span className="truncate">{title}</span>
                </h1>
                {subtitle && (
                    <span className="hidden md:inline text-xs text-slate-400 ml-2">
                        {subtitle}
                    </span>
                )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                {actions}
                <button
                    onClick={toggleDarkMode}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg text-sm transition-colors hidden sm:block"
                    title="Alternar modo oscuro"
                >
                    {darkMode ? '🌞' : '🌙'}
                </button>
                {showUser && user && (
                    <div className="flex items-center gap-2">
                        <span className="text-slate-300 text-xs hidden lg:inline">{user.username}</span>
                        <button
                            onClick={logout}
                            className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                        >
                            Salir
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
};

export default AppHeader;
