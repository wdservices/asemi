
"use client";
import { collection, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MoreHorizontal, Edit, Trash2, ShieldCheck, UserCog, Loader2, BookOpen, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';

async function getAllUsers(): Promise<UserProfile[]> {
    const usersCol = collection(db, 'users');
    const userSnapshot = await getDocs(usersCol);
    return userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
}


export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        try {
          const [userList, courseList] = await Promise.all([
            getAllUsers(),
            fetch('/api/admin/enroll-user').then(res => res.json()).then(data => data.data || [])
          ]);
          setUsers(userList);
          setCourses(courseList);
        } catch (error) {
          console.error('Error fetching data:', error);
          toast({ 
            title: "Error", 
            description: "Failed to load data. Please try again.", 
            variant: "destructive" 
          });
        } finally {
          setLoading(false);
        }
    }
    fetchData();
  }, [toast]);

  const handleRoleChange = async (userId: string, currentRole: boolean | undefined) => {
    try {
      const newRole = !currentRole;
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isAdmin: newRole
      });
      
      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, isAdmin: newRole } : user
      ));
      
      toast({ 
        title: "User Role Updated", 
        description: `User role has been updated to ${newRole ? 'Admin' : 'User'}.` 
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({ 
        title: "Error", 
        description: "Failed to update user role. Please try again.", 
        variant: "destructive" 
      });
    }
  };

  const handleDeleteUser = async (userId: string, userName: string | null) => {
    if(confirm(`Are you sure you want to delete user "${userName || 'Unknown User'}"? This action cannot be undone.`)) {
      try {
        const userRef = doc(db, 'users', userId);
        await deleteDoc(userRef);
        
        // Update local state
        setUsers(users.filter(user => user.id !== userId));
        
        toast({ 
          title: "User Deleted", 
          description: `User "${userName}" has been deleted successfully.` 
        });
      } catch (error) {
        console.error('Error deleting user:', error);
        const errorMessage = error instanceof Error && error.message.includes('permissions') 
          ? "Insufficient permissions to delete users. Please check your Firestore security rules."
          : "Failed to delete user. Please try again.";
        
        toast({ 
          title: "Delete Failed", 
          description: errorMessage, 
          variant: "destructive" 
        });
      }
    }
  };

  const handleManualEnroll = async (userEmail: string, userName: string) => {
    if (courses.length === 0) {
      toast({
        title: "No Courses Available",
        description: "No courses found to enroll the user in.",
        variant: "destructive"
      });
      return;
    }

    // For simplicity, let's enroll in the first available course
    // In a real app, you'd want a course selection dialog
    const courseId = courses[0]?.id;
    const courseName = courses[0]?.title;
    
    if (!courseId) {
      toast({
        title: "Error",
        description: "No valid course found.",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch('/api/admin/enroll-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, courseId })
      });

      const data = await response.json();

      if (data.status === 'success') {
        toast({
          title: "User Enrolled",
          description: `${userName} has been enrolled in ${courseName}!`
        });
        
        // Refresh users to show updated enrollment count
        const userList = await getAllUsers();
        setUsers(userList);
      } else {
        toast({
          title: "Enrollment Failed",
          description: data.message || "Failed to enroll user.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error enrolling user:', error);
      toast({
        title: "Error",
        description: "Failed to enroll user. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Manage Users</h1>
        <div className="text-sm text-muted-foreground">
          Total Users: {users.length}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>View and manage platform users, their roles, and course enrollments.</CardDescription>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No users found in the database.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="hidden w-[80px] sm:table-cell">Avatar</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="hidden md:table-cell">Role</TableHead>
                    <TableHead className="hidden md:table-cell">Courses Enrolled</TableHead>
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
                    <TableCell className="hidden md:table-cell">
                       {user.enrolledCourses?.length || 0}
                    </TableCell>
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
                        <DropdownMenuItem onClick={() => handleManualEnroll(user.email || '', user.displayName || 'Unknown User')}>
                            <BookOpen className="mr-2 h-4 w-4" />Enroll in Course
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
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
