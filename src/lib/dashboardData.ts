import { db } from './firebase';
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import type { PaymentRecord } from './mockData';

export interface DashboardStats {
  totalRevenue: number;
  revenueChange: number;
  donationRevenue: number;
  donationChange: number;
  paymentRevenue: number;
  paymentChange: number;
  activeUsers: number;
  usersChange: number;
  courseCompletions: number;
  completionsChange: number;
  totalCourses: number;
  coursesChange: number;
}

export interface RecentActivity {
  id: string;
  user: string;
  action: string;
  course: string;
  time: string;
  type: 'enrollment' | 'completion' | 'purchase' | 'start';
  avatar: string;
}

export interface TopCourse {
  name: string;
  students: number;
  rating: number;
  revenue: string;
}

export interface RevenueData {
  labels: string[];
  data: number[];
}

export interface CourseDistribution {
  labels: string[];
  data: number[];
}

// Helper function to get month name
const getMonthName = (monthIndex: number): string => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[monthIndex];
};

// Helper function to calculate percentage change
const calculatePercentageChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

// Get total revenue and change from last month
export const getRevenueStats = async (): Promise<{ total: number; change: number }> => {
  try {
    const paymentsRef = collection(db, 'payments');
    const paymentsSnapshot = await getDocs(paymentsRef);
    
    console.log(`Found ${paymentsSnapshot.docs.length} payment documents`);
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let currentMonthRevenue = 0;
    let lastMonthRevenue = 0;
    let totalRevenue = 0;
    
    paymentsSnapshot.docs.forEach(doc => {
      const data = doc.data() as PaymentRecord;
      console.log('Payment record:', data);
      
      if (data.status === 'success' && data.amount) {
        totalRevenue += data.amount;
        const paymentDate = data.paidAt ? new Date(data.paidAt) : null;
        
        if (paymentDate) {
          const paymentMonth = paymentDate.getMonth();
          const paymentYear = paymentDate.getFullYear();
          
          if (paymentYear === currentYear && paymentMonth === currentMonth) {
            currentMonthRevenue += data.amount;
          } else if (
            (paymentYear === currentYear && paymentMonth === currentMonth - 1) ||
            (currentMonth === 0 && paymentYear === currentYear - 1 && paymentMonth === 11)
          ) {
            lastMonthRevenue += data.amount;
          }
        }
      }
    });
    
    console.log(`Total revenue: ${totalRevenue}, Current month: ${currentMonthRevenue}, Last month: ${lastMonthRevenue}`);
    
    const change = calculatePercentageChange(currentMonthRevenue, lastMonthRevenue);
    return { total: totalRevenue, change }; // Return total revenue instead of just current month
  } catch (error) {
    console.error('Error fetching revenue stats:', error);
    return { total: 0, change: 0 };
  }
};

// Get donation revenue specifically
export const getDonationRevenueStats = async (): Promise<{ total: number; change: number }> => {
  try {
    const paymentsRef = collection(db, 'payments');
    const paymentsSnapshot = await getDocs(paymentsRef);
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let currentMonthRevenue = 0;
    let lastMonthRevenue = 0;
    let totalDonationRevenue = 0;
    
    paymentsSnapshot.docs.forEach(doc => {
      const data = doc.data() as PaymentRecord;
      if (data.status === 'success' && data.amount && data.pricingType === 'donation') {
        totalDonationRevenue += data.amount;
        const paymentDate = data.paidAt ? new Date(data.paidAt) : null;
        
        if (paymentDate) {
          const paymentMonth = paymentDate.getMonth();
          const paymentYear = paymentDate.getFullYear();
          
          if (paymentYear === currentYear && paymentMonth === currentMonth) {
            currentMonthRevenue += data.amount;
          } else if (
            (paymentYear === currentYear && paymentMonth === currentMonth - 1) ||
            (currentMonth === 0 && paymentYear === currentYear - 1 && paymentMonth === 11)
          ) {
            lastMonthRevenue += data.amount;
          }
        }
      }
    });
    
    console.log(`Total donation revenue: ${totalDonationRevenue}`);
    
    const change = calculatePercentageChange(currentMonthRevenue, lastMonthRevenue);
    return { total: totalDonationRevenue, change };
  } catch (error) {
    console.error('Error fetching donation revenue stats:', error);
    return { total: 0, change: 0 };
  }
};

// Get payment revenue specifically (excluding donations)
export const getPaymentRevenueStats = async (): Promise<{ total: number; change: number }> => {
  try {
    const paymentsRef = collection(db, 'payments');
    const paymentsSnapshot = await getDocs(paymentsRef);
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let currentMonthRevenue = 0;
    let lastMonthRevenue = 0;
    let totalPaymentRevenue = 0;
    
    paymentsSnapshot.docs.forEach(doc => {
      const data = doc.data() as PaymentRecord;
      if (data.status === 'success' && data.amount && data.pricingType === 'payment') {
        totalPaymentRevenue += data.amount;
        const paymentDate = data.paidAt ? new Date(data.paidAt) : null;
        
        if (paymentDate) {
          const paymentMonth = paymentDate.getMonth();
          const paymentYear = paymentDate.getFullYear();
          
          if (paymentYear === currentYear && paymentMonth === currentMonth) {
            currentMonthRevenue += data.amount;
          } else if (
            (paymentYear === currentYear && paymentMonth === currentMonth - 1) ||
            (currentMonth === 0 && paymentYear === currentYear - 1 && paymentMonth === 11)
          ) {
            lastMonthRevenue += data.amount;
          }
        }
      }
    });
    
    console.log(`Total payment revenue: ${totalPaymentRevenue}`);
    
    const change = calculatePercentageChange(currentMonthRevenue, lastMonthRevenue);
    return { total: totalPaymentRevenue, change };
  } catch (error) {
    console.error('Error fetching payment revenue stats:', error);
    return { total: 0, change: 0 };
  }
};

// Get active users count and change
export const getUserStats = async (): Promise<{ total: number; change: number }> => {
  try {
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    let currentMonthUsers = 0;
    let lastMonthUsers = 0;
    
    usersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const createdAt = data.createdAt ? new Date(data.createdAt) : null;
      
      if (createdAt) {
        const createdMonth = createdAt.getMonth();
        const createdYear = createdAt.getFullYear();
        
        if (createdYear < currentYear || (createdYear === currentYear && createdMonth <= currentMonth)) {
          currentMonthUsers++;
        }
        if (createdYear < lastMonthYear || (createdYear === lastMonthYear && createdMonth <= lastMonth)) {
          lastMonthUsers++;
        }
      }
    });
    
    const change = calculatePercentageChange(currentMonthUsers, lastMonthUsers);
    return { total: currentMonthUsers, change };
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return { total: 0, change: 0 };
  }
};

// Get course completion stats
export const getCourseCompletionStats = async (): Promise<{ total: number; change: number }> => {
  try {
    // This would require a completions collection or progress tracking
    // For now, we'll estimate based on enrolled courses with high progress
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    let totalCompletions = 0;
    
    usersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const enrolledCourses = data.enrolledCourses || [];
      // Estimate: assume 30% completion rate for enrolled courses
      totalCompletions += Math.floor(enrolledCourses.length * 0.3);
    });
    
    // For change calculation, we'll use a placeholder
    const change = 19; // This would need historical data
    return { total: totalCompletions, change };
  } catch (error) {
    console.error('Error fetching completion stats:', error);
    return { total: 0, change: 0 };
  }
};

// Get total courses count
export const getCourseStats = async (): Promise<{ total: number; change: number }> => {
  try {
    const coursesRef = collection(db, 'courses');
    const coursesSnapshot = await getDocs(coursesRef);
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let totalCourses = coursesSnapshot.size;
    let newThisMonth = 0;
    
    coursesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const createdAt = data.createdAt ? new Date(data.createdAt) : null;
      
      if (createdAt) {
        const createdMonth = createdAt.getMonth();
        const createdYear = createdAt.getFullYear();
        
        if (createdYear === currentYear && createdMonth === currentMonth) {
          newThisMonth++;
        }
      }
    });
    
    return { total: totalCourses, change: newThisMonth };
  } catch (error) {
    console.error('Error fetching course stats:', error);
    return { total: 0, change: 0 };
  }
};

// Get recent activities
export const getRecentActivities = async (): Promise<RecentActivity[]> => {
  try {
    const activities: RecentActivity[] = [];
    
    // Get recent payments
    const paymentsRef = collection(db, 'payments');
    const paymentsQuery = query(paymentsRef, orderBy('paidAt', 'desc'), limit(10));
    const paymentsSnapshot = await getDocs(paymentsQuery);
    
    for (const doc of paymentsSnapshot.docs) {
      const payment = doc.data() as PaymentRecord;
      const courseRef = collection(db, 'courses');
      const coursesSnapshot = await getDocs(courseRef);
      const course = coursesSnapshot.docs.find(c => c.id === payment.courseId);
      
      if (course) {
        const timeDiff = Date.now() - new Date(payment.paidAt).getTime();
        const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60));
        const daysAgo = Math.floor(hoursAgo / 24);
        
        const timeString = daysAgo > 0 ? `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago` : `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago`;
        
        const userEmail = payment.customerEmail || 'Unknown User';
        const userName = userEmail.split('@')[0];
        const initials = userName.substring(0, 2).toUpperCase();
        
        activities.push({
          id: doc.id,
          user: userName,
          action: 'purchased',
          course: course.data().title,
          time: timeString,
          type: 'purchase',
          avatar: initials
        });
      }
    }
    
    // Get recent enrollments
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    for (const userDoc of usersSnapshot.docs.slice(0, 5)) {
      const userData = userDoc.data();
      const enrolledCourses = userData.enrolledCourses || [];
      
      if (enrolledCourses.length > 0) {
        const courseId = enrolledCourses[enrolledCourses.length - 1];
        const coursesRef = collection(db, 'courses');
        const coursesSnapshot = await getDocs(coursesRef);
        const course = coursesSnapshot.docs.find(c => c.id === courseId);
        
        if (course) {
          const userEmail = userData.email || 'Unknown User';
          const userName = userEmail.split('@')[0];
          const initials = userName.substring(0, 2).toUpperCase();
          
          activities.push({
            id: `enroll-${userDoc.id}`,
            user: userName,
            action: 'enrolled in',
            course: course.data().title,
            time: '2 hours ago', // Would need enrollment timestamp
            type: 'enrollment',
            avatar: initials
          });
        }
      }
    }
    
    return activities.slice(0, 4);
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    return [];
  }
};

// Get top performing courses
export const getTopCourses = async (): Promise<TopCourse[]> => {
  try {
    const coursesRef = collection(db, 'courses');
    const coursesSnapshot = await getDocs(coursesRef);
    
    const courseStats = await Promise.all(
      coursesSnapshot.docs.map(async (courseDoc) => {
        const courseData = courseDoc.data();
        
        // Count students enrolled
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);
        let studentCount = 0;
        
        usersSnapshot.docs.forEach(userDoc => {
          const userData = userDoc.data();
          const enrolledCourses = userData.enrolledCourses || [];
          if (enrolledCourses.includes(courseDoc.id)) {
            studentCount++;
          }
        });
        
        // Calculate revenue
        const paymentsRef = collection(db, 'payments');
        const paymentsQuery = query(
          paymentsRef,
          where('courseId', '==', courseDoc.id),
          where('status', '==', 'success')
        );
        const paymentsSnapshot = await getDocs(paymentsQuery);
        
        let revenue = 0;
        paymentsSnapshot.docs.forEach(paymentDoc => {
          const payment = paymentDoc.data() as PaymentRecord;
          revenue += payment.amount || 0;
        });
        
        return {
          name: courseData.title,
          students: studentCount,
          rating: 4.5, // Would need a ratings collection
          revenue: `₦${revenue.toLocaleString()}`
        };
      })
    );
    
    // Sort by students and return top 4
    return courseStats
      .sort((a, b) => b.students - a.students)
      .slice(0, 4);
  } catch (error) {
    console.error('Error fetching top courses:', error);
    return [];
  }
};

// Get revenue data for chart (last 6 months)
export const getRevenueChartData = async (): Promise<RevenueData> => {
  try {
    const paymentsRef = collection(db, 'payments');
    const paymentsSnapshot = await getDocs(paymentsRef);
    
    const now = new Date();
    const monthlyRevenue: { [key: string]: number } = {};
    const labels: string[] = [];
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      const monthLabel = getMonthName(date.getMonth());
      labels.push(monthLabel);
      monthlyRevenue[monthKey] = 0;
    }
    
    // Aggregate revenue by month
    paymentsSnapshot.docs.forEach(doc => {
      const payment = doc.data() as PaymentRecord;
      if (payment.status === 'success' && payment.amount && payment.paidAt) {
        const paymentDate = new Date(payment.paidAt);
        const monthKey = `${paymentDate.getFullYear()}-${paymentDate.getMonth()}`;
        
        if (monthlyRevenue.hasOwnProperty(monthKey)) {
          monthlyRevenue[monthKey] += payment.amount;
        }
      }
    });
    
    const data = labels.map((label, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      return monthlyRevenue[monthKey] || 0;
    });
    
    return { labels, data };
  } catch (error) {
    console.error('Error fetching revenue chart data:', error);
    return { labels: [], data: [] };
  }
};

// Get course distribution by category
export const getCourseDistribution = async (): Promise<CourseDistribution> => {
  try {
    const coursesRef = collection(db, 'courses');
    const coursesSnapshot = await getDocs(coursesRef);
    
    const categoryCount: { [key: string]: number } = {};
    
    coursesSnapshot.docs.forEach(doc => {
      const course = doc.data();
      const category = course.category || 'Other';
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });
    
    const labels = Object.keys(categoryCount);
    const data = Object.values(categoryCount);
    
    return { labels, data };
  } catch (error) {
    console.error('Error fetching course distribution:', error);
    return { labels: [], data: [] };
  }
};

// Get all dashboard stats
export const getDashboardStats = async (): Promise<DashboardStats> => {
  const [revenue, donationRevenue, paymentRevenue, users, completions, courses] = await Promise.all([
    getRevenueStats(),
    getDonationRevenueStats(),
    getPaymentRevenueStats(),
    getUserStats(),
    getCourseCompletionStats(),
    getCourseStats()
  ]);
  
  return {
    totalRevenue: revenue.total,
    revenueChange: revenue.change,
    donationRevenue: donationRevenue.total,
    donationChange: donationRevenue.change,
    paymentRevenue: paymentRevenue.total,
    paymentChange: paymentRevenue.change,
    activeUsers: users.total,
    usersChange: users.change,
    courseCompletions: completions.total,
    completionsChange: completions.change,
    totalCourses: courses.total,
    coursesChange: courses.change
  };
};
