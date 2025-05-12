
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Users, BookOpen, BarChart3, PlusCircle } from "lucide-react";
import Link from "next/link";

// Sample data for dashboard cards
const stats = [
  { title: "Total Revenue", value: "$12,345", icon: DollarSign, change: "+12.5%" , changeType: "positive" as "positive" | "negative" },
  { title: "Total Users", value: "1,280", icon: Users, change: "+50" , changeType: "positive" as "positive" | "negative"},
  { title: "Total Courses", value: "42", icon: BookOpen, change: "+3" , changeType: "positive" as "positive" | "negative"},
  { title: "Monthly Sales", value: "$2,500", icon: BarChart3, change: "-2.1%" , changeType: "negative" as "positive" | "negative"},
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <Button asChild>
          <Link href="/admin/courses/new"><PlusCircle className="mr-2 h-4 w-4" /> Add New Course</Link>
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
            <CardTitle>Recent Enrollments</CardTitle>
            <CardDescription>Overview of the latest user sign-ups for courses.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Placeholder for recent enrollments list */}
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between"><span>John Doe - Next.js Masterclass</span> <span className="text-muted-foreground">2 hours ago</span></li>
              <li className="flex justify-between"><span>Jane Smith - Tailwind CSS</span> <span className="text-muted-foreground">5 hours ago</span></li>
              <li className="flex justify-between"><span>Mike Ross - Python for Data Science</span> <span className="text-muted-foreground">1 day ago</span></li>
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
            <Button variant="outline" asChild><Link href="/admin/users">Manage Users</Link></Button>
            <Button variant="outline" asChild><Link href="/admin/analytics">View Analytics</Link></Button>
            <Button variant="outline" asChild><Link href="/admin/settings">Platform Settings</Link></Button>
          </CardContent>
        </Card>
      </div>
      
      {/* Placeholder for charts */}
      <Card className="shadow-sm">
        <CardHeader>
            <CardTitle>Sales Over Time</CardTitle>
            <CardDescription>Monthly sales performance chart. (Placeholder)</CardDescription>
        </CardHeader>
        <CardContent className="h-80 bg-muted flex items-center justify-center rounded-b-lg">
            <p className="text-muted-foreground">Chart data would be displayed here.</p>
        </CardContent>
      </Card>

    </div>
  );
}