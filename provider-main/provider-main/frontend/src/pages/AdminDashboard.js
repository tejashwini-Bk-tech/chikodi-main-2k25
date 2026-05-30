import React, { useState } from 'react';
import {
    BarChart3,
    Users,
    Briefcase,
    DollarSign,
    TrendingUp,
    Activity,
    Settings,
    Bell,
    LogOut,
    Menu,
    X,
    FileText,
    MapPin,
    Star,
    Clock,
    CheckCircle,
    AlertCircle,
    Eye,
    Edit2,
    Trash2,
    Download,
    Filter,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

const AdminDashboard = () => {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // Dummy Stats
    const stats = [
        { title: 'Total Users', value: '12,450', icon: Users, trend: '+12.5%', color: 'cyan' },
        { title: 'Active Providers', value: '892', icon: Briefcase, trend: '+8.2%', color: 'teal' },
        { title: 'Total Revenue', value: '$124,560', icon: DollarSign, trend: '+24.8%', color: 'emerald' },
        { title: 'Completed Bookings', value: '8,941', icon: CheckCircle, trend: '+15.3%', color: 'blue' },
    ];

    // Dummy Recent Bookings
    const recentBookings = [
        {
            id: 'BK001',
            user: 'John Doe',
            service: 'Plumbing',
            provider: 'Mike Johnson',
            amount: '$85',
            status: 'Completed',
            date: '2 hours ago',
        },
        {
            id: 'BK002',
            user: 'Sarah Smith',
            service: 'Electrical',
            provider: 'Alex Kumar',
            amount: '$120',
            status: 'In Progress',
            date: '30 mins ago',
        },
        {
            id: 'BK003',
            user: 'Emma Wilson',
            service: 'Cleaning',
            provider: 'Lisa Chen',
            amount: '$65',
            status: 'Pending',
            date: '5 mins ago',
        },
        {
            id: 'BK004',
            user: 'Michael Brown',
            service: 'AC Repair',
            provider: 'David Patel',
            amount: '$200',
            status: 'Completed',
            date: '4 hours ago',
        },
        {
            id: 'BK005',
            user: 'Jessica Lee',
            service: 'Painting',
            provider: 'Tom Harris',
            amount: '$150',
            status: 'In Progress',
            date: '1 hour ago',
        },
    ];

    // Dummy Top Services
    const topServices = [
        { name: 'Home Cleaning', bookings: 2340, revenue: '$45,800' },
        { name: 'Plumbing', bookings: 1890, revenue: '$38,200' },
        { name: 'Electrical Work', bookings: 1650, revenue: '$42,500' },
        { name: 'AC Repair', bookings: 1420, revenue: '$39,800' },
        { name: 'Painting', bookings: 1200, revenue: '$28,400' },
    ];

    const menuItems = [
        { icon: BarChart3, label: 'Dashboard', active: true },
        { icon: Users, label: 'Users', active: false },
        { icon: Briefcase, label: 'Providers', active: false },
        { icon: FileText, label: 'Bookings', active: false },
        { icon: DollarSign, label: 'Payments', active: false },
        { icon: Star, label: 'Reviews', active: false },
        { icon: Settings, label: 'Settings', active: false },
    ];

    const getStatusColor = (status) => {
        switch (status) {
            case 'Completed':
                return 'bg-emerald-100 text-emerald-800';
            case 'In Progress':
                return 'bg-cyan-100 text-cyan-800';
            case 'Pending':
                return 'bg-amber-100 text-amber-800';
            default:
                return 'bg-slate-100 text-slate-800';
        }
    };

    const getStatColor = (color) => {
        const colors = {
            cyan: 'bg-cyan-50 border-cyan-200',
            teal: 'bg-teal-50 border-teal-200',
            emerald: 'bg-emerald-50 border-emerald-200',
            blue: 'bg-blue-50 border-blue-200',
        };
        return colors[color] || 'bg-slate-50 border-slate-200';
    };

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar */}
            <aside
                className={`${sidebarOpen ? 'w-64' : 'w-20'
                    } bg-slate-900 text-white transition-all duration-300 fixed inset-y-0 left-0 z-50 overflow-y-auto`}
            >
                {/* Logo */}
                <div className="p-6 border-b border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-emerald-400 flex items-center justify-center">
                            <BarChart3 className="w-6 h-6 text-slate-900" />
                        </div>
                        {sidebarOpen && <span className="font-bold text-lg">FIXORA</span>}
                    </div>
                </div>

                {/* Menu */}
                <nav className="p-4 space-y-2">
                    {menuItems.map((item, idx) => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={idx}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${item.active
                                        ? 'bg-gradient-to-r from-cyan-600 to-emerald-600 text-white'
                                        : 'text-slate-300 hover:bg-slate-800'
                                    }`}
                            >
                                <Icon className="w-5 h-5 flex-shrink-0" />
                                {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
                            </button>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700">
                    <button className="w-full flex items-center gap-3 text-slate-300 hover:text-white transition">
                        <LogOut className="w-5 h-5" />
                        {sidebarOpen && <span className="text-sm">Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className={`${sidebarOpen ? 'ml-64' : 'ml-20'} flex-1 transition-all duration-300`}>
                {/* Top Bar */}
                <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
                    <div className="px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="p-2 hover:bg-slate-100 rounded-lg transition"
                            >
                                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                            </button>
                            <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
                        </div>
                        <div className="flex items-center gap-4">
                            <button className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition">
                                <Bell className="w-5 h-5" />
                                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                            </button>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-emerald-400 flex items-center justify-center text-white font-bold">
                                AD
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {stats.map((stat) => {
                            const Icon = stat.icon;
                            return (
                                <Card
                                    key={stat.title}
                                    className={`border-2 ${getStatColor(stat.color)} hover:shadow-lg transition`}
                                >
                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-sm text-slate-600 font-medium">{stat.title}</p>
                                                <p className="text-3xl font-bold text-slate-900 mt-2">{stat.value}</p>
                                                <p className="text-xs text-emerald-600 font-semibold mt-2">{stat.trend} from last month</p>
                                            </div>
                                            <div className={`p-3 rounded-lg ${getStatColor(stat.color).split(' ')[0]}`}>
                                                <Icon className="w-6 h-6 text-slate-600" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {/* Charts and Tables */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Recent Activity */}
                        <div className="lg:col-span-2">
                            <Card className="border-slate-200">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="flex items-center gap-2">
                                            <Activity className="w-5 h-5 text-cyan-600" />
                                            Recent Bookings
                                        </CardTitle>
                                        <Button variant="outline" size="sm" className="gap-2">
                                            <Filter className="w-4 h-4" />
                                            Filter
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-slate-200">
                                                    <th className="text-left py-3 px-2 font-semibold text-slate-600">Booking ID</th>
                                                    <th className="text-left py-3 px-2 font-semibold text-slate-600">User</th>
                                                    <th className="text-left py-3 px-2 font-semibold text-slate-600">Service</th>
                                                    <th className="text-left py-3 px-2 font-semibold text-slate-600">Provider</th>
                                                    <th className="text-left py-3 px-2 font-semibold text-slate-600">Amount</th>
                                                    <th className="text-left py-3 px-2 font-semibold text-slate-600">Status</th>
                                                    <th className="text-center py-3 px-2 font-semibold text-slate-600">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {recentBookings.map((booking) => (
                                                    <tr key={booking.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                                                        <td className="py-3 px-2 font-mono text-xs text-cyan-600">{booking.id}</td>
                                                        <td className="py-3 px-2">{booking.user}</td>
                                                        <td className="py-3 px-2">{booking.service}</td>
                                                        <td className="py-3 px-2">{booking.provider}</td>
                                                        <td className="py-3 px-2 font-semibold text-emerald-600">{booking.amount}</td>
                                                        <td className="py-3 px-2">
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(booking.status)}`}>
                                                                {booking.status}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-2 text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <button className="p-1 hover:bg-slate-200 rounded transition">
                                                                    <Eye className="w-4 h-4 text-slate-600" />
                                                                </button>
                                                                <button className="p-1 hover:bg-slate-200 rounded transition">
                                                                    <Edit2 className="w-4 h-4 text-blue-600" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Top Services */}
                        <div>
                            <Card className="border-slate-200">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-emerald-600" />
                                        Top Services
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {topServices.map((service, idx) => (
                                        <div key={idx} className="pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="font-semibold text-slate-900">{service.name}</p>
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-800">
                                                    {service.bookings}
                                                </span>
                                            </div>
                                            <p className="text-sm text-emerald-600 font-semibold">{service.revenue}</p>
                                            <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                                                <div
                                                    className="bg-gradient-to-r from-cyan-500 to-emerald-500 h-2 rounded-full"
                                                    style={{ width: `${(service.bookings / 2340) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="border-slate-200 bg-gradient-to-br from-cyan-50 to-cyan-100/50 border-cyan-200">
                            <CardContent className="p-6">
                                <Users className="w-8 h-8 text-cyan-600 mb-3" />
                                <p className="text-sm text-slate-600">Manage Users</p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">12,450</p>
                                <Button className="mt-4 w-full bg-cyan-600 hover:bg-cyan-700" size="sm">
                                    View All Users
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="border-slate-200 bg-gradient-to-br from-teal-50 to-teal-100/50 border-teal-200">
                            <CardContent className="p-6">
                                <Briefcase className="w-8 h-8 text-teal-600 mb-3" />
                                <p className="text-sm text-slate-600">Manage Providers</p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">892</p>
                                <Button className="mt-4 w-full bg-teal-600 hover:bg-teal-700" size="sm">
                                    View All Providers
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="border-slate-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
                            <CardContent className="p-6">
                                <DollarSign className="w-8 h-8 text-emerald-600 mb-3" />
                                <p className="text-sm text-slate-600">Revenue Report</p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">$124.5K</p>
                                <Button className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 gap-2" size="sm">
                                    <Download className="w-4 h-4" />
                                    Download Report
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
