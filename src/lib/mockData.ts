import type { Course, UserProfile, Enrollment, Instructor, CourseModule, Lesson } from './types';

export const mockInstructors: Instructor[] = [
  { id: 'inst1', name: 'Alice Wonderland', bio: 'Expert in Web Development with 10 years of experience.', avatarUrl: 'https://picsum.photos/seed/alice/100/100', title: 'Senior Web Developer' },
  { id: 'inst2', name: 'Bob The Builder', bio: 'Passionate about UI/UX design and teaching.', avatarUrl: 'https://picsum.photos/seed/bob/100/100', title: 'Lead UX Designer' },
  { id: 'inst3', name: 'Charlie Brown', bio: 'Data Science enthusiast and practitioner.', avatarUrl: 'https://picsum.photos/seed/charlie/100/100', title: 'Data Scientist' },
];

export const mockCourses: Course[] = [
  {
    id: 'course1',
    slug: 'nextjs-masterclass',
    title: 'Next.js 14 Masterclass',
    description: 'Learn Next.js from scratch and build production-ready apps.',
    longDescription: 'This comprehensive course covers everything you need to know about Next.js 14, from fundamentals like routing and data fetching to advanced topics such as server components, server actions, and deployment strategies. Build multiple projects and gain hands-on experience.',
    thumbnailUrl: 'https://picsum.photos/seed/nextjs/600/400',
    price: 49.99,
    rating: 4.8,
    numberOfRatings: 1200,
    category: 'Web Development',
    instructor: mockInstructors[0],
    previewVideoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Placeholder
    totalLessons: 50,
    duration: "20h 15m",
    level: 'Intermediate',
    tags: ['Next.js', 'React', 'JavaScript', 'Web Development'],
    modules: [
      { 
        id: 'm1c1', title: 'Introduction to Next.js', moduleOrder: 1,
        lessons: [
          { id: 'l1m1c1', title: 'What is Next.js?', contentType: 'video', content: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: '10m', isPreviewable: true, lessonOrder: 1 },
          { id: 'l2m1c1', title: 'Setting up your environment', contentType: 'video', content: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: '12m', lessonOrder: 2 },
        ]
      },
      { 
        id: 'm2c1', title: 'Routing and Pages', moduleOrder: 2,
        lessons: [
          { id: 'l1m2c1', title: 'File-based Routing', contentType: 'video', content: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: '15m', lessonOrder: 1 },
          { id: 'l2m2c1', title: 'Dynamic Routes', contentType: 'pdf', content: '/sample.pdf', downloadableResources: [{id: 'dr1', name: 'Routing Cheatsheet.pdf', url:'/sample.pdf', fileType: 'PDF'}], duration: '20m', lessonOrder: 2 },
        ]
      },
    ]
  },
  {
    id: 'course2',
    slug: 'tailwind-css-deep-dive',
    title: 'Tailwind CSS: From Zero to Hero',
    description: 'Master Tailwind CSS and build beautiful, responsive UIs.',
    longDescription: 'Dive deep into Tailwind CSS and learn how to rapidly build modern websites without ever leaving your HTML. This course covers utility-first fundamentals, responsive design, customizing Tailwind, and advanced techniques.',
    thumbnailUrl: 'https://picsum.photos/seed/tailwind/600/400',
    price: 29.99,
    rating: 4.9,
    numberOfRatings: 950,
    category: 'Web Design',
    instructor: mockInstructors[1],
    previewVideoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    totalLessons: 35,
    duration: "12h 45m",
    level: 'Beginner',
    tags: ['Tailwind CSS', 'CSS', 'Frontend', 'UI Design'],
    modules: [
      { 
        id: 'm1c2', title: 'Getting Started with Tailwind', moduleOrder: 1,
        lessons: [
          { id: 'l1m1c2', title: 'Utility-First Concepts', contentType: 'video', content: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: '8m', isPreviewable: true, lessonOrder: 1 },
        ]
      },
    ]
  },
  {
    id: 'course3',
    slug: 'python-data-science',
    title: 'Python for Data Science Bootcamp',
    description: 'Unlock the power of Python for data analysis and visualization.',
    longDescription: 'This bootcamp will take you from Python basics to advanced data science techniques using libraries like NumPy, Pandas, Matplotlib, and Scikit-learn. Work on real-world datasets and build a portfolio of projects.',
    thumbnailUrl: 'https://picsum.photos/seed/python/600/400',
    price: 79.99,
    rating: 4.7,
    numberOfRatings: 2500,
    category: 'Data Science',
    instructor: mockInstructors[2],
    previewVideoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    totalLessons: 70,
    duration: "30h 00m",
    level: 'All Levels',
    tags: ['Python', 'Data Science', 'Machine Learning', 'NumPy', 'Pandas'],
    modules: [
      { 
        id: 'm1c3', title: 'Python Fundamentals', moduleOrder: 1,
        lessons: [
          { id: 'l1m1c3', title: 'Variables and Data Types', contentType: 'video', content: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: '10m', isPreviewable: true, lessonOrder: 1 },
        ]
      },
    ]
  },
];

export const mockUsers: UserProfile[] = [
  {
    id: 'user1',
    email: 'user@example.com',
    displayName: 'John Doe',
    avatarUrl: 'https://picsum.photos/seed/user1/100/100',
    enrolledCourseIds: ['course1'],
    isAdmin: false,
  },
  {
    id: 'admin1',
    email: 'admin@example.com',
    displayName: 'Admin User',
    avatarUrl: 'https://picsum.photos/seed/admin1/100/100',
    enrolledCourseIds: ['course1', 'course2'],
    isAdmin: true,
  },
];

export const mockEnrollments: Enrollment[] = [
  {
    id: 'enroll1',
    userId: 'user1',
    courseId: 'course1',
    enrolledAt: new Date('2023-01-15'),
    progress: 60,
    completedLessons: ['l1m1c1', 'l2m1c1', 'l1m2c1']
  },
  {
    id: 'enroll2',
    userId: 'admin1',
    courseId: 'course1',
    enrolledAt: new Date('2023-02-01'),
    progress: 10,
    completedLessons: ['l1m1c1']
  },
  {
    id: 'enroll3',
    userId: 'admin1',
    courseId: 'course2',
    enrolledAt: new Date('2023-02-05'),
    progress: 0,
    completedLessons: []
  },
];

export const getCourseBySlug = (slug: string): Course | undefined => mockCourses.find(course => course.slug === slug);
export const getCourseById = (id: string): Course | undefined => mockCourses.find(course => course.id === id);
export const getUserById = (id: string): UserProfile | undefined => mockUsers.find(user => user.id === id);
export const getEnrollmentsByUserId = (userId: string): Enrollment[] => mockEnrollments.filter(enrollment => enrollment.userId === userId);