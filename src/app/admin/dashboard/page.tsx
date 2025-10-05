
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
  Star
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

const stats = [
  {
    title: "Total Revenue",
    value: "$45,231.89",
    change: "+20.1%",
    changeType: "positive" as const,
    icon: DollarSign,
    description: "from last month",
    trend: [20, 25, 30, 28, 35, 40, 45]
  },
  {
    title: "Active Users",
    value: "2,350",
    change: "+180.1%",
    changeType: "positive" as const,
    icon: Users,
    description: "from last month",
    trend: [15, 18, 22, 25, 28, 30, 35]
  },
  {
    title: "Course Completions",
    value: "12,234",
    change: "+19%",
    changeType: "positive" as const,
    icon: Activity,
    description: "from last month",
    trend: [10, 12, 15, 18, 20, 22, 25]
  },
  {
    title: "Total Courses",
    value: "573",
    change: "+201",
    changeType: "positive" as const,
    icon: Book,
    description: "new this month",
    trend: [5, 8, 12, 15, 18, 20, 25]
  },
];

const recentActivities = [
  {
    id: 1,
    user: "John Doe",
    action: "enrolled in",
    course: "Advanced React Development",
    time: "2 hours ago",
    type: "enrollment",
    avatar: "JD"
  },
  {
    id: 2,
    user: "Jane Smith",
    action: "completed",
    course: "CSS Grid Mastery",
    time: "5 hours ago",
    type: "completion",
    avatar: "JS"
  },
  {
    id: 3,
    user: "Mike Ross",
    action: "purchased",
    course: "JavaScript Fundamentals",
    time: "1 day ago",
    type: "purchase",
    avatar: "MR"
  },
  {
    id: 4,
    user: "Sarah Wilson",
    action: "started",
    course: "UI/UX Design Principles",
    time: "2 days ago",
    type: "start",
    avatar: "SW"
  }
];

const topCourses = [
  { name: "React Development", students: 1234, rating: 4.8, revenue: "$12,450" },
  { name: "JavaScript Mastery", students: 987, rating: 4.7, revenue: "$9,870" },
  { name: "CSS Advanced", students: 756, rating: 4.6, revenue: "$7,560" },
  { name: "Node.js Backend", students: 543, rating: 4.9, revenue: "$5,430" },
];

export default function AdminDashboardPage() {
  const [isDark, setIsDark] = useState(false);

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

  const chartData = {
    revenue: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [
        {
          label: 'Revenue',
          data: [12000, 19000, 15000, 25000, 22000, 30000],
          borderColor: 'hsl(var(--primary))',
          backgroundColor: 'hsl(var(--primary) / 0.1)',
          tension: 0.4,
        },
      ],
    },
    courseDistribution: {
      labels: ['Programming', 'Design', 'Marketing', 'Business', 'Other'],
      datasets: [
        {
          data: [35, 25, 20, 15, 5],
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

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={stat.title} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <stat.icon className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className={`flex items-center gap-1 ${
                  stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.changeType === 'positive' ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {stat.change}
                </div>
                <span>{stat.description}</span>
              </div>
              {/* Mini trend chart */}
              <div className="mt-3 h-8">
                <div className="flex items-end gap-1 h-full">
                  {stat.trend.map((value, i) => (
                    <div
                      key={i}
                      className="bg-primary/20 rounded-sm flex-1"
                      style={{ height: `${(value / Math.max(...stat.trend)) * 100}%` }}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts and Analytics */}
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
              <Line options={chartOptions} data={chartData.revenue} />
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
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity and Top Courses */}
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
              {recentActivities.map((activity) => (
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
              ))}
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
              {topCourses.map((course, index) => (
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
                  <Progress value={(course.students / 1500) * 100} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

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

    

    

    