import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowLeft, TrendingUp, BarChart3, Package, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useItems } from '../../hooks/useItems';

type SalesTrend = { date: string; revenue: number };
type TopProduct = {
    item_name: string;
    brand_name: string | null;
    category_name: string | null;
    total_quantity: string;
    total_revenue: string;
};

export const BIPage = () => {
    const { token } = useAuth();
    const { items } = useItems();
    const [period, setPeriod] = useState<number>(30);
    const [selectedItemId, setSelectedItemId] = useState<string>('');
    const [trendData, setTrendData] = useState<SalesTrend[]>([]);
    const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBI = async () => {
            if (!token) return;
            setLoading(true);
            try {
                const url = new URL(`${import.meta.env.VITE_API_URL}/bi/sales-trend`);
                url.searchParams.append('period', period.toString());
                if (selectedItemId) {
                    url.searchParams.append('item_id', selectedItemId);
                }

                const [trendRes, topRes] = await Promise.all([
                    fetch(url.toString(), {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    fetch(`${import.meta.env.VITE_API_URL}/bi/top-products?period=${period}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                ]);
                
                if (trendRes.ok && topRes.ok) {
                    setTrendData(await trendRes.json());
                    setTopProducts(await topRes.json());
                }
            } catch (err) {
                console.error('Error fetching BI data', err);
            } finally {
                setLoading(false);
            }
        };
        fetchBI();
    }, [token, period, selectedItemId]);

    const fmtMoney = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD' }).format(n);

    // Formatear datos para el gráfico de barras
    const barData = topProducts.map(p => ({
        name: p.brand_name ? `${p.item_name} (${p.brand_name})` : p.item_name,
        'Unidades Vendidas': parseFloat(p.total_quantity),
        'Ingresos ($)': parseFloat(p.total_revenue)
    }));

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
            <AppHeader title="Inteligencia de Negocios" />
            
            <main className="max-w-7xl mx-auto px-4 mt-6 space-y-6">
                
                {/* ── Controles ────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Link to="/dashboard" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                            <ArrowLeft size={20} />
                        </Link>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <TrendingUp className="text-violet-500" />
                            Análisis de Ventas
                        </h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Filtro de Producto */}
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 rounded-lg px-2">
                            <Package size={16} className="text-slate-400" />
                            <select 
                                value={selectedItemId}
                                onChange={(e) => setSelectedItemId(e.target.value)}
                                className="bg-transparent border-none py-2 px-2 font-semibold text-slate-700 dark:text-slate-300 focus:ring-0 max-w-[200px] truncate"
                            >
                                <option value="">Todos los Productos</option>
                                {items.map(item => (
                                    <option key={item.id} value={item.id}>
                                        {item.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Filtro de Período */}
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 rounded-lg px-2">
                            <Calendar size={16} className="text-slate-400" />
                            <select 
                                value={period}
                                onChange={(e) => setPeriod(Number(e.target.value))}
                                className="bg-transparent border-none py-2 px-2 font-semibold text-slate-700 dark:text-slate-300 focus:ring-0"
                            >
                                <option value={7}>Últimos 7 días</option>
                                <option value={30}>Últimos 30 días</option>
                                <option value={90}>Últimos 90 días</option>
                                <option value={365}>Último Año</option>
                            </select>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* ── Tendencia de Ingresos ────────────────────────────────────────── */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                                <BarChart3 className="text-emerald-500" />
                                Tendencia de Ingresos Diarios
                            </h3>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                        <XAxis dataKey="date" tick={{fontSize: 12}} stroke="#888888" />
                                        <YAxis tickFormatter={(v) => `$${v}`} tick={{fontSize: 12}} stroke="#888888" />
                                        <Tooltip 
                                            formatter={(value: number) => [fmtMoney(value), 'Ingresos']}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{r: 4}} activeDot={{r: 8}} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* ── Top Productos Vendidos ────────────────────────────────────────── */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                                <Package className="text-violet-500" />
                                Top 10 Productos Más Vendidos
                            </h3>
                            <div className="h-96">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} horizontal={false} />
                                        <XAxis type="number" stroke="#888888" />
                                        <YAxis dataKey="name" type="category" tick={{fontSize: 11}} stroke="#888888" width={120} />
                                        <Tooltip 
                                            formatter={(value: number, name: string) => [name === 'Ingresos ($)' ? fmtMoney(value) : value, name]}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Legend />
                                        <Bar dataKey="Unidades Vendidas" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                                        <Bar dataKey="Ingresos ($)" fill="#10b981" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                    </div>
                )}
            </main>
        </div>
    );
};
