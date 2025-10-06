"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  DollarSign, 
  Users, 
  Activity, 
  Book, 
  CheckCircle, 
  TrendingUp, 
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Eye,
  ShoppingBag,
  Calendar,
  Clock,
  Star,
  Loader2
} from 'lucide-react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import {
  getDashboardStats,
  getRecentActivities,
  getTopCourses,
  getRevenueChartData,
  getCourseDistribution,
  type DashboardStats,
  type RecentActivity,
  type TopCourse,
  type RevenueData,
  type CourseDistribution
} from '@/lib/dashboardData';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

export default function AdminDashboardPage() {
  const [isDark, setIsDark] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [topCourses, setTopCourses] = useState<TopCourse[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData>({ labels: [], data: [] });
  const [courseDistribution, setCourseDistribution] = useState<CourseDistribution>({ labels: [], data: [] });

  useEffect(() => {
    const checkDarkMode = () => {
      const isDarkTheme = document.documentElement.classList.contains('dark');
      setIsDark(isDarkTheme);
    };

    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [statsData, activities, courses, revenue, distribution] = await Promise.all([
          getDashboardStats(),
          getRecentActivities(),
          getTopCourses(),
          getRevenueChartData(),
          getCourseDistribution()
        ]);

        setStats(statsData);
        setRecentActivities(activities);
        setTopCourses(courses);
        setRevenueData(revenue);
        setCourseDistribution(distribution);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const chartData = {
    revenue: {
      labels: revenueData.labels,
      datasets: [
        {
          label: 'Revenue',
          data: revenueData.data,
          borderColor: 'hsl(var(--primary))',
          backgroundColor: 'hsl(var(--primary) / 0.1)',
          tension: 0.4,
        },
      ],
    },
    courseDistribution: {
      labels: courseDistribution.labels,
      datasets: [
        {
          data: courseDistribution.data,
          backgroundColor: [
            'hsl(var(--primary))',
            'hsl(var(--secondary))',
            'hsl(var(--accent))',
            'hsl(var(--muted))',
            'hsl(var(--destructive))',
          ],
        },
      ],
    },
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: 'hsl(var(--muted-foreground))' },
      },
      y: {
        grid: { color: 'hsl(var(--border))' },
        ticks: { color: 'hsl(var(--muted-foreground))' },
      },
    },
  };

  return (
    <div className="space-y-8 p-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening with your platform today.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link href="/admin/analytics">
              <Eye className="mr-2 h-4 w-4" />
              View Analytics
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/courses/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Course
            </Link>
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Revenue
                </CardTitle>
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₦{stats?.totalRevenue.toLocaleString() || '0'}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className={`flex items-center gap-1 ${
                    (stats?.revenueChange || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {(stats?.revenueChange || 0) >= 0 ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {stats?.revenueChange.toFixed(1)}%
                  </div>
                  <span>from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Users
                </CardTitle>
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.activeUsers.toLocaleString() || '0'}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className={`flex items-center gap-1 ${
                    (stats?.usersChange || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {(stats?.usersChange || 0) >= 0 ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {stats?.usersChange.toFixed(1)}%
                  </div>
                  <span>from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Course Completions
                </CardTitle>
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.courseCompletions.toLocaleString() || '0'}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className={`flex items-center gap-1 ${
                    (stats?.completionsChange || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {(stats?.completionsChange || 0) >= 0 ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {stats?.completionsChange.toFixed(1)}%
                  </div>
                  <span>from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Courses
                </CardTitle>
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Book className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.totalCourses || '0'}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1 text-green-600">
                    <Plus className="h-3 w-3" />
                    {stats?.coursesChange || 0}
                  </div>
                  <span>new this month</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Charts and Analytics */}
      {!loading && (
        <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
            <CardDescription>
              Monthly revenue for the last 6 months
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {revenueData.labels.length > 0 ? (
                <Line options={chartOptions} data={chartData.revenue} />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No revenue data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Course Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Course Categories</CardTitle>
            <CardDescription>
              Distribution by category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {courseDistribution.labels.length > 0 ? (
                <Doughnut 
                  data={chartData.courseDistribution}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: {
                          usePointStyle: true,
                          padding: 20,
                        },
                      },
                    },
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No courses available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        </div>
      )}

      {/* Recent Activity and Top Courses */}
      {!loading && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest user interactions on your platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.length > 0 ? (
                  recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                        {activity.avatar}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm">
                          <span className="font-medium">{activity.user}</span>{' '}
                          {activity.action}{' '}
                          <span className="font-medium">{activity.course}</span>
                        </p>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {activity.time}
                          </span>
                        </div>
                      </div>
                      <Badge variant={
                        activity.type === 'completion' ? 'default' :
                        activity.type === 'purchase' ? 'secondary' :
                        'outline'
                      }>
                        {activity.type}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No recent activity
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Courses */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Courses</CardTitle>
              <CardDescription>
                Your most successful courses this month
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topCourses.length > 0 ? (
                  topCourses.map((course, index) => (
                    <div key={course.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{course.name}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {course.students} students
                            </span>
                            <span className="flex items-center gap-1">
                              <Star className="h-3 w-3" />
                              {course.rating}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{course.revenue}</p>
                          <p className="text-xs text-muted-foreground">revenue</p>
                        </div>
                      </div>
                      <Progress value={(course.students / Math.max(...topCourses.map(c => c.students), 1)) * 100} className="h-2" />
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No course data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks and shortcuts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-20 flex-col gap-2" asChild>
              <Link href="/admin/courses">
                <Book className="h-6 w-6" />
                <span>Manage Courses</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2" asChild>
              <Link href="/admin/users">
                <Users className="h-6 w-6" />
                <span>Manage Users</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2" asChild>
              <Link href="/admin/marketplace">
                <ShoppingBag className="h-6 w-6" />
                <span>Marketplace</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2" asChild>
              <Link href="/admin/settings">
                <Activity className="h-6 w-6" />
                <span>Settings</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

    

    

    