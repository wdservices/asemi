
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Users, Activity, Book, PlusCircle, Wand2 } from "lucide-react";
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
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const stats = [
  { title: "Monthly Revenue", value: "$1,250", icon: DollarSign, change: "+12.5%" , changeType: "positive" as "positive" | "negative" },
  { title: "Total Registered Users", value: "840", icon: Users, change: "+80" , changeType: "positive" as "positive" | "negative"},
  { title: "Active Users (24h)", value: "150", icon: Activity, change: "-5.2%" , changeType: "negative" as "positive" | "negative"},
  { title: "Total Courses", value: "12", icon: Book, change: "+2" , changeType: "positive" as "positive" | "negative"},
];

const engagementData = {
  labels: ['January', 'February', 'March', 'April', 'May', 'June'],
  datasets: [
    {
      label: 'New Users',
      data: [65, 59, 80, 81, 56, 55],
      backgroundColor: 'hsl(var(--primary))',
      borderRadius: 4,
    },
    {
      label: 'Completed Courses',
      data: [28, 48, 40, 19, 86, 27],
      backgroundColor: 'hsl(var(--accent))',
      borderRadius: 4,
    },
  ],
};

const coursePopularityData = {
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
};

const chartOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        color: 'hsl(var(--muted-foreground))',
      }
    },
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
};


export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Asemi Admin Dashboard</h1>
        <div className="flex gap-2">
            <Button asChild>
              <Link href="/admin/courses/new"><Book className="mr-2 h-4 w-4" /> Add New Course</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/admin/tools/new"><Wand2 className="mr-2 h-4 w-4" /> Add AI Tool</Link>
            </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className={`text-xs ${stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                {stat.change} from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-sm">
            <CardHeader>
                <CardTitle>User Engagement</CardTitle>
                <CardDescription>New users and course completions over the last 6 months.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="h-80 w-full">
                    <Bar options={chartOptions} data={engagementData} />
                </div>
            </CardContent>
        </Card>
         <Card className="shadow-sm">
            <CardHeader>
                <CardTitle>Most Popular Courses</CardTitle>
                <CardDescription>Top courses by user enrollment.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-80 w-full">
                    <Bar options={{...chartOptions, indexAxis: 'y' as const}} data={coursePopularityData} />
                </div>
            </CardContent>
        </Card>
      </div>

      {/* Recent Activity / Quick Links Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Recent User Activity</CardTitle>
            <CardDescription>Overview of the latest user engagement.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Placeholder for recent enrollments list */}
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between"><span>John Doe enrolled in "Intro to React"</span> <span className="text-muted-foreground">2 hours ago</span></li>
              <li className="flex justify-between"><span>Jane Smith completed "Advanced CSS"</span> <span className="text-muted-foreground">5 hours ago</span></li>
              <li className="flex justify-between"><span>Mike Ross purchased "AI Content Generator"</span> <span className="text-muted-foreground">1 day ago</span></li>
            </ul>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
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
