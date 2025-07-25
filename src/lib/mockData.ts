
import type { Exam, UserProfile, ExamFormData } from './types';

export let mockExams: Exam[] = [
    {
        id: 'exam1',
        title: 'JAMB 2023 Chemistry',
        description: 'Past questions for the Joint Admissions and Matriculation Board (JAMB) 2023 Chemistry paper.',
        subject: 'Chemistry',
        year: 2023,
        imageUrl: 'https://placehold.co/400x250.png',
        questions: [
            {
                id: 'q1',
                text: 'Which of the following is a noble gas?',
                options: [
                    { id: 'A', text: 'Oxygen' },
                    { id: 'B', text: 'Nitrogen' },
                    { id: 'C', text: 'Argon' },
                    { id: 'D', text: 'Chlorine' },
                ],
                correctOptionId: 'C',
                explanation: 'Argon is in Group 18 of the periodic table, making it a noble gas.',
            },
            {
                id: 'q2',
                text: 'What is the chemical formula for water?',
                options: [
                    { id: 'A', text: 'CO2' },
                    { id: 'B', text: 'H2O' },
                    { id: 'C', text: 'O2' },
                    { id: 'D', text: 'NaCl' },
                ],
                correctOptionId: 'B',
                explanation: 'H2O represents two hydrogen atoms and one oxygen atom, the composition of water.',
            }
        ]
    },
    {
        id: 'exam2',
        title: 'WAEC 2022 Mathematics',
        description: 'Past questions for the West African Examinations Council (WAEC) 2022 Mathematics paper.',
        subject: 'Mathematics',
        year: 2022,
        imageUrl: 'https://placehold.co/400x250.png',
        questions: [
            {
                id: 'q1',
                text: 'If x - 4 = 8, what is the value of x?',
                options: [
                    { id: 'A', text: '4' },
                    { id: 'B', text: '12' },
                    { id: 'C', 'text': '2' },
                    { id: 'D', 'text': '-4' },
                ],
                correctOptionId: 'B',
                explanation: 'Add 4 to both sides of the equation: x - 4 + 4 = 8 + 4, which simplifies to x = 12.',
            }
        ]
    }
];

export let mockUserProfiles: UserProfile[] = [
  // This user will be automatically granted admin privileges if registered with this email.
  {
    id: 'admin_placeholder_uid', 
    email: 'spellz49@gmail.com',
    displayName: 'Admin User',
    avatarUrl: 'https://avatar.vercel.sh/admin.png',
    isAdmin: true,
    activeSubscription: true,
  },
   {
    id: 'user1_placeholder_uid', 
    email: 'testuser@example.com',
    displayName: 'Test User',
    avatarUrl: 'https://avatar.vercel.sh/testuser.png',
    isAdmin: false,
    activeSubscription: false,
  },
];

// --- Mock Data Functions ---

// Exams
export const getAllExams = (): Exam[] => mockExams;
export const getExamById = (id: string): Exam | undefined => mockExams.find(exam => exam.id === id);
export const addExam = (examData: ExamFormData): Exam => {
    const newExam: Exam = {
        id: `exam${Date.now()}`,
        ...examData,
        year: examData.year || undefined,
        imageUrl: examData.imageUrl || undefined,
        questions: examData.questions.map((q, qIndex) => ({
            id: `q${Date.now()}-${qIndex}`,
            text: q.text,
            imageUrl: q.imageUrl || undefined,
            explanation: q.explanation || undefined,
            options: q.options.map((opt, optIndex) => ({
                id: String.fromCharCode(65 + optIndex), // A, B, C, D
                text: opt.text,
            })),
            correctOptionId: String.fromCharCode(65 + q.correctOptionIndex),
        })),
    };
    mockExams.unshift(newExam); // Add to the beginning of the array
    console.log("Mock Exam Added:", newExam);
    return newExam;
}
export const deleteExam = (examId: string): boolean => {
     const initialLength = mockExams.length;
     mockExams = mockExams.filter(e => e.id !== examId);
     const success = mockExams.length < initialLength;
     if (success) console.log("Mock Exam Deleted:", examId);
     return success;
}


// Users
export const getUserProfile = (id: string): UserProfile | undefined => {
    return mockUserProfiles.find(user => user.id === id);
};

export const updateUserProfile = (id: string, data: Partial<UserProfile>): UserProfile | undefined => {
    let userIndex = mockUserProfiles.findIndex(u => u.id === id);

    if (userIndex !== -1) {
        // Update existing user
        mockUserProfiles[userIndex] = { ...mockUserProfiles[userIndex], ...data, id };
        console.log(`Mock User Updated: ${id}`, mockUserProfiles[userIndex]);
        return mockUserProfiles[userIndex];
    } else {
        // Create new user profile
        const newUser: UserProfile = {
            id: id,
            email: data.email || null,
            displayName: data.displayName || null,
            avatarUrl: data.avatarUrl || null,
            isAdmin: data.email === 'spellz49@gmail.com', // Grant admin if email matches
            activeSubscription: false, // Default value
            ...data
        };
        mockUserProfiles.push(newUser);
        console.log(`Mock User Created: ${id}`, newUser);
        return newUser;
    }
};
