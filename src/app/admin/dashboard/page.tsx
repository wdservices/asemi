
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Users, Activity, FileText, PlusCircle } from "lucide-react";
import Link from "next/link";

// Sample data for dashboard cards
const stats = [
  { title: "Monthly Revenue", value: "$4,250", icon: DollarSign, change: "+15.2%" , changeType: "positive" as "positive" | "negative" },
  { title: "Total Registered Users", value: "2,530", icon: Users, change: "+120" , changeType: "positive" as "positive" | "negative"},
  { title: "Active Users (24h)", value: "450", icon: Activity, change: "+8.5%" , changeType: "positive" as "positive" | "negative"},
  { title: "Total Exams", value: "85", icon: FileText, change: "+5" , changeType: "positive" as "positive" | "negative"},
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">PrepMate Admin Dashboard</h1>
        <Button asChild>
          <Link href="/admin/exams/new"><PlusCircle className="mr-2 h-4 w-4" /> Add New Exam</Link>
        </Button>
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
              <li className="flex justify-between"><span>John Doe started JAMB 2023</span> <span className="text-muted-foreground">2 hours ago</span></li>
              <li className="flex justify-between"><span>Jane Smith completed WAEC Physics</span> <span className="text-muted-foreground">5 hours ago</span></li>
              <li className="flex justify-between"><span>Mike Ross subscribed to Premium</span> <span className="text-muted-foreground">1 day ago</span></li>
            </ul>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
             <CardDescription>Access common admin tasks quickly.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Button variant="outline" asChild><Link href="/admin/exams">Manage Exams</Link></Button>
            <Button variant="outline" asChild><Link href="/admin/users">Manage Users</Link></Button>
            <Button variant="outline" asChild><Link href="/admin/analytics">View Analytics</Link></Button>
            <Button variant="outline" asChild><Link href="/admin/settings">Platform Settings</Link></Button>
          </CardContent>
        </Card>
      </div>
      
      {/* Placeholder for charts */}
      <Card className="shadow-sm">
        <CardHeader>
            <CardTitle>User Engagement</CardTitle>
            <CardDescription>Chart of daily active users. (Placeholder)</CardDescription>
        </CardHeader>
        <CardContent className="h-80 bg-muted flex items-center justify-center rounded-b-lg">
            <p className="text-muted-foreground">Chart data would be displayed here.</p>
        </CardContent>
      </Card>

    </div>
  );
}
