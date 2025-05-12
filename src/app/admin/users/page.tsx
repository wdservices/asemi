
"use client";
import { mockUsers } from '@/lib/mockData';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MoreHorizontal, Edit, Trash2, ShieldCheck, UserCog } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function AdminUsersPage() {
  const users = mockUsers; // In a real app, fetch users from backend
  const { toast } = useToast();

  const handleRoleChange = (userId: string, currentRole: boolean | undefined) => {
    // Placeholder for role change functionality
    const newRole = !currentRole;
    console.log(`Changing role for user ${userId} to ${newRole ? 'Admin' : 'User'}`);
    toast({ title: "User Role Updated (Mock)", description: `User role has been updated.`, variant: "default" });
  };

  const handleDeleteUser = (userId: string, userName: string | null) => {
    // Placeholder for delete functionality
    if(confirm(`Are you sure you want to delete user "${userName || 'Unknown User'}"? This action cannot be undone.`)) {
        console.log("Deleting user:", userId);
        toast({ title: "User Deleted (Mock)", description: `User "${userName}" has been deleted.`, variant = "default" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Manage Users</h1>
        {/* <Button>Add New User</Button> // If manual user addition is needed */}
      </div>

      <Card className="shadow-sm">
         <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>View and manage platform users.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead className="hidden w-[80px] sm:table-cell">Avatar</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="hidden md:table-cell">Role</TableHead>
                <TableHead className="hidden md:table-cell">Enrolled Courses</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {users.map((user) => (
                <TableRow key={user.id}>
                    <TableCell className="hidden sm:table-cell">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatarUrl || `https://avatar.vercel.sh/${user.email}.png`} alt={user.displayName || "User Avatar"} data-ai-hint="user avatar" />
                        <AvatarFallback>{user.displayName?.split(' ').map(n=>n[0]).join('').toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">{user.displayName || 'N/A'}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="hidden md:table-cell">
                        <Badge variant={user.isAdmin ? 'default' : 'secondary'}>
                            {user.isAdmin ? 'Admin' : 'User'}
                        </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{user.enrolledCourseIds?.length || 0}</TableCell>
                    <TableCell>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                        </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>
                            <UserCog className="mr-2 h-4 w-4" />Edit User (Profile)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleRoleChange(user.id, user.isAdmin)}>
                           {user.isAdmin ? <UserCog className="mr-2 h-4 w-4" /> : <ShieldCheck className="mr-2 h-4 w-4" /> }
                           {user.isAdmin ? 'Make User' : 'Make Admin'}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                            onClick={() => handleDeleteUser(user.id, user.displayName)}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />Delete User
                        </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    </TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        </CardContent>
      </Card>
      {users.length === 0 && (
        <p className="text-center text-muted-foreground py-4">No users found.</p>
      )}
    </div>
  );
}