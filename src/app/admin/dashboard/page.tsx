
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Users, Activity, Book, Wand2, CheckCircle } from "lucide-react";
import Link from "next/link";
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData,
} from 'chart.js';
import { useEffect, useState } from "react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const stats = [
  { title: "Monthly Revenue", value: "$1,250", icon: DollarSign, change: "+12.5%" , changeType: "positive" as "positive" | "negative", iconBg: "bg-gradient-to-tr from-blue-500 to-blue-400", textColor: "text-blue-500" },
  { title: "Total Registered Users", value: "840", icon: Users, change: "+80" , changeType: "positive" as "positive" | "negative", iconBg: "bg-gradient-to-tr from-green-500 to-green-400", textColor: "text-green-500"},
  { title: "Active Users (24h)", value: "150", icon: Activity, change: "-5.2%" , changeType: "negative" as "positive" | "negative", iconBg: "bg-gradient-to-tr from-orange-500 to-orange-400", textColor: "text-orange-500"},
  { title: "Total Courses", value: "12", icon: Book, change: "+2" , changeType: "positive" as "positive" | "negative", iconBg: "bg-gradient-to-tr from-purple-500 to-purple-400", textColor: "text-purple-500"},
];

const getChartData = (isDark: boolean): { engagement: ChartData<'bar'>, popularity: ChartData<'bar'> } => ({
  engagement: {
    labels: ['January', 'February', 'March', 'April', 'May', 'June'],
    datasets: [
      {
        label: 'New Users',
        data: [65, 59, 80, 81, 56, 55],
        backgroundColor: 'hsl(var(--chart-1))',
        borderRadius: 4,
      },
      {
        label: 'Completed Courses',
        data: [28, 48, 40, 19, 86, 27],
        backgroundColor: 'hsl(var(--chart-2))',
        borderRadius: 4,
      },
    ],
  },
  popularity: {
    labels: ['Intro to React', 'Advanced CSS', 'AI for Devs', 'UX Fundamentals', 'Project Management'],
    datasets: [{
      label: '# of Enrolled Users',
      data: [120, 95, 150, 75, 60],
      backgroundColor: [
          'hsl(var(--chart-1))',
          'hsl(var(--chart-2))',
          'hsl(var(--chart-3))',
          'hsl(var(--chart-4))',
          'hsl(var(--chart-5))',
      ],
      borderColor: 'hsl(var(--border))',
      borderWidth: 1,
      borderRadius: 4,
    }]
  },
});

const getChartOptions = (isDark: boolean): ChartOptions<'bar'> => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        color: isDark ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))',
        boxWidth: 20,
        padding: 20,
      }
    },
    tooltip: {
      backgroundColor: isDark ? 'hsl(var(--background))' : '#fff',
      titleColor: isDark ? 'hsl(var(--foreground))' : '#000',
      bodyColor: isDark ? 'hsl(var(--foreground))' : '#000',
      borderColor: 'hsl(var(--border))',
      borderWidth: 1,
    }
  },
  scales: {
      x: {
          ticks: { color: 'hsl(var(--muted-foreground))' },
          grid: { color: 'hsl(var(--border))' }
      },
      y: {
          ticks: { color: 'hsl(var(--muted-foreground))' },
          grid: { color: 'hsl(var(--border))' }
      }
  }
});


export default function AdminDashboardPage() {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const checkDarkMode = () => {
            const isDarkTheme = document.documentElement.classList.contains('dark');
            setIsDark(isDarkTheme);
        };

        checkDarkMode(); // Initial check

        // Optional: Listen for changes if you have a theme switcher
        const observer = new MutationObserver(checkDarkMode);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

        return () => observer.disconnect();
    }, []);

    const chartData = getChartData(isDark);
    const chartOptions = getChartOptions(isDark);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Welcome Back, Admin!</h1>
          <p className="text-muted-foreground">Here's a summary of your platform's activity.</p>
        </div>
        <div className="flex gap-2">
            <Button asChild>
              <Link href="/admin/courses/new"><Book className="mr-2 h-4 w-4" /> Add Course</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/admin/tools/new"><Wand2 className="mr-2 h-4 w-4" /> Add AI Tool</Link>
            </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
               <div className={`p-3 rounded-full ${stat.iconBg} text-white`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{stat.title}</p>
              <div className={`text-2xl font-bold ${stat.textColor}`}>{stat.value}</div>
              <p className={`text-xs ${stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'} flex items-center gap-1`}>
                {stat.change}
                 <span className="text-muted-foreground text-xs font-normal">from last month</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-sm hover:shadow-md transition-shadow col-span-2 lg:col-span-1">
            <CardHeader>
                <CardTitle>User Engagement</CardTitle>
                <CardDescription>New users and course completions over the last 6 months.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="h-80 w-full">
                    <Bar options={chartOptions} data={chartData.engagement} />
                </div>
            </CardContent>
        </Card>
         <Card className="shadow-sm hover:shadow-md transition-shadow col-span-2 lg:col-span-1">
            <CardHeader>
                <CardTitle>Most Popular Courses</CardTitle>
                <CardDescription>Top courses by user enrollment.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-80 w-full">
                    <Bar options={{...chartOptions, indexAxis: 'y' as const}} data={chartData.popularity} />
                </div>
            </CardContent>
        </Card>
      </div>

      {/* Recent Activity / Quick Links Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Recent User Activity</CardTitle>
            <CardDescription>Overview of the latest user engagement.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Placeholder for recent enrollments list */}
            <ul className="space-y-4 text-sm">
              <li className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>John Doe enrolled in "Intro to React"</span> 
                </div>
                <span className="text-muted-foreground text-xs">2 hours ago</span>
              </li>
               <li className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  <span>Jane Smith completed "Advanced CSS"</span> 
                </div>
                <span className="text-muted-foreground text-xs">5 hours ago</span>
              </li>
               <li className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>Mike Ross purchased "AI Content Generator"</span> 
                </div>
                <span className="text-muted-foreground text-xs">1 day ago</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
             <CardDescription>Access common admin tasks quickly.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Button variant="outline" asChild><Link href="/admin/courses">Manage Courses</Link></Button>
            <Button variant="outline" asChild><Link href="/admin/tools">Manage AI Tools</Link></Button>
            <Button variant="outline" asChild><Link href="/admin/users">Manage Users</Link></Button>
            <Button variant="outline" asChild><Link href="/admin/settings">Platform Settings</Link></Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

    

    

    