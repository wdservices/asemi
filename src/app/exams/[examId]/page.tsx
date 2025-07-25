
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Exam, Question } from '@/lib/types';
import { getExamById } from '@/lib/mockData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, ArrowRight, BookOpen, Clock, AlertTriangle, Lightbulb } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';

export default function ExamPage() {
    const params = useParams();
    const router = useRouter();
    const examId = typeof params.examId === 'string' ? params.examId : '';
    
    const [exam, setExam] = useState<Exam | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<{[key: string]: string}>({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [score, setScore] = useState(0);
    
    useEffect(() => {
        if (examId) {
            const fetchedExam = getExamById(examId);
            if(fetchedExam) {
                setExam(fetchedExam);
            } else {
                router.push('/exams');
            }
            setIsLoading(false);
        }
    }, [examId, router]);

    const currentQuestion: Question | undefined = exam?.questions[currentQuestionIndex];

    const handleAnswerSelect = (questionId: string, optionId: string) => {
        if (isSubmitted) return;
        setSelectedAnswers(prev => ({ ...prev, [questionId]: optionId }));
    };

    const handleNext = () => {
        if (exam && currentQuestionIndex < exam.questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };
    
    const handlePrevious = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    const handleSubmit = () => {
        if (!exam) return;
        let correctAnswers = 0;
        exam.questions.forEach(q => {
            if (selectedAnswers[q.id] === q.correctOptionId) {
                correctAnswers++;
            }
        });
        setScore((correctAnswers / exam.questions.length) * 100);
        setIsSubmitted(true);
    };

    if (isLoading) {
        return <div className="text-center p-6">Loading exam...</div>
    }

    if (!exam) {
        return <div className="text-center p-6">Exam not found.</div>
    }

    if (isSubmitted) {
        return (
            <Card className="max-w-3xl mx-auto shadow-xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl">Exam Results</CardTitle>
                    <CardDescription>You have completed the "{exam.title}" exam.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="text-center">
                        <p className="text-lg text-muted-foreground">Your Score:</p>
                        <p className={`text-6xl font-bold ${score >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                            {score.toFixed(0)}%
                        </p>
                    </div>
                     <Progress value={score} className="h-4" />
                     <Alert variant={score >= 50 ? "default" : "destructive"}>
                        {score >= 50 ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                        <AlertTitle>{score >= 50 ? "Congratulations!" : "Needs Improvement"}</AlertTitle>
                        <AlertDescription>
                            {score >= 50 ? "Great job! You passed the exam." : "Don't worry, practice makes perfect. Review the questions and try again."}
                        </AlertDescription>
                    </Alert>
                    <div className="flex justify-center gap-4">
                        <Button variant="outline" onClick={() => { setIsSubmitted(false); setCurrentQuestionIndex(0); setSelectedAnswers({}); }}>
                            Review Answers
                        </Button>
                        <Button asChild>
                            <Link href="/exams">Choose Another Exam</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (!currentQuestion) {
        return <div className="text-center p-6">This exam has no questions.</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <header className="text-center">
                <h1 className="text-3xl font-bold">{exam.title}</h1>
                <p className="text-muted-foreground">{exam.description}</p>
            </header>
            
            <Card className="shadow-lg">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Question {currentQuestionIndex + 1} of {exam.questions.length}</CardTitle>
                        {/* Timer placeholder */}
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" /> <span>30:00</span>
                        </div>
                    </div>
                    <Progress value={((currentQuestionIndex + 1) / exam.questions.length) * 100} className="mt-2 h-2" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <p className="text-lg font-medium leading-relaxed">{currentQuestion.text}</p>
                    
                    <RadioGroup 
                        value={selectedAnswers[currentQuestion.id] || ""}
                        onValueChange={(value) => handleAnswerSelect(currentQuestion.id, value)}
                        className="space-y-3"
                    >
                        {currentQuestion.options.map((option) => (
                            <Label 
                                key={option.id}
                                htmlFor={`q${currentQuestion.id}-o${option.id}`}
                                className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors hover:bg-muted/70 
                                    ${selectedAnswers[currentQuestion.id] === option.id ? 'bg-primary/10 border-primary' : 'border-border'}`
                                }
                            >
                                <RadioGroupItem value={option.id} id={`q${currentQuestion.id}-o${option.id}`} />
                                <span>{option.text}</span>
                            </Label>
                        ))}
                    </RadioGroup>

                    {isSubmitted && currentQuestion.explanation && (
                         <Alert variant={selectedAnswers[currentQuestion.id] === currentQuestion.correctOptionId ? "default" : "destructive"}>
                             <Lightbulb className="h-4 w-4" />
                            <AlertTitle>Explanation</AlertTitle>
                            <AlertDescription>
                                {currentQuestion.explanation}
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            <div className="flex justify-between items-center">
                <Button variant="outline" onClick={handlePrevious} disabled={currentQuestionIndex === 0}>
                    Previous
                </Button>

                {currentQuestionIndex === exam.questions.length - 1 ? (
                    <Button onClick={handleSubmit} disabled={Object.keys(selectedAnswers).length !== exam.questions.length}>
                        Submit Exam
                    </Button>
                ) : (
                    <Button onClick={handleNext}>
                        Next <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}

